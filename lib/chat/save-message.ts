// save-message — persist a UIMessage to the database.
//
// Per the official AI SDK 7.x docs:
//   https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence
//   https://ai-sdk.dev/docs/ai-sdk-ui/chatbot
//
// The onFinish callback receives the full messages array. We persist the
// last 2 messages (user + assistant) preserving the EXACT part order so
// that on reload the UI can render with the official `switch (part.type)`
// pattern (Thought → Action → Observation, ReAct style).
//
// Storage strategy:
//   - content         ← joined text from all text parts (for quick listing)
//   - reasoningSteps  ← reasoning parts as { text } (for analytics)
//   - toolCalls       ← tool parts as { name, input, output } (for analytics)
//   - citations       ← source-url parts as { url, title } (for analytics)
//   - parts           ← FULL ordered UIMessage["parts"] (preserves stream order
//                       and all part types; this is the source of truth on load)

import type { UIMessage } from "ai";
import { db } from "@/lib/db";

export interface SaveChatMessageArgs {
  sessionId: string;
  userId: string;
  message: UIMessage;
  model?: string;
  agent?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeArray(v: unknown): any[] {
  return Array.isArray(v) ? v : [];
}

export async function saveChatMessage(args: SaveChatMessageArgs): Promise<void> {
  const { sessionId, message, model, agent } = args;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts = safeArray(message.parts as any) as any[];

  // Extract text from all text parts (joined for quick listing)
  const text = parts
    .filter((p) => p?.type === "text" && typeof p.text === "string")
    .map((p) => p.text)
    .join("\n");

  // Reasoning parts (for analytics)
  const reasoningSteps = parts
    .filter((p) => p?.type === "reasoning" && typeof p.text === "string")
    .map((p) => ({ text: p.text }));

  // Tool parts (for analytics)
  const toolCalls = parts
    .filter(
      (p) =>
        (typeof p?.type === "string" && p.type.startsWith("tool-")) ||
        p?.type === "dynamic-tool"
    )
    .map((p) => ({
      name: p.toolName ?? p.type.replace(/^tool-/, ""),
      toolCallId: p.toolCallId,
      state: p.state,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      input: p.input ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      output: p.output ?? null,
    }));

  // Source URLs (for analytics)
  const citations = parts
    .filter((p) => p?.type === "source-url" && typeof p.url === "string")
    .map((p) => ({
      url: p.url,
      title: p.title,
      sourceId: p.sourceId,
    }));

  try {
    await db.message.create({
      data: {
        sessionId,
        role: message.role,
        content: text || "",
        reasoningSteps,
        toolCalls,
        citations,
        // Full ordered parts — source of truth for client rendering.
        // Per AI SDK docs, parts must be persisted in their original order.
        parts,
        model: model ?? null,
        agent: agent ?? null,
      },
    });
  } catch (err) {
    console.error("[save-message] failed:", err);
    // Don't throw — we don't want a DB error to break the chat stream
  }
}

export async function saveLastNMessages(args: {
  sessionId: string;
  userId: string;
  messages: UIMessage[];
  model?: string;
  agent?: string;
  n?: number;
}): Promise<void> {
  const { messages, n = 2, model, agent, sessionId, userId } = args;
  const last = messages.slice(-n);
  for (const msg of last) {
    if (msg.role === "user" || msg.role === "assistant") {
      await saveChatMessage({ sessionId, userId, message: msg, model, agent });
    }
  }
}
