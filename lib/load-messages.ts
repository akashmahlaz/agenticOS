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
 * Strategy: interleave parts in their ORIGINAL order (not grouped by type).
 *
 * Per the AI SDK 7.x docs and ReAct pattern, a typical assistant turn
 * contains text fragments, tool-call requests, tool-call results, and
 * reasoning traces, INTERLEAVED in the order the model emitted them.
 *
 * We use the `_order` field saved on each item (added by saveChatMessage)
 * to reconstruct this order. If `_order` is missing (legacy messages),
 * we fall back to the old grouped order.
 */
export function dbMessageToUi(m: DbMessage): UIMessage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reasoningRaw = safeArray(m.reasoningSteps) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toolsRaw = safeArray(m.toolCalls) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const citationsRaw = safeArray(m.citations) as any[];

  // Build a unified "timeline" of all parts with their type + payload + order
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timeline: Array<{ order: number; build: () => UIMessage["parts"][number] }> = [];

  // Reasoning
  for (const r of reasoningRaw) {
    if (r && typeof r === "object" && typeof r.text === "string" && r.text) {
      timeline.push({
        order: typeof r._order === "number" ? r._order : 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        build: () => ({ type: "reasoning", text: r.text }) as any,
      });
    }
  }

  // Tools
  for (const t of toolsRaw) {
    if (t && typeof t === "object") {
      const name = typeof t.name === "string" ? t.name : "tool";
      timeline.push({
        order: typeof t._order === "number" ? t._order : 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        build: () =>
          ({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            type: `tool-${name}` as any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            toolCallId: (t.id as string) || `${m.id}-${name}`,
            state: "output-available" as const,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            input: (t.input as any) ?? {},
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            output: (t.output as any) ?? null,
          }) as any,
      });
    }
  }

  // Sources
  for (const c of citationsRaw) {
    if (c && typeof c === "object" && typeof c.url === "string") {
      timeline.push({
        order: typeof c._order === "number" ? c._order : 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        build: () =>
          ({
            type: "source-url",
            url: c.url,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            title: (c.title as string) ?? c.url,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            sourceId: (c.id as string) ?? c.url,
          }) as any,
      });
    }
  }

  // If no _order was saved anywhere, fall back to old grouped order
  const hasOrder = timeline.some((t) => t.order !== 0) || timeline.length <= 1;
  if (hasOrder) {
    timeline.sort((a, b) => a.order - b.order);
  }

  const parts: UIMessage["parts"] = timeline.map((t) => t.build());

  // Text part last (the actual message content) — text isn't tracked with _order
  // because the AI SDK joins all text parts into a single "text" part on save
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
