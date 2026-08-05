// Chat API — Context builder
// Auto-recall: gathers personalization + memory + RAG + skills in parallel
// and returns a formatted system-prompt block to inject before the user's query.

import {
  buildMemoryContext,
  initDefaultMemory,
} from "@/lib/memory/manager";
import { buildRagContext } from "@/lib/rag/manager";
import { buildPersonalizationContext } from "@/lib/personalization/manager";
import { findMatchingSkills } from "@/lib/personalization/self-learning";

export interface ChatContext {
  personalization: string | null;
  memory: string | null;
  rag: string | null;
  skills: string | null;
}

export interface IncomingMessage {
  role: string;
  content: string;
}

/**
 * Build all the context blocks for a chat turn. Returns nulls for missing
 * sections so the caller can decide whether to include them.
 */
export async function buildChatContext(
  userId: string,
  messages: IncomingMessage[]
): Promise<ChatContext> {
  // Initialize default memory files on first chat (idempotent)
  try {
    await initDefaultMemory(userId);
  } catch (err) {
    console.error("[chat] initDefaultMemory failed:", err);
  }

  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const query = lastUserMsg?.content || "";

  try {
    const [mem, rag, profile, skills] = await Promise.all([
      buildMemoryContext(userId, query),
      buildRagContext(userId, query, 3),
      buildPersonalizationContext(userId),
      findMatchingSkills(userId, query),
    ]);

    let skillsContext: string | null = null;
    if (skills.length > 0) {
      skillsContext =
        `## Learned Skills (apply if relevant)\n` +
        skills
          .map(
            (s: { name: string; useCount: number; description: string }) =>
              `- **${s.name}** (used ${s.useCount}x): ${s.description}`
          )
          .join("\n");
    }

    return {
      personalization: profile,
      memory: mem,
      rag,
      skills: skillsContext,
    };
  } catch (err) {
    console.error("[chat] context recall failed:", err);
    return { personalization: null, memory: null, rag: null, skills: null };
  }
}

/**
 * Format the context blocks into a system-prompt section.
 */
export function formatContextForPrompt(ctx: ChatContext): string {
  return [
    ctx.personalization ? `\n${ctx.personalization}\n` : "",
    ctx.memory ? `\n${ctx.memory}\n` : "",
    ctx.rag ? `\n${ctx.rag}\n` : "",
    ctx.skills ? `\n${ctx.skills}\n` : "",
  ]
    .filter(Boolean)
    .join("");
}
