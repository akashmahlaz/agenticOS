// load-messages — convert DB messages to UIMessage[] for useChat
// Fetches messages for a given session from /api/messages
// and converts the DB shape (single content string + JSON fields)
// into the UIMessage shape (parts array).

import type { UIMessage } from "ai";

export interface DbMessage {
  id: string;
  role: string;
  content: string;
  reasoningSteps?: unknown;
  toolCalls?: unknown;
  citations?: unknown;
  model?: string | null;
  agent?: string | null;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeArray(v: unknown): any[] {
  return Array.isArray(v) ? (v as any[]) : [];
}

/**
 * Convert a single DB message to a UIMessage.
 * Strategy:
 *  - text part ← content
 *  - reasoning parts ← reasoningSteps (each entry: { text })
 *  - tool parts ← toolCalls (each entry: { name, input, output })
 *  - source parts ← citations (each entry: { url, title })
 */
export function dbMessageToUi(m: DbMessage): UIMessage {
  const parts: UIMessage["parts"] = [];

  // Reasoning parts first (they come before the text in chat history)
  const reasoning = safeArray(m.reasoningSteps);
  for (const r of reasoning) {
    if (r && typeof r === "object" && typeof r.text === "string" && r.text) {
      parts.push({ type: "reasoning", text: r.text });
    }
  }

  // Tool parts
  const tools = safeArray(m.toolCalls);
  for (const t of tools) {
    if (t && typeof t === "object") {
      const name = typeof t.name === "string" ? t.name : "tool";
      parts.push({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: `tool-${name}` as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        toolCallId: (t.id as string) || `${m.id}-${name}`,
        state: "output-available" as const,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        input: (t.input as any) ?? {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        output: (t.output as any) ?? null,
      });
    }
  }

  // Source parts
  const citations = safeArray(m.citations);
  for (const c of citations) {
    if (c && typeof c === "object" && typeof c.url === "string") {
      parts.push({
        type: "source-url",
        url: c.url,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        title: (c.title as string) ?? c.url,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sourceId: (c.id as string) ?? c.url,
      } as UIMessage["parts"][number]);
    }
  }

  // Text part last (the actual message content)
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
  sessionId: string,
  token?: string | null
): Promise<UIMessage[]> {
  if (!sessionId) return [];
  try {
    const res = await fetch(`/api/messages?sessionId=${encodeURIComponent(sessionId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    });
    if (!res.ok) return [];
    const data: DbMessage[] = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map(dbMessageToUi);
  } catch (err) {
    console.error("[load-messages] failed:", err);
    return [];
  }
}
