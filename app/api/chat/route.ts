// Streaming chat API — agenticOS
// MiniMax M2 with chain-of-thought + tool calling

import { createMinimax } from "vercel-minimax-ai-provider";
import { generateText, tool, zodSchema, isStepCount } from "ai";
import type { ModelMessage } from "ai";
import { z } from "zod";

// ──────────────────────────────────────────────
// Built-in Tools
// ──────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tools = {
  search: tool({
    description: "Search the web for current information.",
    parameters: zodSchema(z.object({ query: z.string().describe("The search query") })),
    // @ts-ignore Zod 4 + AI SDK v7 generic inference
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
    // @ts-ignore Zod 4 + AI SDK v7 generic inference
    execute: async () => ({
      date: new Date().toISOString(),
      weekday: new Date().toLocaleDateString("en-US", { weekday: "long" }),
    }),
  }),

  calculate: tool({
    description: "Perform a mathematical calculation.",
    parameters: zodSchema(z.object({ expression: z.string().describe("Mathematical expression") })),
    // @ts-ignore Zod 4 + AI SDK v7 generic inference
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
    // @ts-ignore Zod 4 + AI SDK v7 generic inference
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
} as any;

// ──────────────────────────────────────────────
// API Route
// ──────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages: Array<{ role: string; content: string }> = body.messages;
    const model = body.model || "MiniMax-M2";

    if (!Array.isArray(messages)) {
      return new Response("Invalid messages", { status: 400 });
    }

    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "MINIMAX_API_KEY is not configured." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const minimax = createMinimax({ apiKey });

    const result = await generateText({
      model: minimax(model),
      system:
        "You are agenticOS — a helpful, precise AI agent. You have access to tools. Use them when needed. Think step by step and be concise.",
      messages: messages.map((m) => ({ role: m.role, content: m.content })) as ModelMessage[],
      tools,
      stopWhen: isStepCount(8),
    });

    // Extract tool calls from result
    const toolCalls = (result.toolCalls ?? []).map((tc) => ({
      name: tc.toolName,
      args: tc.input as Record<string, unknown>,
    }));

    // Extract reasoning steps from text
    const reasoningMatch = result.text.match(/<reasoning>([\s\S]*?)<\/reasoning>/i);
    const reasoningSteps = reasoningMatch
      ? reasoningMatch[1]
          .split(/\n+/)
          .filter(Boolean)
          .slice(0, 10)
          .map((s: string) => ({ title: s.trim().slice(0, 120), status: "complete" as const }))
      : [];

    // Clean the text
    const cleanText = result.text
      .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
      .trim();

    return Response.json({
      text: cleanText,
      reasoningSteps,
      toolCalls,
      usage: result.usage
        ? {
            input: result.usage.inputTokens,
            output: result.usage.outputTokens,
            total: result.usage.totalTokens,
          }
        : null,
      finishReason: result.finishReason,
    });
  } catch (err) {
    console.error("[chat] Error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
