// Memory manager — OpenClaw-style long-term memory
// Manages per-user memory files (USER.md, MEMORY.md, IDENTITY.md, SOUL.md)
// and daily notes (memory/YYYY-MM-DD.md)
// All writes carry provenance labels

import { db } from "@/lib/db";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type Provenance =
  | "observed_from_source"
  | "inferred_by_model"
  | "confirmed_by_user"
  | "imported_from_transcript";

export type MemoryCategory =
  | "user"
  | "project"
  | "preference"
  | "fact"
  | "decision"
  | "context";

export const PROVENANCE_VALID: Provenance[] = [
  "observed_from_source",
  "inferred_by_model",
  "confirmed_by_user",
  "imported_from_transcript",
];

export const MEMORY_FILE_PATHS = {
  USER: "USER.md",
  MEMORY: "MEMORY.md",
  IDENTITY: "IDENTITY.md",
  SOUL: "SOUL.md",
} as const;

export type MemoryFilePath = (typeof MEMORY_FILE_PATHS)[keyof typeof MEMORY_FILE_PATHS];

// ──────────────────────────────────────────────
// Memory file operations
// ──────────────────────────────────────────────

/**
 * Get a memory file by path. Returns null if not found.
 */
export async function getMemoryFile(userId: string, path: string) {
  return db.memoryFile.findUnique({
    where: { userId_path: { userId, path } },
  });
}

/**
 * Get all memory files for a user.
 */
export async function getAllMemoryFiles(userId: string) {
  return db.memoryFile.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Create or update a memory file.
 */
export async function writeMemoryFile(
  userId: string,
  path: string,
  content: string,
  title?: string,
  lastEditedBy: string = "agent"
) {
  const existing = await db.memoryFile.findUnique({
    where: { userId_path: { userId, path } },
  });

  if (existing) {
    return db.memoryFile.update({
      where: { userId_path: { userId, path } },
      data: {
        content,
        title: title ?? existing.title,
        version: { increment: 1 },
        charCount: content.length,
        lastEditedBy,
      },
    });
  }

  return db.memoryFile.create({
    data: {
      userId,
      path,
      title: title ?? defaultTitleForPath(path),
      content,
      charCount: content.length,
      lastEditedBy,
    },
  });
}

/**
 * Append content to a memory file.
 */
export async function appendMemoryFile(
  userId: string,
  path: string,
  contentToAppend: string,
  separator: string = "\n\n"
) {
  const existing = await getMemoryFile(userId, path);
  if (!existing) {
    return writeMemoryFile(userId, path, contentToAppend, undefined, "agent");
  }
  const newContent = existing.content + separator + contentToAppend;
  return writeMemoryFile(userId, path, newContent, existing.title, "agent");
}

/**
 * Initialize default memory files for a new user.
 * Idempotent — safe to call multiple times.
 */
export async function initDefaultMemory(userId: string) {
  const defaults = [
    {
      path: MEMORY_FILE_PATHS.USER,
      title: "User Profile",
      content: `# User Profile

_Last updated: ${new Date().toISOString().split("T")[0]}_

This file contains durable facts about the user. Updated automatically by the Memory Keeper sub-agent when the user shares new information.

## Identity
- (auto-populated as we learn more)

## Projects
- (auto-populated)

## Preferences
- (auto-populated)
`,
    },
    {
      path: MEMORY_FILE_PATHS.MEMORY,
      title: "Long-term Memory",
      content: `# Long-term Memory

_Last updated: ${new Date().toISOString().split("T")[0]}_

This file contains curated long-term knowledge: key decisions, project context, and important context that should persist across sessions.

## Key Decisions
- (auto-populated)

## Project Context
- (auto-populated)

## Lessons Learned
- (auto-populated)
`,
    },
  ];

  for (const def of defaults) {
    const existing = await getMemoryFile(userId, def.path);
    if (!existing) {
      await writeMemoryFile(userId, def.path, def.content, def.title, "system");
    }
  }
}

function defaultTitleForPath(path: string): string {
  if (path === MEMORY_FILE_PATHS.USER) return "User Profile";
  if (path === MEMORY_FILE_PATHS.MEMORY) return "Long-term Memory";
  if (path === MEMORY_FILE_PATHS.IDENTITY) return "Identity";
  if (path === MEMORY_FILE_PATHS.SOUL) return "Soul & Personality";
  return path.replace(/\.md$/, "").replace(/_/g, " ");
}

// ──────────────────────────────────────────────
// Memory entries (facts with provenance)
// ──────────────────────────────────────────────

/**
 * Add a single fact to memory.
 */
export async function addMemoryEntry(input: {
  userId: string;
  fact: string;
  provenance: Provenance;
  category?: MemoryCategory;
  importance?: number;
  confidence?: number;
  sourceSessionId?: string;
  sourceMessageId?: string;
}) {
  return db.memoryEntry.create({
    data: {
      userId: input.userId,
      fact: input.fact,
      provenance: input.provenance,
      category: input.category,
      importance: input.importance ?? 5,
      confidence: input.confidence ?? 0.8,
      sourceSessionId: input.sourceSessionId,
      sourceMessageId: input.sourceMessageId,
    },
  });
}

/**
 * Add many facts at once (batch).
 */
export async function addMemoryEntries(
  userId: string,
  entries: Array<{
    fact: string;
    provenance: Provenance;
    category?: MemoryCategory;
    importance?: number;
    confidence?: number;
    sourceSessionId?: string;
    sourceMessageId?: string;
  }>,
  sourceSessionId?: string,
  sourceMessageId?: string
) {
  return db.memoryEntry.createMany({
    data: entries.map((e: any) => ({
      userId,
      fact: e.fact,
      provenance: e.provenance,
      category: e.category,
      importance: e.importance ?? 5,
      confidence: e.confidence ?? 0.8,
      sourceSessionId: e.sourceSessionId ?? sourceSessionId,
      sourceMessageId: e.sourceMessageId ?? sourceMessageId,
    })),
  });
}

/**
 * Search memory entries by text query.
 * Filters out duplicates (case-insensitive fact match) and ranks by importance + recency.
 */
export async function searchMemoryEntries(
  userId: string,
  query: string,
  opts: { limit?: number; category?: MemoryCategory; minImportance?: number } = {}
) {
  const limit = opts.limit ?? 10;
  const minImportance = opts.minImportance ?? 1;

  // Simple LIKE-based search — works well for small/medium memory sizes
  const entries = await db.memoryEntry.findMany({
    where: {
      userId,
      importance: { gte: minImportance },
      ...(opts.category ? { category: opts.category } : {}),
      fact: { contains: query, mode: "insensitive" },
    },
    orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  // Update lastAccessedAt for returned entries (fire-and-forget)
  for (const e of entries) {
    db.memoryEntry
      .update({ where: { id: e.id }, data: { lastAccessedAt: new Date() } })
      .catch(() => {});
  }

  return entries;
}

/**
 * Get all entries (no query) — used to inject context into the agent.
 */
export async function getTopMemoryEntries(userId: string, limit: number = 20) {
  return db.memoryEntry.findMany({
    where: { userId },
    orderBy: [{ importance: "desc" }, { lastAccessedAt: "desc" }],
    take: limit,
  });
}

// ──────────────────────────────────────────────
// Daily notes (memory/YYYY-MM-DD.md)
// ──────────────────────────────────────────────

function todayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Get today's daily note. Creates an empty one if it doesn't exist.
 */
export async function getTodaysNote(userId: string) {
  const date = todayDateString();
  let note = await db.memoryDaily.findUnique({
    where: { userId_date: { userId, date } },
  });

  if (!note) {
    note = await db.memoryDaily.create({
      data: {
        userId,
        date,
        content: `# Daily Note — ${date}\n\n`,
        entryCount: 0,
      },
    });
  }

  return note;
}

/**
 * Get a daily note by date (YYYY-MM-DD).
 */
export async function getDailyNote(userId: string, date: string) {
  return db.memoryDaily.findUnique({
    where: { userId_date: { userId, date } },
  });
}

/**
 * Append a line to today's note.
 */
export async function appendToTodaysNote(userId: string, line: string) {
  const today = await getTodaysNote(userId);
  const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
  const newLine = `- [${timestamp}] ${line}`;
  const newContent = today.content.trimEnd() + "\n" + newLine + "\n";
  return db.memoryDaily.update({
    where: { userId_date: { userId, date: today.date } },
    data: {
      content: newContent,
      entryCount: { increment: 1 },
    },
  });
}

/**
 * Get recent daily notes (for context recall).
 */
export async function getRecentDailyNotes(userId: string, days: number = 7) {
  const all = await db.memoryDaily.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: days,
  });
  return all;
}

// ──────────────────────────────────────────────
// Context builder (used by chat API for auto-recall)
// ──────────────────────────────────────────────

/**
 * Build a memory context block to inject into the agent's system prompt.
 * Returns the top entries, key file summaries, and recent daily notes.
 */
export async function buildMemoryContext(userId: string, query?: string) {
  const blocks: string[] = [];

  // 1. Top memory entries (highest importance, most recently accessed)
  const topEntries = await getTopMemoryEntries(userId, 20);
  if (topEntries.length > 0) {
    blocks.push(
      `## Top Memory (${topEntries.length} facts)\n` +
        topEntries
          .map(
            (e: any) =>
              `- [${e.provenance}, importance ${e.importance}/10${
                e.category ? `, ${e.category}` : ""
              }] ${e.fact}`
          )
          .join("\n")
    );
  }

  // 2. Query-specific search
  if (query && query.length > 3) {
    const hits = await searchMemoryEntries(userId, query, { limit: 5 });
    if (hits.length > 0) {
      blocks.push(
        `## Memory relevant to current query\n` +
          hits.map((e: any) => `- [${e.provenance}] ${e.fact}`).join("\n")
      );
    }
  }

  // 3. Recent daily notes
  const recentNotes = await getRecentDailyNotes(userId, 3);
  if (recentNotes.length > 0) {
    blocks.push(
      `## Recent Daily Notes\n` +
        recentNotes
          .map((n: any) => `### ${n.date} (${n.entryCount} entries)\n${n.content.slice(0, 400)}`)
          .join("\n\n")
    );
  }

  return blocks.length > 0 ? blocks.join("\n\n") : null;
}

/**
 * Auto-capture: extract facts from a conversation turn and save them.
 * Returns the number of new entries saved.
 */
export async function autoCaptureFromTurn(
  userId: string,
  userMessage: string,
  assistantMessage: string,
  sessionId?: string,
  messageId?: string
): Promise<number> {
  // Heuristic extraction: simple keyword-based rules (no LLM call to save cost)
  const facts: Array<{ fact: string; provenance: Provenance; category: MemoryCategory; importance: number }> = [];

  // User preferences (high confidence)
  if (/i (like|love|prefer|enjoy|hate|dislike)\s+/i.test(userMessage)) {
    const match = userMessage.match(/i (?:like|love|prefer|enjoy|hate|dislike)\s+(.+?)(?:[.!?]|$)/i);
    if (match) {
      facts.push({
        fact: `User ${match[0].toLowerCase().trim()}`,
        provenance: "confirmed_by_user",
        category: "preference",
        importance: 7,
      });
    }
  }

  // User identity
  const nameMatch = userMessage.match(/(?:my name is|i'm called|i am called|call me)\s+([A-Z][a-z]+)/);
  if (nameMatch) {
    facts.push({
      fact: `User's name is ${nameMatch[1]}`,
      provenance: "confirmed_by_user",
      category: "user",
      importance: 9,
    });
  }

  // Role / occupation
  const roleMatch = userMessage.match(/(?:i work as|i'm a|i am a)\s+([a-z][^.!?]{2,40})/i);
  if (roleMatch) {
    facts.push({
      fact: `User works as ${roleMatch[1].trim()}`,
      provenance: "confirmed_by_user",
      category: "user",
      importance: 8,
    });
  }

  // Project mentions
  const projectMatch = userMessage.match(/(?:i'm working on|i am working on|building|developing)\s+([a-z][^.!?]{2,40})/i);
  if (projectMatch) {
    facts.push({
      fact: `User is working on: ${projectMatch[1].trim()}`,
      provenance: "confirmed_by_user",
      category: "project",
      importance: 7,
    });
  }

  // Save the facts
  if (facts.length > 0) {
    await addMemoryEntries(
      userId,
      facts,
      sessionId,
      messageId
    );
  }

  // Always log to today's note
  const summary = userMessage.length > 100 ? userMessage.slice(0, 97) + "..." : userMessage;
  await appendToTodaysNote(userId, `User: ${summary}`);

  return facts.length;
}
