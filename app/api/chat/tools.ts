// Chat API — Tool definitions
// Extracted from route.ts to keep files small and focused.

import { tool, zodSchema, type Tool } from "ai";
import { z } from "zod";
import { subAgentTools } from "@/lib/agents/orchestrator";

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

// ─── Sub-agent tools (delegate to specialized agents) ─────────────────
// The MAIN agent calls these; each invocation runs a separate sub-agent
// with its own focused system prompt and tool set.
export const subAgentToolMap: Record<string, Tool> = subAgentTools as Record<string, Tool>;

export const allTools: Record<string, Tool> = {
  getDate: getDateTool,
  calculate: calculateTool,
  fetchUrl: fetchUrlTool,
  ...subAgentToolMap,
};
