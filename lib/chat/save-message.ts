// save-message — extract structured data from a UIMessage and save to DB
// Called by the onFinish callback in toUIMessageStream() to persist both
// the user message and the AI response.
//
// Per the AI SDK 7.x official docs:
//   https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence
// The onFinish callback receives the full messages array (including the
// new AI response). We save the last 2 messages (user + assistant).

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

/**
 * Extract structured data from a UIMessage and persist it to the database.
 *
 * - text content   → `content` field (joined from all text parts)
 * - reasoning      → `reasoningSteps` JSON array
 * - tool calls     → `toolCalls` JSON array
 * - source URLs    → `citations` JSON array
 * - model + agent  → stored as separate columns
 *
 * Safe to call multiple times for the same message — uses try/catch to
 * never break the stream on DB errors.
 */
export async function saveChatMessage(args: SaveChatMessageArgs): Promise<void> {
  const { sessionId, message, model, agent } = args;
  const parts = safeArray(message.parts);

  // Extract text from all text parts
  const text = parts
    .filter((p) => p?.type === "text" && typeof p.text === "string")
    .map((p) => p.text)
    .join("\n");

  // Extract reasoning
  const reasoningSteps = parts
    .filter((p) => p?.type === "reasoning" && typeof p.text === "string")
    .map((p) => ({ text: p.text }));

  // Extract tool calls (tool-* parts and dynamic-tool)
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

  // Extract source URLs
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
        content: text || "", // ensure non-null
        reasoningSteps,
        toolCalls,
        citations,
        model: model ?? null,
        agent: agent ?? null,
      },
    });
  } catch (err) {
    console.error("[save-message] failed:", err);
    // Don't throw — we don't want a DB error to break the chat stream
  }
}

/**
 * Save the last N messages from a messages array. Used by onFinish
 * callback which receives the full UIMessage[] array.
 */
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
