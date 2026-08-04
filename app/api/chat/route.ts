// Streaming chat API — agenticOS
// MiniMax M2 with chain-of-thought, streaming + tool calling

import { createMinimax } from "vercel-minimax-ai-provider";
import { streamText, tool, zodSchema, isStepCount } from "ai";
import { getUserIdFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// ──────────────────────────────────────────────
// Built-in Tools
// ──────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tools = {
  search: tool({
    description: "Search the web for current information.",
    parameters: zodSchema(z.object({ query: z.string().describe("The search query") })),
    // @ts-ignore
    execute: async (input: { query: string }) => ({
      results: [
        {
          title: `Search: ${input.query}`,
          url: `https://www.google.com/search?q=${encodeURIComponent(input.query)}`,
          snippet: `Configure your search API for live results.`,
        },
      ],
    }),
  }),

  getDate: tool({
    description: "Get the current date and time.",
    parameters: zodSchema(z.object({})),
    // @ts-ignore
    execute: async () => ({
      date: new Date().toISOString(),
      weekday: new Date().toLocaleDateString("en-US", { weekday: "long" }),
    }),
  }),

  calculate: tool({
    description: "Perform a mathematical calculation.",
    parameters: zodSchema(z.object({ expression: z.string().describe("Math expression") })),
    // @ts-ignore
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
    description: "Fetch and summarize the content of a URL.",
    parameters: zodSchema(z.object({ url: z.string().describe("The URL to fetch") })),
    // @ts-ignore
    execute: async (input: { url: string }) => {
      try {
        const res = await fetch(input.url, {
          headers: { "User-Agent": "agenticOS/1.0" },
          signal: AbortSignal.timeout(5000),
        });
        const text = await res.text();
        return {
          status: res.status,
          title: (text.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]) ?? "No title",
          length: text.length,
          snippet: text.slice(0, 400),
        };
      } catch (err) {
        return { error: String(err) };
      }
    },
  }),

  // Deep research — browse multiple URLs
  deepResearch: tool({
    description: "Research a topic by fetching multiple relevant URLs in parallel.",
    parameters: zodSchema(z.object({
      topic: z.string().describe("The research topic"),
      urls: z.array(z.string()).describe("URLs to fetch"),
    })),
    // @ts-ignore
    execute: async (input: { topic: string; urls: string[] }) => {
      const results = await Promise.allSettled(
        input.urls.slice(0, 5).map(async (url) => {
          try {
            const res = await fetch(url, {
              headers: { "User-Agent": "agenticOS/1.0" },
              signal: AbortSignal.timeout(5000),
            });
            const text = await res.text();
            return {
              url,
              status: res.status,
              title: (text.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]) ?? url,
              snippet: text.slice(0, 200),
            };
          } catch {
            return { url, error: "Failed to fetch" };
          }
        })
      );
      return { topic: input.topic, results: results.map((r) => r.status === "fulfilled" ? r.value : { error: String(r.reason) }) };
    },
  }),

  // Web search with multiple results
  webSearch: tool({
    description: "Search the web for multiple results on a topic.",
    parameters: zodSchema(z.object({
      query: z.string().describe("The search query"),
      numResults: z.number().optional().describe("Number of results (default 5)"),
    })),
    // @ts-ignore
    execute: async (input: { query: string; numResults?: number }) => ({
      query: input.query,
      results: Array.from({ length: input.numResults ?? 3 }, (_, i) => ({
        title: `Result ${i + 1} for: ${input.query}`,
        url: `https://www.google.com/search?q=${encodeURIComponent(input.query)}&start=${i * 10}`,
        snippet: `Configure your search API to get live results for "${input.query}".`,
      })),
    }),
  }),
} as any;

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

    // Stream the response
    const result = streamText({
      model: minimax(selectedModel),
      system: `You are agenticOS — a powerful AI agent built for autonomous task completion. You have access to tools for web search, calculations, date/time, URL fetching, and deep research.

When given a task:
1. Break it down into logical steps
2. Use your tools strategically to gather information and take actions
3. Think step by step before responding
4. Be thorough, precise, and helpful`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: aiMessages as any,
      tools,
      stopWhen: isStepCount(12),
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
