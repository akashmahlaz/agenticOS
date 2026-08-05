// Chat API — UIMessageStream handler
// Converts the AI SDK streamText output into the UI message stream format
// that the useChat hook understands. Also forwards sub-agent activity,
// memory capture, and learning detection as data-* parts.

import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessageStreamWriter,
} from "ai";
import { onSubAgentProgress } from "@/lib/agents/orchestrator";
import { autoCaptureFromTurn } from "@/lib/memory/manager";
import { captureLearnings } from "@/lib/personalization/self-learning";
import { db } from "@/lib/db";

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

export interface ToolCallRecord {
  toolCallId: string;
  toolName: string;
  input: Record<string, unknown>;
  output?: unknown;
  state: "input-available" | "output-available" | "output-error";
  errorText?: string;
}

/**
 * Build a UIMessageStream response that wraps a streamText result
 * and adds our custom data parts (subagents, memory, learning).
 */
export async function buildUIMessageStream(
  meta: StreamMeta,
  fullStream: AsyncIterable<unknown>
): Promise<Response> {
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const toolCalls: ToolCallRecord[] = [];
      const sources: SourceItem[] = [];

      // Emit the session id right at the start so the client can
      // update the URL via window.history.replaceState (no React re-render).
      if (meta.sessionId) {
        writer.write({
          type: "data-session",
          data: { sessionId: meta.sessionId },
        });
      }

      // Subscribe to sub-agent progress and forward as data parts
      const unsub = onSubAgentProgress((event) => {
        writer.write({
          type: "data-subagent",
          data: event satisfies SubAgentEvent,
        });
      });

      try {
        for await (const chunk of fullStream) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const c = chunk as any;
          await handleStreamChunk(c, writer, toolCalls, sources, meta);
        }
      } finally {
        unsub();

        // Emit accumulated sources
        if (sources.length > 0) {
          writer.write({
            type: "data-sources",
            data: sources,
          });
        }

        // ── Auto-capture memory + learn from this turn ──
        const lastUserMsg = [...meta.messages]
          .reverse()
          .find((m) => m.role === "user");
        if (lastUserMsg) {
          const fullText = ""; // (already streamed; not needed for capture)
          try {
            const [captured, learnings] = await Promise.all([
              autoCaptureFromTurn(
                meta.userId,
                lastUserMsg.content,
                fullText,
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

async function handleStreamChunk(
  c: { type: string; [key: string]: unknown },
  writer: UIMessageStreamWriter,
  toolCalls: ToolCallRecord[],
  sources: SourceItem[],
  _meta: StreamMeta
): Promise<void> {
  switch (c.type) {
    case "text-delta": {
      const delta = (c.text ?? c.delta ?? "") as string;
      if (delta) writer.write({ type: "text-delta", id: "text", delta });
      break;
    }
    case "reasoning-delta":
    case "reasoning-start": {
      const delta = (c.textDelta ?? c.text ?? "") as string;
      if (delta) writer.write({ type: "reasoning-delta", id: "reasoning", delta });
      break;
    }
    case "tool-call": {
      const toolCallId = (c.toolCallId ?? crypto.randomUUID()) as string;
      const toolName = String(c.toolName);
      const input = (c.args ?? c.input ?? {}) as Record<string, unknown>;
      toolCalls.push({ toolCallId, toolName, input, state: "input-available" });
      writer.write({
        type: "tool-input-available",
        toolCallId,
        toolName,
        input,
      });
      break;
    }
    case "tool-result": {
      const toolName = String(c.toolName);
      const tc = toolCalls.find((t) => t.toolName === toolName);
      const toolCallId =
        tc?.toolCallId ?? (c.toolCallId as string) ?? crypto.randomUUID();
      const output = c.output ?? c.result;
      const errorText = c.errorText as string | undefined;

      if (tc) {
        tc.output = output;
        tc.state = errorText ? "output-error" : "output-available";
        tc.errorText = errorText;
      }

      if (errorText) {
        writer.write({
          type: "tool-output-error",
          toolCallId,
          errorText,
        });
      } else {
        writer.write({
          type: "tool-output-available",
          toolCallId,
          output,
        });
      }

      // Collect sources from search tools
      if (toolName === "webSearch" || toolName === "deepResearch" || toolName === "search") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = output as any;
        if (r?.results && Array.isArray(r.results)) {
          sources.push(...r.results);
        } else if (Array.isArray(output)) {
          sources.push(...(output as SourceItem[]));
        }
      }
      break;
    }
    case "finish": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const usage = c.totalUsage as any;
      writer.write({
        type: "data-finish",
        data: {
          finishReason: c.finishReason,
          usage: usage
            ? {
                input: usage.inputTokens ?? 0,
                output: usage.outputTokens ?? 0,
                total: usage.totalTokens ?? 0,
              }
            : null,
        },
      });
      break;
    }
    case "error": {
      writer.write({
        type: "data-error",
        data: { message: String(c.error ?? c.message ?? "Unknown error") },
      });
      break;
    }
    // step-start / step-finish / etc. are handled implicitly by the stream
    default:
      break;
  }
}
