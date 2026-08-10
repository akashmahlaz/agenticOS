// Memory Keeper sub-agent — focused on long-term memory of the user
// Reads/writes MEMORY.md, USER.md, daily notes (DB-backed via lib/memory/manager)
// Auto-recall: searches memory before each turn
// Auto-capture: extracts facts from conversation with provenance labels

import { createMinimax } from "vercel-minimax-ai-provider";
import { generateText, tool, zodSchema, stepCountIs } from "ai";
import { z } from "zod";
import type { SubAgentCallOptions, SubAgentResult } from "./types";
import {
  getMemoryFile,
  writeMemoryFile,
  appendMemoryFile,
  addMemoryEntry,
  searchMemoryEntries,
  getTopMemoryEntries,
  getTodaysNote,
  appendToTodaysNote,
  getRecentDailyNotes,
  MEMORY_FILE_PATHS,
  PROVENANCE_VALID,
} from "@/lib/memory/manager";

const minimax = (apiKey: string) => createMinimax({ apiKey });

const MEMORY_SYSTEM = `You are the Memory Keeper sub-agent inside agenticOS.

Your ONLY job is to maintain the user's long-term memory. You are NOT the main agent. You receive a memory task (read, write, summarize, or extract), perform it, then return a concise result.

Memory tiers you manage:
- **USER.md** — durable facts about the user (name, role, projects, preferences)
- **MEMORY.md** — curated long-term knowledge (key decisions, project context)
- **IDENTITY.md**, **SOUL.md** — identity and personality metadata
- **memory/YYYY-MM-DD.md** — daily notes (running context, observations)

Provenance labels (REQUIRED when writing):
- \`observed_from_source\` — read from a file, URL, or external source
- \`inferred_by_model\` — derived from multiple observations (lower confidence)
- \`confirmed_by_user\` — user explicitly stated this
- \`imported_from_transcript\` — came from a document/transcript

Importance scale: 1-10 (1=trivial, 10=critical).

Workflow:
1. **Search** memory first with \`memory_search\` to find related context.
2. **Read** relevant files with \`memory_get\`.
3. **Write** new facts with \`memory_save\` (always include provenance + importance).
4. **Update** existing facts by appending or merging (never delete without asking).
5. **Log to today's note** with \`memory_log_today\` for any session activity.

Output rules:
- Be precise — facts are stored, not summarized away.
- Include the date and provenance for each new fact.
- Don't store transient info (current task, today's weather, etc.).
- Don't store speculation as confirmed fact.
- If no new facts to store, say so.

Return ONLY the result of your memory operation. Do not include meta-commentary.`;

export async function runMemoryKeeper(
  opts: SubAgentCallOptions & { userId?: string }
): Promise<SubAgentResult> {
  const start = Date.now();
  const apiKey = process.env.MINIMAX_API_KEY;
  const userId = opts.userId || (opts as any).context?.userId;

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

  if (!userId) {
    return {
      agent: "memory-keeper",
      task: opts.task,
      output: "",
      success: false,
      error: "userId required for memory operations",
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
      stopWhen: stepCountIs(15), // Allow up to 15 tool-call steps
      tools: {
        memory_search: tool({
          description: "Search the user's memory entries for relevant context.",
          inputSchema: zodSchema(
            z.object({
              query: z.string().describe("What to search for"),
              limit: z.number().optional().describe("Max results (default 10)"),
            })
          ),
          execute: async ({ query, limit = 10 }) => {
            opts.onProgress?.({
              type: "tool-call",
              message: `Searching memory: ${query}`,
              toolName: "memory_search",
            });
            const hits = await searchMemoryEntries(userId, query, { limit });
            opts.onProgress?.({
              type: "tool-result",
              message: `Found ${hits.length} matches`,
              toolName: "memory_search",
            });
            return {
              query,
              count: hits.length,
              entries: hits.map((e: any) => ({
                fact: e.fact,
                provenance: e.provenance,
                importance: e.importance,
                category: e.category,
                createdAt: e.createdAt,
              })),
            };
          },
        }),

        memory_get: tool({
          description: "Read a specific memory file (USER.md, MEMORY.md, IDENTITY.md, SOUL.md).",
          inputSchema: zodSchema(
            z.object({
              path: z
                .string()
                .describe("File path, e.g. 'USER.md', 'MEMORY.md'"),
            })
          ),
          execute: async ({ path }) => {
            opts.onProgress?.({
              type: "tool-call",
              message: `Reading ${path}`,
              toolName: "memory_get",
            });
            const file = await getMemoryFile(userId, path);
            if (!file) {
              return { path, found: false, content: null };
            }
            opts.onProgress?.({
              type: "tool-result",
              message: `Read ${file.charCount} chars (v${file.version})`,
              toolName: "memory_get",
            });
            return {
              path: file.path,
              title: file.title,
              content: file.content,
              version: file.version,
              lastEditedBy: file.lastEditedBy,
              updatedAt: file.updatedAt,
              found: true,
            };
          },
        }),

        memory_save: tool({
          description:
            "Save a new fact to memory with provenance label. Stores in the MemoryEntry table (not a file).",
          inputSchema: zodSchema(
            z.object({
              fact: z.string().describe("The fact to remember"),
              provenance: z
                .enum(PROVENANCE_VALID as [string, ...string[]])
                .describe("Where this fact came from"),
              category: z
                .enum(["user", "project", "preference", "fact", "decision", "context"])
                .optional()
                .describe("Optional category for filtering"),
              importance: z
                .number()
                .min(1)
                .max(10)
                .optional()
                .describe("1-10 scale (default 5)"),
            })
          ),
          execute: async ({ fact, provenance, category, importance }) => {
            opts.onProgress?.({
              type: "tool-call",
              message: `Saving: ${fact.slice(0, 50)}...`,
              toolName: "memory_save",
            });
            const entry = await addMemoryEntry({
              userId,
              fact,
              provenance: provenance as any,
              category: category as any,
              importance,
            });
            opts.onProgress?.({
              type: "tool-result",
              message: `Saved (importance ${entry.importance}/10)`,
              toolName: "memory_save",
            });
            return {
              saved: true,
              id: entry.id,
              fact: entry.fact,
              provenance: entry.provenance,
              importance: entry.importance,
            };
          },
        }),

        memory_write_file: tool({
          description:
            "Overwrite a memory file (USER.md, MEMORY.md, IDENTITY.md, SOUL.md) with new content. Use append_memory_file for incremental updates.",
          inputSchema: zodSchema(
            z.object({
              path: z.string().describe("File path"),
              content: z.string().describe("Full new content"),
              title: z.string().optional().describe("Optional title"),
            })
          ),
          execute: async ({ path, content, title }) => {
            opts.onProgress?.({
              type: "tool-call",
              message: `Writing ${path} (${content.length} chars)`,
              toolName: "memory_write_file",
            });
            const file = await writeMemoryFile(userId, path, content, title, "agent");
            opts.onProgress?.({
              type: "tool-result",
              message: `Wrote v${file.version}`,
              toolName: "memory_write_file",
            });
            return {
              saved: true,
              path: file.path,
              version: file.version,
              charCount: file.charCount,
            };
          },
        }),

        append_memory_file: tool({
          description: "Append content to an existing memory file.",
          inputSchema: zodSchema(
            z.object({
              path: z.string().describe("File path"),
              content: z.string().describe("Content to append"),
            })
          ),
          execute: async ({ path, content }) => {
            opts.onProgress?.({
              type: "tool-call",
              message: `Appending to ${path}`,
              toolName: "append_memory_file",
            });
            const file = await appendMemoryFile(userId, path, content);
            opts.onProgress?.({
              type: "tool-result",
              message: `Now ${file.charCount} chars`,
              toolName: "append_memory_file",
            });
            return {
              appended: true,
              path: file.path,
              charCount: file.charCount,
            };
          },
        }),

        memory_log_today: tool({
          description: "Log a timestamped entry to today's daily note.",
          inputSchema: zodSchema(
            z.object({
              entry: z.string().describe("The note to log"),
            })
          ),
          execute: async ({ entry }) => {
            opts.onProgress?.({
              type: "tool-call",
              message: `Logging to today's note`,
              toolName: "memory_log_today",
            });
            const note = await appendToTodaysNote(userId, entry);
            opts.onProgress?.({
              type: "tool-result",
              message: `Now ${note.entryCount} entries today`,
              toolName: "memory_log_today",
            });
            return {
              logged: true,
              date: note.date,
              entryCount: note.entryCount,
            };
          },
        }),

        memory_top: tool({
          description: "Get the top N most important memory entries (used for context recall).",
          inputSchema: zodSchema(
            z.object({
              limit: z.number().optional().describe("Max entries (default 20)"),
            })
          ),
          execute: async ({ limit = 20 }) => {
            opts.onProgress?.({
              type: "tool-call",
              message: `Recalling top ${limit} memories`,
              toolName: "memory_top",
            });
            const entries = await getTopMemoryEntries(userId, limit);
            opts.onProgress?.({
              type: "tool-result",
              message: `Recalled ${entries.length} memories`,
              toolName: "memory_top",
            });
            return {
              count: entries.length,
              entries: entries.map((e: any) => ({
                fact: e.fact,
                provenance: e.provenance,
                importance: e.importance,
                category: e.category,
                lastAccessedAt: e.lastAccessedAt,
              })),
            };
          },
        }),

        memory_recent_notes: tool({
          description: "Get recent daily notes (last N days).",
          inputSchema: zodSchema(
            z.object({
              days: z.number().optional().describe("Number of days (default 7)"),
            })
          ),
          execute: async ({ days = 7 }) => {
            opts.onProgress?.({
              type: "tool-call",
              message: `Fetching last ${days} daily notes`,
              toolName: "memory_recent_notes",
            });
            const notes = await getRecentDailyNotes(userId, days);
            opts.onProgress?.({
              type: "tool-result",
              message: `Got ${notes.length} notes`,
              toolName: "memory_recent_notes",
            });
            return {
              count: notes.length,
              notes: notes.map((n: any) => ({
                date: n.date,
                content: n.content,
                entryCount: n.entryCount,
              })),
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
