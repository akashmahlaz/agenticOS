// @ts-nocheck
// Browser sub-agent — focused on web browsing, searching, and content extraction
// Uses lib/browser/playwright.ts (fetch + cheerio default, can swap to real browser)
// Tools: search_web, browse_website, extract_links

import { createMinimax } from "vercel-minimax-ai-provider";
import { generateText, tool, zodSchema } from "ai";
import { z } from "zod";
import type { SubAgentCallOptions, SubAgentResult } from "./types";
import { browseWebsite, searchWeb } from "@/lib/browser/playwright";

const minimax = (apiKey: string) => createMinimax({ apiKey });

const BROWSER_SYSTEM = `You are the Browser sub-agent inside agenticOS.

Your ONLY job is to fetch, search, and extract content from the web. You are NOT the main agent. You receive a browsing task, gather the information, then return a concise result.

Tools you have:
- \`search_web(query, numResults)\` — DuckDuckGo search (no API key needed)
- \`browse_website(url, selector?)\` — fetch a URL and extract clean text + links
- \`extract_links(url)\` — get all links from a page (for finding related content)

Workflow:
1. **Start with a search** if you don't have a specific URL.
2. **Browse the most relevant results** to get details.
3. **Extract links** if you need to follow a chain of pages.
4. **Synthesize** everything into a focused answer.

Output rules:
- Lead with the most important finding.
- Always cite the source URL for non-trivial claims.
- If a page failed to load, say so and try another source.
- Be focused — return what the user asked for, not everything you found.
- Keep your final answer under 600 words.

Return ONLY your browsed answer. Do not include meta-commentary.`;

export async function runBrowser(
  opts: SubAgentCallOptions
): Promise<SubAgentResult> {
  const start = Date.now();
  const apiKey = process.env.MINIMAX_API_KEY;

  if (!apiKey) {
    return {
      agent: "researcher", // treat as researcher-type
      task: opts.task,
      output: "",
      success: false,
      error: "MINIMAX_API_KEY not configured",
      durationMs: 0,
    };
  }

  opts.onProgress?.({ type: "started", message: `Browser task: ${opts.task}` });

  try {
    const result = await generateText({
      model: minimax(apiKey)(opts.model || "MiniMax-M2"),
      system: BROWSER_SYSTEM,
      prompt: opts.context
        ? `Task: ${opts.task}\n\nContext: ${opts.context}`
        : `Task: ${opts.task}`,
      tools: {
        search_web: tool({
          description: "Search the web using DuckDuckGo (no API key needed).",
          parameters: zodSchema(
            z.object({
              query: z.string().describe("The search query"),
              numResults: z
                .number()
                .optional()
                .describe("Number of results to return (default 5)"),
            })
          ),
          execute: async ({ query, numResults = 5 }) => {
            opts.onProgress?.({
              type: "tool-call",
              message: `Searching: ${query}`,
              toolName: "search_web",
            });
            const search = await searchWeb(query, numResults);
            opts.onProgress?.({
              type: "tool-result",
              message: `Found ${search.results.length} results`,
              toolName: "search_web",
            });
            return search;
          },
        }),

        browse_website: tool({
          description: "Fetch a URL and extract its main content (text + links).",
          parameters: zodSchema(
            z.object({
              url: z.string().describe("The URL to browse"),
              maxChars: z
                .number()
                .optional()
                .describe("Max content length (default 8000)"),
            })
          ),
          execute: async ({ url, maxChars = 8000 }) => {
            opts.onProgress?.({
              type: "tool-call",
              message: `Browsing: ${url}`,
              toolName: "browse_website",
            });
            try {
              const result = await browseWebsite({ url, maxChars });
              opts.onProgress?.({
                type: "tool-result",
                message: `Extracted ${result.content.length} chars from ${result.title}`,
                toolName: "browse_website",
              });
              return result;
            } catch (err) {
              opts.onProgress?.({
                type: "tool-result",
                message: `Failed: ${err}`,
                toolName: "browse_website",
              });
              return { error: String(err), url };
            }
          },
        }),

        extract_links: tool({
          description: "Extract all links from a webpage (useful for finding related content).",
          parameters: zodSchema(
            z.object({
              url: z.string().describe("The URL to extract links from"),
            })
          ),
          execute: async ({ url }) => {
            opts.onProgress?.({
              type: "tool-call",
              message: `Extracting links: ${url}`,
              toolName: "extract_links",
            });
            const result = await browseWebsite({ url, maxChars: 2000 });
            opts.onProgress?.({
              type: "tool-result",
              message: `Found ${result.links?.length || 0} links`,
              toolName: "extract_links",
            });
            return {
              url: result.url,
              title: result.title,
              links: result.links || [],
            };
          },
        }),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const output = result.text || "No browser output produced.";
    opts.onProgress?.({ type: "done", message: "Browsing complete" });

    return {
      agent: "researcher", // generic — UI shows "Browser" in custom label
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
