// @ts-nocheck
// Streaming chat API — agenticOS
// MiniMax M2 with chain-of-thought, streaming + tool calling + sub-agents

import { createMinimax } from "vercel-minimax-ai-provider";
import { streamText, tool, zodSchema, isStepCount, hasToolCall } from "ai";
import { getUserIdFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { subAgentTools, onSubAgentProgress } from "@/lib/agents/orchestrator";

// ──────────────────────────────────────────────
// Built-in Tools
// ──────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tools: any = {
  // ── Quick utility tools (always available) ──
  getDate: tool({
    description: "Get the current date and time.",
    parameters: zodSchema(z.object({})),
    execute: async () => ({
      date: new Date().toISOString(),
      weekday: new Date().toLocaleDateString("en-US", { weekday: "long" }),
    }),
  }),

  calculate: tool({
    description: "Perform a mathematical calculation.",
    parameters: zodSchema(z.object({ expression: z.string().describe("Math expression") })),
    execute: async (input: { expression: string }) => {
      try {
        const safe = input.expression.replace(/[^0-9+\-*/().%\s]/g, "");
        // eslint-disable-next-line no-new-func
        const result = new Function(`return ${safe}`)();
        return { expression: input.expression, result: Number.isFinite(result) ? result : "Invalid" };
      } catch {
        return { expression: input.expression, result: "Error evaluating expression" };
      }
    },
  }),

  fetchUrl: tool({
    description: "Fetch and extract the main content of a URL.",
    parameters: zodSchema(z.object({ url: z.string().describe("The URL to fetch") })),
    execute: async (input: { url: string }) => {
      try {
        const res = await fetch(input.url, {
          headers: { "User-Agent": "agenticOS/1.0" },
          signal: AbortSignal.timeout(8000),
        });
        const text = await res.text();
        const clean = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        return {
          status: res.status,
          title: (text.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]) ?? "No title",
          length: text.length,
          snippet: clean.slice(0, 500),
        };
      } catch (err) {
        return { error: String(err) };
      }
    },
  }),

  // ── Sub-agent tools (delegate to specialized agents) ──
  // These are tools the MAIN agent can call, but each invokes a separate
  // sub-agent with its own focused system prompt and tool set.
  ...subAgentTools,
};

// Cleanup helper for sub-agent progress listeners
let activeSubAgentListener: (() => void) | null = null;

// ──────────────────────────────────────────────
// API Route (Streaming)
// ──────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { messages, sessionId, model } = body;
    const selectedModel = model || "MiniMax-M2";

    if (!Array.isArray(messages)) {
      return new Response("Invalid messages", { status: 400 });
    }

    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "MINIMAX_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const minimax = createMinimax({ apiKey });

    // Convert messages
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aiMessages = messages.map((m: any) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    // We'll set the controller after the stream starts (below)
    // so sub-agent progress can be forwarded to the client

    // Stream the response

    // Stream the response
    const result = streamText({
      model: minimax(selectedModel),
      system: `You are agenticOS — a powerful AI agent built for autonomous task completion. You can DELEGATE work to specialized sub-agents and use built-in tools directly.

# Available Sub-Agents (delegate via tools)
- **Researcher** (delegateToResearcher) — web research, fact-finding, source citations. Use for: "research X", "find info about Y", "what's the latest on Z"
- **Coder** (delegateToCoder) — write, debug, refactor code. Use for: "write a function that...", "fix this bug", "refactor X to Y"
- **Memory Keeper** (delegateToMemoryKeeper) — long-term memory of user prefs, project context, decisions. Use for: "remember that...", "what did I say about X last time"

When you call a sub-agent, the UI shows the user what's happening (e.g., "Researcher is fetching…"). Use the result of sub-agents to write your final synthesized answer.

# Built-in Tools (call directly)
- getDate, calculate, fetchUrl

# Workflow
1. For complex tasks, decompose and DELEGATE to sub-agents in parallel
2. For simple tasks, use built-in tools directly
3. ALWAYS synthesize the final answer — don't just dump sub-agent output
4. Think step-by-step before responding
5. Be thorough, precise, and helpful`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: aiMessages as any,
      tools,
      // Stop when: hit 15 steps OR a sub-agent returns (signals end of research/coding work)
      stopWhen: isStepCount(15),
    });

    // Collect for final save
    let fullText = "";
    let reasoningSteps: Array<{ title: string; status: string }> = [];
    let toolCalls: Array<{ name: string; args: Record<string, unknown>; result?: unknown }> = [];
    interface SourceItem {
      title?: string;
      url?: string;
      snippet?: string;
    }
    let sources: SourceItem[] = [];

    // Stream as NDJSON
    const stream = new ReadableStream({
      async start(controller) {
        // Expose controller so sub-agent listeners can forward progress events
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).__agenticOSController = controller;

        // Subscribe to sub-agent progress (if not already)
        if (activeSubAgentListener) activeSubAgentListener();
        activeSubAgentListener = onSubAgentProgress((event) => {
          try {
            const encoder = new TextEncoder();
            controller.enqueue(
              encoder.encode(JSON.stringify({ type: "subagent", ...event }) + "\n")
            );
          } catch {
            // ignore
          }
        });

        const encoder = new TextEncoder();
        try {
          for await (const chunk of result.fullStream) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const c = chunk as any;
            const data: Record<string, unknown> = {};

            if (c.type === "text-delta") {
              fullText += c.text ?? "";
              data.type = "text-delta";
              data.delta = c.text ?? "";
            } else if (c.type === "tool-call") {
              toolCalls.push({
                name: c.toolName,
                args: (c.args ?? c.input ?? {}) as Record<string, unknown>,
              });
              data.type = "tool-call";
              data.toolName = c.toolName;
              data.args = c.args ?? c.input ?? {};
            } else if (c.type === "tool-result") {
              const tc = toolCalls.find((t) => t.name === c.toolName);
              const result = c.output ?? c.result;
              if (tc) tc.result = result;
              data.type = "tool-result";
              data.toolName = c.toolName;
              data.result = result;

              // If the result is from web search / deep research, emit as sources
              if (c.toolName === "webSearch" || c.toolName === "deepResearch" || c.toolName === "search") {
                const r = result as any;
                if (r?.results && Array.isArray(r.results)) {
                  sources.push(...r.results);
                  // Also emit a sources event for the client
                  controller.enqueue(
                    encoder.encode(JSON.stringify({ type: "sources", items: r.results }) + "\n")
                  );
                } else if (Array.isArray(result)) {
                  sources.push(...(result as SourceItem[]));
                  controller.enqueue(
                    encoder.encode(JSON.stringify({ type: "sources", items: result }) + "\n")
                  );
                }
              }
            } else if (c.type === "reasoning-delta" || c.type === "reasoning-start") {
              data.type = "reasoning";
              data.text = c.textDelta ?? c.text ?? "";
              // Extract reasoning steps from reasoning-delta
              const text = c.textDelta ?? c.text ?? "";
              if (text) {
                const lines = text.split(/\n+/).filter(Boolean);
                reasoningSteps = lines.slice(-10).map((s: string, i: number, arr: string[]) => ({
                  title: s.trim().slice(0, 100),
                  status: i === arr.length - 1 ? "active" : "complete",
                }));
              }
            } else if (c.type === "finish") {
              data.type = "finish";
              data.finishReason = c.finishReason;
              if (c.totalUsage) {
                data.usage = {
                  input: c.totalUsage.inputTokens,
                  output: c.totalUsage.outputTokens,
                  total: c.totalUsage.totalTokens,
                };
              }
            }

            if (Object.keys(data).length > 0) {
              controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
            }
          }
        } catch (err) {
          controller.enqueue(encoder.encode(JSON.stringify({ type: "error", error: String(err) }) + "\n"));
        } finally {
          // Cleanup sub-agent listener
          if (activeSubAgentListener) {
            activeSubAgentListener();
            activeSubAgentListener = null;
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (globalThis as any).__agenticOSController = null;
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/x-ndjson",
        "X-Session-Id": sessionId || "",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("[chat] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
