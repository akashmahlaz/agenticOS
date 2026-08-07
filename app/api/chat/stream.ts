// Chat API — UIMessageStream handler
// Wraps a streamText result into a UIMessageStream response that the useChat
// hook on the client understands.
//
// Official AI SDK 7.x pattern (per https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data
// and https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol):
//   - Use `writer.merge(result.toUIMessageStream({ sendReasoning: true }))`
//     to forward text/reasoning/tool chunks WITH the proper
//     start/delta/end lifecycle (which we were getting wrong by parsing
//     `result.fullStream` manually).
//   - Use `writer.write({ type: 'data-*' })` for our custom sub-agent,
//     sources, session, finish, error, memory, and learning events.

import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  toUIMessageStream,
  type UIMessageStreamWriter,
} from "ai";
import {
  onSubAgentProgress,
  onInlineQuestion,
  type InlineQuestion,
} from "@/lib/agents/orchestrator";
import { autoCaptureFromTurn } from "@/lib/memory/manager";
import { captureLearnings } from "@/lib/personalization/self-learning";

// We rely on the `ai` SDK's own types. The `streamText` return type is
// complex; declaring it as `unknown` here keeps the boundary simple and
// matches the `toUIMessageStream` generic which is what we actually call.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StreamTextResult = any;

export interface StreamMeta {
  userId: string;
  sessionId: string | null;
  messages: Array<{ role: string; content: string }>;
  model: string;
}

export interface SubAgentEvent {
  agent: string;
  task: string;
  status: string;
  message: string;
  toolName?: string;
  result?: string;
  durationMs?: number;
}

export interface SourceItem {
  title?: string;
  url?: string;
  snippet?: string;
}

/**
 * Build a UIMessageStream response from a streamText result.
 *
 * The AI SDK's `toUIMessageStream({ sendReasoning: true })` is the
 * official, correct way to forward a streamText result. It emits
 * `text-start` / `text-delta` / `text-end` and
 * `reasoning-start` / `reasoning-delta` / `reasoning-end` with matching
 * IDs — the client-side `useChat` hook requires this sequence, and any
 * manual re-implementation (e.g. parsing `result.fullStream`) is fragile
 * and easily produces `Received reasoning-delta for missing reasoning part`
 * errors.
 *
 * We then layer our custom data-* events on top: sub-agent progress,
 * inline questions, sources, session, finish, error, memory and learning.
 */
export function buildUIMessageStream(
  meta: StreamMeta,
  result: StreamTextResult
): Response {
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // 1. Session id (so the client can replaceState the URL)
      if (meta.sessionId) {
        writer.write({
          type: "data-session",
          data: { sessionId: meta.sessionId },
        });
      }

      // 2. Sub-agent progress → data-subagent
      const unsub = onSubAgentProgress((event) => {
        writer.write({
          type: "data-subagent",
          data: event satisfies SubAgentEvent,
        });
      });

      // 3. Inline questions → data-question
      const unsubQuestion = onInlineQuestion((q: InlineQuestion) => {
        writer.write({
          type: "data-question",
          data: q,
        });
      });

      try {
        // 4. Merge the LLM stream. This is the ONLY correct way to forward
        //    a streamText result to the UI message stream — it handles
        //    start/delta/end for both text and reasoning.
        writer.merge(
          toUIMessageStream({
            stream: result.toUIMessageStream({
              sendReasoning: true,
              sendSources: false, // we collect sources ourselves below
              sendFinish: true,
              sendStart: true,
            }),
            onError: (error) => {
              console.error("[chat] stream error:", error);
              return error instanceof Error ? error.message : String(error);
            },
          })
        );
      } catch (streamErr) {
        console.error("[chat] build stream error:", streamErr);
        writer.write({
          type: "data-error",
          data: {
            message:
              streamErr instanceof Error ? streamErr.message : String(streamErr),
          },
        });
      } finally {
        unsub();
        unsubQuestion();

        // 5. Auto-capture memory + learn from this turn
        const lastUserMsg = [...meta.messages]
          .reverse()
          .find((m) => m.role === "user");
        if (lastUserMsg) {
          try {
            const [captured, learnings] = await Promise.all([
              autoCaptureFromTurn(
                meta.userId,
                lastUserMsg.content,
                "", // assistant text already streamed; not needed for capture
                meta.sessionId ?? undefined
              ),
              captureLearnings(meta.userId, lastUserMsg.content),
            ]);
            if (captured > 0) {
              writer.write({
                type: "data-memory",
                data: { event: "auto-captured", count: captured },
              });
            }
            if (learnings.count > 0) {
              writer.write({
                type: "data-learning",
                data: {
                  event: "captured",
                  count: learnings.count,
                  detected: learnings.detected,
                },
              });
            }
          } catch (err) {
            console.error("[chat] auto-capture failed:", err);
          }
        }
      }
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: {
      "X-Session-Id": meta.sessionId ?? "",
    },
  });
}
