// Chat API — Route handler (slim)
// POST /api/chat
// Accepts UIMessage-format messages and returns a UIMessageStream response.
// The stream is consumed by the useChat hook on the client.

import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { createMinimax } from "vercel-minimax-ai-provider";
import { getUserIdFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { allTools as tools } from "./tools";
import { buildChatContext, formatContextForPrompt } from "./context";
import { buildSystemPrompt } from "./system-prompt";
import { buildUIMessageStream } from "./stream";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ChatRequest {
  messages: UIMessage[];
  sessionId?: string | null;
  model?: string;
  isTemporary?: boolean;
}

export async function POST(req: Request): Promise<Response> {
  // 1. Auth
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Parse + validate
  const body = (await req.json()) as ChatRequest;
  const { messages, sessionId: incomingSessionId, model, isTemporary } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "Invalid messages" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Resolve session — create one if not provided
  const sessionId = incomingSessionId || (await createSession(userId, isTemporary));

  // 4. API key check
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "MINIMAX_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // 5. Build context (auto-recall from memory/RAG/personalization/skills)
  const incomingMessages = messages.map((m) => ({
    role: m.role,
    content: partsToText(m.parts),
  }));
  const ctx = await buildChatContext(userId, incomingMessages);
  const systemPrompt = buildSystemPrompt(formatContextForPrompt(ctx));

  // 6. Save the latest user message to the DB
  const lastUserMsg = [...incomingMessages].reverse().find((m) => m.role === "user");
  if (lastUserMsg && lastUserMsg.content) {
    try {
      await db.message.create({
        data: {
          sessionId,
          role: "user",
          content: lastUserMsg.content,
        },
      });
    } catch (err) {
      console.error("[chat] failed to save user message:", err);
    }
  }

  // 7. Stream — convertToModelMessages is async in AI SDK 7.x, must await
  const selectedModel = model || "MiniMax-M2";
  const modelMessages = await convertToModelMessages(messages);
  const result = streamText({
    model: createMinimax({ apiKey })(selectedModel),
    system: systemPrompt,
    messages: modelMessages,
    tools,
    // Pass userId + sessionId to tools via experimental_context
    // so sub-agents (memory-keeper, knowledge, etc.) can identify the user
    experimental_context: { userId, sessionId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  // 8. Wrap into UIMessageStream response
  return buildUIMessageStream(
    { userId, sessionId, messages: incomingMessages, model: selectedModel },
    result.fullStream
  );
}

/**
 * Create a new chat session for a user.
 */
async function createSession(userId: string, isTemporary = false): Promise<string> {
  const session = await db.session.create({
    data: {
      userId,
      title: "New Chat",
      model: "MiniMax-M2",
      isTemporary: !!isTemporary,
    },
  });
  return session.id;
}

/**
 * Convert UIMessage parts to a single text string.
 * useChat passes messages as { role, parts: UIMessagePart[] }.
 */
function partsToText(parts: UIMessage["parts"]): string {
  return parts
    .map((p) => {
      switch (p.type) {
        case "text":
          return p.text;
        case "reasoning":
          return p.text;
        default:
          return "";
      }
    })
    .join("\n")
    .trim();
}
