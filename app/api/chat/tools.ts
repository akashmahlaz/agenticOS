// Chat API — Tool definitions
// Extracted from route.ts to keep files small and focused.

import { tool, zodSchema, type Tool } from "ai";
import { z } from "zod";
import { subAgentTools } from "@/lib/agents/orchestrator";
import { searchWeb } from "@/lib/browser/playwright";
import { businessTools } from "./business-tools";

// ─── Quick utility tools (always available to the main agent) ─────────

export const getDateTool: Tool = tool({
  description: "Get the current date and time.",
  inputSchema: zodSchema(z.object({})),
  execute: async () => ({
    date: new Date().toISOString(),
    weekday: new Date().toLocaleDateString("en-US", { weekday: "long" }),
  }),
});

export const calculateTool: Tool = tool({
  description: "Perform a mathematical calculation.",
  inputSchema: zodSchema(
    z.object({ expression: z.string().describe("Math expression") })
  ),
  execute: async (input: { expression: string }) => {
    try {
      const safe = input.expression.replace(/[^0-9+\-*/().%\s]/g, "");
      // eslint-disable-next-line no-new-func
      const result = new Function(`return ${safe}`)();
      return {
        expression: input.expression,
        result: Number.isFinite(result) ? result : "Invalid",
      };
    } catch {
      return {
        expression: input.expression,
        result: "Error evaluating expression",
      };
    }
  },
});

export const fetchUrlTool: Tool = tool({
  description: "Fetch and extract the main content of a URL.",
  inputSchema: zodSchema(
    z.object({ url: z.string().describe("The URL to fetch") })
  ),
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
        title: text.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "No title",
        length: text.length,
        snippet: clean.slice(0, 500),
      };
    } catch (err) {
      return { error: String(err) };
    }
  },
});

/**
 * Web search — direct tool available to the main agent.
 *
 * Uses the multi-backend search pipeline (MiniMax → Brave → Serper → DDG)
 * so search works out-of-the-box using the existing MINIMAX_API_KEY.
 * No extra API key needed.
 */
export const webSearchTool: Tool = tool({
  description:
    "Search the web for current information. Uses MiniMax's built-in web_search API first (no extra key needed), then falls back to Brave/Serper/DuckDuckGo. Returns titles, URLs, and snippets for the top results. Use this for: 'latest news on X', 'what's the weather in Y', 'who is the CEO of Z', 'recent papers on Q', etc.",
  inputSchema: zodSchema(
    z.object({
      query: z.string().describe("The search query (1-200 chars)"),
      numResults: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .describe("How many results to return (1-10, default 5)"),
    })
  ),
  execute: async (input: { query: string; numResults?: number }) => {
    const result = await searchWeb(input.query, input.numResults ?? 5);
    if (result.error) {
      return { error: result.error, source: result.source, results: [] };
    }
    return {
      source: result.source,
      resultCount: result.results.length,
      results: result.results,
    };
  },
});

// ─── Sub-agent tools (delegate to specialized agents) ─────────────────
// The MAIN agent calls these; each invocation runs a separate sub-agent
// with its own focused system prompt and tool set.
export const subAgentToolMap: Record<string, Tool> = subAgentTools as Record<string, Tool>;

export const allTools: Record<string, Tool> = {
  getDate: getDateTool,
  calculate: calculateTool,
  fetchUrl: fetchUrlTool,
  webSearch: webSearchTool,
  ...businessTools,
  ...subAgentToolMap,
};
