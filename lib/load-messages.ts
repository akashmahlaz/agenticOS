// load-messages — convert DB messages to UIMessage[] for useChat
//
// Per the official AI SDK 7.x docs:
//   https://ai-sdk.dev/docs/ai-sdk-ui/chatbot
//   https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence
//
// The DB stores the FULL ordered UIMessage["parts"] array (preserves
// stream order — Thought → Action → Observation, ReAct style).
// This is the source of truth on load.
//
// We render with the official `message.parts.map` + `switch (part.type)`
// pattern in `components/chat/chat-message.tsx`.

import type { UIMessage } from "ai";

export interface DbMessage {
  id: string;
  role: string;
  content: string;
  reasoningSteps: unknown;
  toolCalls: unknown;
  citations: unknown;
  parts: unknown;
  model?: string | null;
  agent?: string | null;
  createdAt: string | Date;
}

/**
 * Convert a single DB message to a UIMessage.
 *
 * Priority:
 *   1. `parts` column (full ordered parts) — used if present
 *   2. Fallback: build parts from `content` + `reasoningSteps` + `toolCalls`
 *      + `citations` (for legacy messages saved before `parts` was added)
 */
export function dbMessageToUi(m: DbMessage): UIMessage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storedParts = Array.isArray(m.parts) ? (m.parts as any[]) : null;

  if (storedParts && storedParts.length > 0) {
    // New format: use the full ordered parts array as-is
    return {
      id: m.id,
      role: m.role as UIMessage["role"],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parts: storedParts as any,
    };
  }

  // Legacy fallback: rebuild parts from separate fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: UIMessage["parts"] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reasoning = (Array.isArray(m.reasoningSteps) ? m.reasoningSteps : []) as any[];
  for (const r of reasoning) {
    if (r && typeof r === "object" && typeof r.text === "string" && r.text) {
      parts.push({ type: "reasoning", text: r.text });
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools = (Array.isArray(m.toolCalls) ? m.toolCalls : []) as any[];
  for (const t of tools) {
    if (t && typeof t === "object") {
      const name = typeof t.name === "string" ? t.name : "tool";
      parts.push({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: `tool-${name}` as any,
        toolCallId: t.toolCallId || `${m.id}-${name}`,
        state: "output-available" as const,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        input: (t.input as any) ?? {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        output: (t.output as any) ?? null,
      });
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const citations = (Array.isArray(m.citations) ? m.citations : []) as any[];
  for (const c of citations) {
    if (c && typeof c === "object" && typeof c.url === "string") {
      parts.push({
        type: "source-url",
        url: c.url,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        title: (c.title as string) ?? c.url,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sourceId: (c.id as string) ?? c.url,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    }
  }
  if (m.content) {
    parts.push({ type: "text", text: m.content });
  }

  return {
    id: m.id,
    role: m.role as UIMessage["role"],
    parts,
  };
}

/**
 * Fetch all messages for a session and convert to UIMessage[].
 * Returns [] if no session, no auth, or on error.
 */
export async function loadSessionMessages(
  sessionId: string | null,
  token: string | null
): Promise<UIMessage[]> {
  if (!sessionId) return [];
  try {
    const res = await fetch(
      `/api/messages?sessionId=${encodeURIComponent(sessionId)}`,
      {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    if (!res.ok) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any[];
    if (!Array.isArray(data)) return [];
    return data.map(dbMessageToUi);
  } catch (err) {
    console.error("[load-messages] failed:", err);
    return [];
  }
}
