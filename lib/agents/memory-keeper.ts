// @ts-nocheck
// Memory Keeper sub-agent — focused on long-term memory of the user
// Reads/writes MEMORY.md, USER.md, daily notes
// Auto-recall: searches memory before each turn
// Auto-capture: extracts facts from conversation with provenance labels

import { createMinimax } from "vercel-minimax-ai-provider";
import { generateText, tool, zodSchema } from "ai";
import { z } from "zod";
import type { SubAgentCallOptions, SubAgentResult } from "./types";

const minimax = (apiKey: string) => createMinimax({ apiKey });

const MEMORY_SYSTEM = `You are the Memory Keeper sub-agent inside agenticOS.

Your ONLY job is to maintain the user's long-term memory. You are NOT the main agent. You receive a memory task (read, write, summarize, or extract), perform it, then return a concise result.

Memory tiers you manage:
- **USER.md** — durable facts about the user (name, role, projects, preferences)
- **MEMORY.md** — curated long-term knowledge (key decisions, project context)
- **memory/YYYY-MM-DD.md** — daily notes (running context, observations)

Provenance labels (REQUIRED when writing):
- \`observed_from_source\` — read from a file, URL, or external source
- \`inferred_by_model\` — derived from multiple observations (lower confidence)
- \`confirmed_by_user\` — user explicitly stated this
- \`imported_from_transcript\` — came from a document/transcript

Workflow:
1. **Search** memory first with \`memorySearch\` to find related context.
2. **Read** relevant files with \`memoryGet\`.
3. **Write** new facts with \`memoryWrite\` (always include provenance).
4. **Update** existing facts by appending or merging (never delete without asking).

Output rules:
- Be precise — facts are stored, not summarized away.
- Include the date and provenance for each new fact.
- Don't store transient info (current task, today's weather, etc.).
- Don't store speculation as confirmed fact.
- If no new facts to store, say so.

Return ONLY the result of your memory operation. Do not include meta-commentary.`;

export async function runMemoryKeeper(
  opts: SubAgentCallOptions
): Promise<SubAgentResult> {
  const start = Date.now();
  const apiKey = process.env.MINIMAX_API_KEY;

  if (!apiKey) {
    return {
      agent: "memory-keeper",
      task: opts.task,
      output: "",
      success: false,
      error: "MINIMAX_API_KEY not configured",
      durationMs: 0,
    };
  }

  opts.onProgress?.({ type: "started", message: `Memory task: ${opts.task}` });

  try {
    const result = await generateText({
      model: minimax(apiKey)(opts.model || "MiniMax-M2"),
      system: MEMORY_SYSTEM,
      prompt: opts.context
        ? `Task: ${opts.task}\n\nContext: ${opts.context}`
        : `Task: ${opts.task}`,
      tools: {
        memorySearch: tool({
          description: "Search the user's memory files for relevant context.",
          parameters: zodSchema(
            z.object({
              query: z.string().describe("What to search for"),
            })
          ),
          execute: async ({ query }) => {
            opts.onProgress?.({
              type: "tool-call",
              message: `Searching memory: ${query}`,
              toolName: "memorySearch",
            });
            // Stub — would call real memory search API
            const hits = [
              { file: "USER.md", line: "User is building agenticOS", relevance: 0.92 },
              { file: "MEMORY.md", line: "Stack: Next.js 16, MiniMax M2, Neon", relevance: 0.85 },
            ].filter((h) => h.line.toLowerCase().includes(query.toLowerCase()));
            opts.onProgress?.({
              type: "tool-result",
              message: `Found ${hits.length} matches`,
              toolName: "memorySearch",
            });
            return { query, hits };
          },
        }),

        memoryGet: tool({
          description: "Read a specific memory file or section.",
          parameters: zodSchema(
            z.object({
              path: z.string().describe("File path, e.g. 'USER.md' or 'memory/2026-08-05.md'"),
            })
          ),
          execute: async ({ path }) => {
            opts.onProgress?.({
              type: "tool-call",
              message: `Reading ${path}`,
              toolName: "memoryGet",
            });
            // Stub
            return { path, content: `# ${path}\n\n[Memory contents placeholder]` };
          },
        }),

        memoryWrite: tool({
          description: "Write a new fact to a memory file with provenance label.",
          parameters: zodSchema(
            z.object({
              path: z.string().describe("File to write to"),
              fact: z.string().describe("The fact to remember"),
              provenance: z
                .enum(["observed_from_source", "inferred_by_model", "confirmed_by_user", "imported_from_transcript"])
                .describe("Where this fact came from"),
              importance: z.number().min(1).max(10).optional().describe("1-10 scale"),
            })
          ),
          execute: async ({ path, fact, provenance, importance }) => {
            opts.onProgress?.({
              type: "tool-call",
              message: `Saving to ${path}`,
              toolName: "memoryWrite",
            });
            // Stub — would call real memory write API
            return {
              saved: true,
              path,
              fact,
              provenance,
              importance: importance ?? 5,
              timestamp: new Date().toISOString(),
            };
          },
        }),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const output = result.text || "No memory output produced.";
    opts.onProgress?.({ type: "done", message: "Memory operation complete" });

    return {
      agent: "memory-keeper",
      task: opts.task,
      output,
      durationMs: Date.now() - start,
      success: true,
    };
  } catch (err) {
    return {
      agent: "memory-keeper",
      task: opts.task,
      output: "",
      success: false,
      error: String(err),
      durationMs: Date.now() - start,
    };
  }
}
