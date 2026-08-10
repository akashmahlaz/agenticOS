// ChatMessage — renders a single message using AI Elements.
//
// The official AI SDK 4.2 / AI Elements pattern (per
// https://ai-sdk.dev/docs/ai-sdk-ui/chatbot and
// https://elements.ai-sdk.dev/examples/chatbot):
//
//   "We switch on message.parts and render the respective part
//    within Message, Reasoning, and Sources."
//   "The parts property supports different message types, including
//    text, tool invocation, and tool result, and allows for more
//    flexible and complex chat UIs."
//   "Previously, useChat stored different output types separately,
//    which made it challenging to maintain the correct sequence in
//    your UI when these elements were interleaved in a response.
//    The new message parts approach replaces separate properties
//    with an ordered array that preserves the exact sequence."
//
// The official example is just:
//   message.parts.map((part, i) => {
//     switch (part.type) {
//       case "text": return <MessageResponse key={i}>{part.text}</MessageResponse>;
//       case "reasoning": return <Reasoning>{part.text}</Reasoning>;
//       case "tool-X": return <ToolPart part={part} />;
//       // etc.
//     }
//   })
//
// This is DYNAMIC — the order matches what the AI emits. If the AI
// thinks, gives text, thinks again, and gives more text, that's
// exactly what the UI shows. No fixed order, no consolidation.

"use client";

import { useMemo } from "react";
import type { UIMessage } from "ai";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Sources,
  SourcesContent,
  Source,
} from "@/components/ai-elements/sources";
import { Shimmer } from "@/components/ai-elements/shimmer";
import SubAgentActivity, { type SubAgentEvent } from "./subagent-activity";
import ToolPart from "./message-parts/tool-part";
import InlineQuestion from "./inline-question";
import MessageActionBar from "./message-action-bar";

export interface ChatMessageProps {
  message: UIMessage;
  isLast: boolean;
  isStreaming: boolean;
  onRegenerate?: () => void;
  onSubmitQuestion?: (values: Record<string, string | string[]>) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPart = any;

export default function ChatMessage({
  message,
  isLast,
  isStreaming,
  onRegenerate,
  onSubmitQuestion,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts = (message.parts as AnyPart[]) ?? [];

  // Sub-agent events from data-subagent parts (used in inline rendering)
  const subAgentEvents = useMemo<SubAgentEvent[]>(() => {
    return parts
      .filter((p) => p.type === "data-subagent")
      .map((p, i) => ({
        agent: p.data?.agent ?? "unknown",
        task: p.data?.task ?? "",
        status: (p.data?.status ?? "thinking") as SubAgentEvent["status"],
        message: p.data?.message ?? "",
        toolName: p.data?.toolName,
        result: p.data?.result,
        durationMs: p.data?.durationMs,
        ts: i,
      }));
  }, [parts]);

  // Inline questions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inlineQuestions = useMemo<any[]>(() => {
    return parts.filter((p) => p.type === "data-question").map((p) => p.data);
  }, [parts]);

  // Full text for the action bar (regenerate button)
  const fullText = useMemo(() => {
    return parts
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text || "")
      .join("");
  }, [parts]);

  // Reasoning streaming check: is the current part a reasoning part?
  const lastPart = parts[parts.length - 1];
  const isReasoningStreaming =
    isLast && isStreaming && lastPart?.type === "reasoning";

  return (
    <Message from={message.role}>
      <MessageContent>
        {/* ── Sub-agent activity panel (sibling, separate from parts loop) ── */}
        {!isUser && subAgentEvents.length > 0 && (
          <SubAgentActivity events={subAgentEvents} isStreaming={isStreaming} />
        )}

        {/* ── Official "switch (part.type)" pattern ─────────────────────────
            Per https://ai-sdk.dev/docs/ai-sdk-ui/chatbot:
            "We switch on message.parts and render the respective
             part within Message, Reasoning, and Sources."

            The order is DYNAMIC — matches the AI's actual emission order.
            If AI thinks → text → thinks → tool → text, that's exactly
            what renders, in that order.
        */}
        {parts.map((part, i) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p: AnyPart = part;

          // Reasoning — render inline with streaming indicator
          if (p.type === "reasoning" && typeof p.text === "string" && p.text) {
            const isLastReasoningPart = i === parts.length - 1;
            return (
              <Reasoning
                key={`reasoning-${message.id}-${i}`}
                className="w-full not-prose"
                isStreaming={
                  isLast && isStreaming && isLastReasoningPart
                    ? true
                    : isReasoningStreaming
                }
              >
                <ReasoningTrigger />
                <ReasoningContent>{p.text}</ReasoningContent>
              </Reasoning>
            );
          }

          // Text — rendered with AI Elements MessageResponse (uses Streamdown)
          if (p.type === "text" && typeof p.text === "string" && p.text) {
            return (
              <MessageResponse key={`text-${message.id}-${i}`}>
                {p.text}
              </MessageResponse>
            );
          }

          // Tool invocations — official <Tool> component with state badge
          if (
            (typeof p.type === "string" && p.type.startsWith("tool-")) ||
            p.type === "dynamic-tool"
          ) {
            return (
              <ToolPart key={`tool-${message.id}-${i}`} part={p} />
            );
          }

          // Source URLs — handled by SourceGrouper below (single Sources block)
          if (p.type === "source-url") return null;

          // Inline questions (askUser)
          if (p.type === "data-question") {
            const q = p.data;
            return (
              <InlineQuestion
                key={`q-${message.id}-${q?.id ?? i}`}
                question={{
                  id: q.id,
                  prompt: q.prompt,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  fields: (q.fields ?? []).map((f: any) => ({
                    name: f.key,
                    label: f.label,
                    type: f.type,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    options: f.options?.map((o: any) =>
                      typeof o === "string" ? o : o.label
                    ),
                    required: f.required,
                  })),
                }}
                onSubmit={(values) => onSubmitQuestion?.(values)}
                disabled={!isLast || isStreaming}
              />
            );
          }

          // data-subagent — handled by SubAgentActivity above, skip here
          if (p.type === "data-subagent") return null;

          // Stream step boundary — no UI
          if (p.type === "step-start") return null;

          // Unknown part type — skip
          return null;
        })}

        {/* ── Sources — group consecutive source-url parts into one Sources block ──
            Per official Sources pattern:
            <Sources>
              <SourcesTrigger count={n} />
              {parts.map(...)}
            </Sources>
            We use a small wrapper to group consecutive sources that come from
            a tool call (e.g. a web search).
        */}
        {!isUser && parts.some((p) => p.type === "source-url") && (
          <SourceGrouper parts={parts} messageId={message.id} />
        )}

        {/* ── Action bar ───────────────────────────────────────────────── */}
        {!isUser && !isStreaming && fullText && onRegenerate && (
          <MessageActionBar
            messageId={message.id}
            content={fullText}
            onRegenerate={onRegenerate}
          />
        )}

        {/* Thinking shimmer while user waits for AI first chunk */}
        {isUser && isLast && isStreaming && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shimmer duration={1.2}>Thinking…</Shimmer>
          </div>
        )}
      </MessageContent>
    </Message>
  );
}

// ────────────────────────────────────────────────────────────────────────
// SourceGrouper — collects all source-url parts and renders them in a
// collapsible <Sources> block (per the official Sources component pattern)
// ────────────────────────────────────────────────────────────────────────
function SourceGrouper({
  parts,
  messageId,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parts: any[];
  messageId: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sourceParts = parts.filter((p: any) => p.type === "source-url");
  if (sourceParts.length === 0) return null;
  return (
    <Sources className="not-prose mt-2">
      {sourceParts.map((sp: any, i: number) => (
        <SourcesContent key={`src-${messageId}-${i}`}>
          <Source href={sp.url} title={sp.title ?? sp.url} />
        </SourcesContent>
      ))}
    </Sources>
  );
}
