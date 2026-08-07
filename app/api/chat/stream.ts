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
 * Async generator that yields chunks from `source` but drops any
 * `reasoning-delta` / `text-delta` / `tool-input-delta` whose `delta`
 * field is empty/missing.
 *
 * The AI SDK's `toUIMessageStream` faithfully forwards empty delta
 * events that some providers (e.g. MiniMax over Anthropic) emit with
 * no text content. The client-side `useChat` hook does strict Zod
 * validation and throws on these ("expected string, received
 * undefined"). We filter them out before merging.
 */
async function* dropEmptyDeltas(
  source: AsyncIterable<unknown>
): AsyncGenerator<unknown, void, undefined> {
  for await (const chunk of source) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = chunk as any;
    const t = c?.type;
    if (
      (t === "reasoning-delta" ||
        t === "text-delta" ||
        t === "tool-input-delta") &&
      (c.delta === undefined || c.delta === null || c.delta === "")
    ) {
      // Drop empty delta — would fail Zod validation on the client.
      continue;
    }
    yield chunk;
  }
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
 * One gotcha: the SDK forwards empty delta chunks (e.g. when a provider
 * emits a "begin reasoning" event with no text). The client rejects these
 * with "expected string, received undefined". We pipe the stream through
 * `dropEmptyDeltas` to strip them before merging.
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
        // 4. Iterate the LLM stream, dropping empty delta chunks, and
        //    write each one to the writer. This is what `writer.merge`
        //    does internally for a ReadableStream<UIMessageChunk>.
        //
        //    toUIMessageStream({ sendReasoning: true }) emits the
        //    start/delta/end lifecycle for both text and reasoning parts
        //    (the official AI SDK 7.x pattern — see
        //    https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data and
        //    https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol).
        //
        //    One gotcha: the SDK faithfully forwards empty
        //    reasoning-delta / text-delta / tool-input-delta events
        //    that some providers (MiniMax over Anthropic) emit with no
        //    text. The client-side useChat does strict Zod validation
        //    and throws on these ("expected string, received
        //    undefined"), so we drop them here.
        const source = result.toUIMessageStream({
          sendReasoning: true,
          sendSources: false, // we collect sources ourselves below
          sendFinish: true,
          sendStart: true,
        });

        for await (const chunk of dropEmptyDeltas(source)) {
          writer.write(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            chunk as any
          );
        }
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
