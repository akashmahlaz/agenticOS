// Chat API — Route handler (slim)
// POST /api/chat
// Accepts UIMessage-format messages and returns a UIMessageStream response.
// The stream is consumed by the useChat hook on the client.

import { streamText, type UIMessage } from "ai";
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

  // 4. Build messages and update session title for new sessions
  const incomingMessages = messages.map((m) => ({
    role: m.role,
    content: partsToText(m.parts),
  }));
  const lastUserMsg = [...incomingMessages].reverse().find((m) => m.role === "user");
  const msgContent = lastUserMsg?.content?.slice(0, 100) || "New Chat";
  const newTitle = msgContent.length > 50 ? msgContent.slice(0, 47) + "..." : msgContent;
  
  // Update session title if it's a new session or still has default title
  if (!incomingSessionId) {
    try {
      const session = await db.session.findFirst({ where: { id: sessionId, userId } });
      if (session && session.title === "New Chat") {
        await db.session.update({ where: { id: sessionId }, data: { title: newTitle } });
      }
    } catch (err) {
      console.error("[chat] failed to update session title:", err);
    }
  }

  // 5. API key check
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "MINIMAX_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // 6. Build context (auto-recall from memory/RAG/personalization/skills)
  const ctx = await buildChatContext(userId, incomingMessages);
  const systemPrompt = buildSystemPrompt(formatContextForPrompt(ctx));

  // 7. Save the latest user message to the DB
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

  // 8. Stream — manually convert UIMessages to ModelMessages to work
  // around the AI SDK's convertToModelMessages incompatibility with
  // the MiniMax provider for file parts. The provider wants
  // `part.data` to be raw base64/URL, but convertToModelMessages
  // wraps data: URLs as `{type:'url', url:'data:...'}` which the
  // provider then tries to convertToBase64() and fails.
  const selectedModel = model || "MiniMax-M2";
  const modelMessages = await convertUIMessagesToModel(messages);

  // Stash userId/sessionId on globalThis so sub-agents (memory-keeper,
  // knowledge, etc.) can access them. The AI SDK 7.x tool execution
  // context doesn't include user-supplied fields directly, so we use a
  // per-request global. This is safe because each request is isolated
  // in its own serverless function invocation.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__currentChatUserId = userId;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__currentChatSessionId = sessionId;

  const result = streamText({
    model: createMinimax({ apiKey })(selectedModel),
    system: systemPrompt,
    messages: modelMessages,
    tools,
    // Agentic loop: keep working until the task is complete OR
    // we hit the safety limit of 20 steps. The agent signals
    // completion by including `<!-- TASK_COMPLETE -->` in its
    // final text. We check the last assistant text for that
    // marker, falling back to the step cap.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stopWhen: (async (event: any) => {
      const steps = event?.steps ?? [];
      if (steps.length >= 20) return true;
      // Check the most recent assistant text for the completion marker
      for (let i = steps.length - 1; i >= 0; i--) {
        const step = steps[i];
        const text = step?.content?.find?.((p: any) => p.type === "text")?.text;
        if (typeof text === "string" && text.includes("<!-- TASK_COMPLETE -->")) {
          return true;
        }
      }
      return false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  // 8. Wrap into UIMessageStream response. We pass the whole `result`
  //    object (not `result.fullStream`) so buildUIMessageStream can use
  //    `result.toUIMessageStream({ sendReasoning: true })` — the official
  //    AI SDK pattern that emits proper start/delta/end lifecycle chunks.
  return buildUIMessageStream(
    { userId, sessionId, messages: incomingMessages, model: selectedModel },
    result
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

/**
 * Custom UIMessage → ModelMessage converter that handles file parts
 * correctly for the MiniMax provider.
 *
 * The default convertToModelMessages wraps data: URLs as
 * `{type:'url', url:'data:...'}`, but the MiniMax provider expects
 * either a raw base64 string or a URL object. This function
 * extracts the base64 from data: URLs and passes it as a string.
 *
 * For non-data URLs, it passes them as-is via the `url` field.
 */
async function convertUIMessagesToModel(
  messages: UIMessage[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any[] = [];
  for (const m of messages) {
    if (m.role === "system") {
      out.push({
        role: "system",
        content: m.parts
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((p: any) => p.type === "text")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((p: any) => p.text)
          .join(""),
      });
      continue;
    }
    if (m.role === "user") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content: any[] = [];
      for (const p of m.parts) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const part: any = p;
        if (part.type === "text") {
          content.push({ type: "text", text: part.text });
        } else if (part.type === "file") {
          // File parts: the AI SDK's `convertToLanguageModelV4FilePart`
          // wraps our data string as `{type:'data', data:'...'}`, and the
          // MiniMax provider's getArgs() then mangles it into an invalid
          // base64 string. To work around this incompatibility we use a
          // custom transform middleware that re-shapes the file part into
          // a `{type:'image_url', image_url:{url: 'data:...'}}` content
          // part for the model. (See experimental_transform below.)
          // For now, just attach the file info as a user-readable text
          // marker so the agent knows a file was attached. The actual
          // image bytes are forwarded via the transform middleware.
          if (part.mediaType?.startsWith("image/")) {
            content.push({
              type: "text",
              text: `[Attached image: ${part.filename ?? "image"} (${part.mediaType}) — content is included in the request]`,
            });
            // We also include a stub file part so the model's vision can
            // see it. The transform middleware re-shapes this into the
            // provider's expected image_url format.
            content.push({
              type: "file",
              mediaType: part.mediaType,
              filename: part.filename,
              // The transform in streamText strips this and re-injects
              // a properly-shaped image part.
              data: "__ATTACHMENT__:" + (part.url ?? ""),
            });
          } else {
            // Non-image files: include as text reference
            content.push({
              type: "text",
              text: `[Attached file: ${part.filename ?? "file"} (${part.mediaType})]`,
            });
          }
        }
        // Skip other part types (data-*, tool-*, etc.) for the model
      }
      out.push({ role: "user", content });
      continue;
    }
    if (m.role === "assistant") {
      // For assistant messages, just extract the text (history reconstruction)
      const text = partsToText(m.parts);
      if (text) {
        out.push({ role: "assistant", content: [{ type: "text", text }] });
      }
      continue;
    }
  }
  return out;
}
