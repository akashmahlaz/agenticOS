// Researcher sub-agent — focused on web research, fact-finding, and summarization
// Has access to: web search, URL fetch, deep research tools
// Returns a synthesized answer with source citations

import { createMinimax } from "vercel-minimax-ai-provider";
import { generateText, tool, zodSchema, stepCountIs } from "ai";
import { z } from "zod";
import type { SubAgentCallOptions, SubAgentResult } from "./types";

const minimax = (apiKey: string) => createMinimax({ apiKey });

const RESEARCHER_SYSTEM = `You are the Researcher sub-agent inside agenticOS.

Your ONLY job is to research a topic thoroughly and return a focused, well-sourced answer. You are NOT the main agent — you don't chat with the user. You receive a research task, gather information, then return a synthesized result.

Workflow:
1. **Search the web** for the topic using \`webSearch\` — get 3-5 diverse sources.
2. **Fetch the most relevant URLs** in parallel using \`fetchUrl\` — extract key facts.
3. **Optionally do a deep dive** with \`deepResearch\` if the topic is complex.
4. **Synthesize** everything into a clear, concise answer with inline source citations.

Output rules:
- Lead with the most important finding.
- Use bullet points or numbered lists when listing facts.
- Always cite the source URL for each non-trivial claim using [text](url) format.
- Keep your final answer under 800 words — be focused, not exhaustive.
- If sources disagree, note the disagreement.
- If you can't find good info, say so honestly.

Return ONLY your research summary. Do not include meta-commentary like "I'll now research…" — just the result.`;

export async function runResearcher(
  opts: SubAgentCallOptions
): Promise<SubAgentResult> {
  const start = Date.now();
  const apiKey = process.env.MINIMAX_API_KEY;

  if (!apiKey) {
    return {
      agent: "researcher",
      task: opts.task,
      output: "",
      success: false,
      error: "MINIMAX_API_KEY not configured",
      durationMs: 0,
    };
  }

  opts.onProgress?.({ type: "started", message: `Researching: ${opts.task}` });

  try {
    const result = await generateText({
      model: minimax(apiKey)(opts.model || "MiniMax-M2"),
      system: RESEARCHER_SYSTEM,
      prompt: opts.context
        ? `Task: ${opts.task}\n\nAdditional context: ${opts.context}`
        : `Task: ${opts.task}`,
      stopWhen: stepCountIs(15), // Allow up to 15 tool-call steps
      tools: {
        webSearch: tool({
          description: "Search the web for multiple results on a topic.",
          inputSchema: zodSchema(
            z.object({
              query: z.string().describe("The search query"),
              numResults: z.number().optional().describe("Number of results (default 5)"),
            })
          ),
          execute: async ({ query, numResults = 5 }) => {
            opts.onProgress?.({
              type: "tool-call",
              message: `Searching: ${query}`,
              toolName: "webSearch",
            });
            // Stub: would integrate with a real search API
            const results = Array.from({ length: numResults }, (_, i) => ({
              title: `Result ${i + 1} for "${query}"`,
              url: `https://www.google.com/search?q=${encodeURIComponent(query)}&start=${i * 10}`,
              snippet: `Live search result for "${query}". Configure search API for full content.`,
            }));
            opts.onProgress?.({
              type: "tool-result",
              message: `Found ${results.length} results`,
              toolName: "webSearch",
            });
            return { query, results };
          },
        }),

        fetchUrl: tool({
          description: "Fetch a URL and extract its main content.",
          inputSchema: zodSchema(
            z.object({ url: z.string().describe("The URL to fetch") })
          ),
          execute: async ({ url }) => {
            opts.onProgress?.({
              type: "tool-call",
              message: `Fetching: ${url}`,
              toolName: "fetchUrl",
            });
            try {
              const res = await fetch(url, {
                headers: { "User-Agent": "agenticOS/1.0" },
                signal: AbortSignal.timeout(8000),
              });
              const text = await res.text();
              const title = text.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? url;
              // Strip HTML tags for a cleaner snippet
              const clean = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
              const snippet = clean.slice(0, 500);
              opts.onProgress?.({
                type: "tool-result",
                message: `Fetched ${text.length} chars from ${title}`,
                toolName: "fetchUrl",
              });
              return { url, status: res.status, title, snippet };
            } catch (err) {
              opts.onProgress?.({
                type: "tool-result",
                message: `Failed to fetch ${url}`,
                toolName: "fetchUrl",
              });
              return { url, error: String(err) };
            }
          },
        }),

        deepResearch: tool({
          description: "Run a focused deep-research pass on multiple URLs at once.",
          inputSchema: zodSchema(
            z.object({
              topic: z.string().describe("The research topic"),
              urls: z.array(z.string()).describe("URLs to fetch in parallel"),
            })
          ),
          execute: async ({ topic, urls }) => {
            opts.onProgress?.({
              type: "tool-call",
              message: `Deep research: ${topic} (${urls.length} URLs)`,
              toolName: "deepResearch",
            });
            const results = await Promise.allSettled(
              urls.slice(0, 5).map(async (url) => {
                try {
                  const res = await fetch(url, {
                    headers: { "User-Agent": "agenticOS/1.0" },
                    signal: AbortSignal.timeout(8000),
                  });
                  const text = await res.text();
                  return {
                    url,
                    status: res.status,
                    title: text.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? url,
                    snippet: text.replace(/<[^>]+>/g, " ").slice(0, 300),
                  };
                } catch {
                  return { url, error: "fetch failed" };
                }
              })
            );
            opts.onProgress?.({
              type: "tool-result",
              message: `Deep research done`,
              toolName: "deepResearch",
            });
            return {
              topic,
              results: results.map((r) =>
                r.status === "fulfilled" ? r.value : { error: String((r as any).reason) }
              ),
            };
          },
        }),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const output = result.text || "No research output produced.";
    opts.onProgress?.({ type: "done", message: "Research complete" });

    return {
      agent: "researcher",
      task: opts.task,
      output,
      durationMs: Date.now() - start,
      success: true,
    };
  } catch (err) {
    return {
      agent: "researcher",
      task: opts.task,
      output: "",
      success: false,
      error: String(err),
      durationMs: Date.now() - start,
    };
  }
}
