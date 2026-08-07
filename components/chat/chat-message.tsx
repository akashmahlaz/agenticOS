// ChatMessage — renders a single message using AI Elements
// Follows the official AI SDK "switch (part.type)" pattern from
// https://ai-sdk.dev/docs/ai-sdk-ui/chatbot
// and https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence
//
// KEY: Parts are rendered in their ORIGINAL chronological order
// (Thought → Action → Observation → Thought, etc.) — NOT grouped by type.
// This is the ReAct pattern that shows the agent's actual workflow.

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
  SourcesTrigger,
  SourcesContent,
  Source,
} from "@/components/ai-elements/sources";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
} from "@/components/ai-elements/chain-of-thought";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { BrainIcon, SearchIcon, FileTextIcon } from "lucide-react";
import SubAgentPanel, { type SubAgentEvent } from "./subagent";
import ToolPart from "./message-parts/tool-part";
import InlineQuestion from "./inline-question";
import MessageActionBar from "./message-action-bar";

export interface ChatMessageProps {
  message: UIMessage;
  isLast: boolean;
  isStreaming: boolean;
  onRegenerate?: () => void;
  onSubmitQuestion?: (answer: Record<string, string | string[]>) => void;
}

export default function ChatMessage({
  message,
  isLast,
  isStreaming,
  onRegenerate,
  onSubmitQuestion,
}: ChatMessageProps) {
  const isUser = message.role === "user";

  // Collect sub-agent events from data-subagent parts
  const subAgentEvents = useMemo<SubAgentEvent[]>(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (message.parts as any[])
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
  }, [message.parts]);

  // Collect inline questions from data-question parts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inlineQuestions = useMemo<any[]>(() => {
    return (message.parts as any[])
      .filter((p) => p.type === "data-question")
      .map((p) => p.data);
  }, [message.parts]);

  // Group reasoning parts (consecutive ones form one "block")
  // and tools, sources, and text for the OFFICIAL switch (part.type) pattern
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textParts = (message.parts as any[]).filter(
    (p) => p.type === "text" && typeof p.text === "string"
  );
  const fullText = textParts.map((p) => p.text).join("");
  const sourceParts = (message.parts as any[]).filter(
    (p) => p.type === "source-url"
  );

  // Build interleaved steps for ChainOfThought: each part in its
  // chronological order, with reasoning showing its text, tool parts
  // showing tool name, and source parts showing source URLs.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const interleavedSteps = (message.parts as any[])
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => p.type !== "text" && p.type !== "data-subagent" && p.type !== "data-question")
    .map(({ p, idx }, stepIdx) => {
      const isLast = stepIdx === message.parts.length - 1;
      // Reasoning part
      if (p.type === "reasoning") {
        return {
          key: `r-${idx}`,
          kind: "reasoning" as const,
          label: typeof p.text === "string" ? p.text : "Reasoning…",
          type: detectStepType(p.text || ""),
          isActive: isLast && isStreaming,
        };
      }
      // Tool part
      if (typeof p.type === "string" && p.type.startsWith("tool-")) {
        const toolName = p.type.replace(/^tool-/, "");
        return {
          key: `t-${idx}`,
          kind: "tool" as const,
          label: `Used ${toolName}`,
          type: "tool",
          isActive: false,
        };
      }
      // Source part
      if (p.type === "source-url") {
        return {
          key: `s-${idx}`,
          kind: "source" as const,
          label: p.title || p.url,
          url: p.url,
          type: "search",
          isActive: false,
        };
      }
      return null;
    })
    .filter(Boolean) as Array<{
      key: string;
      kind: "reasoning" | "tool" | "source";
      label: string;
      type: string;
      url?: string;
      isActive: boolean;
    }>;

  // Last part check for streaming
  const lastPart = (message.parts as any[])[
    (message.parts as any[]).length - 1
  ];
  const isReasoningStreaming =
    isLast && isStreaming && lastPart?.type === "reasoning";

  return (
    <Message from={message.role}>
      <MessageContent>
        {/* Sub-agent activity panel — always at top */}
        {!isUser && subAgentEvents.length > 0 && (
          <SubAgentPanel events={subAgentEvents} isStreaming={isStreaming} />
        )}

        {/* Interleaved Chain of Thought — ReAct style:
            reasoning → tool → reasoning → tool → source, etc. */}
        {!isUser && interleavedSteps.length > 0 && (
          <ChainOfThought defaultOpen className="mb-3 not-prose">
            <ChainOfThoughtHeader>
              <span className="flex items-center gap-1.5">
                <BrainIcon className="size-3.5" />
                Chain of Thought
              </span>
            </ChainOfThoughtHeader>
            <ChainOfThoughtContent>
              {interleavedSteps.map((step, idx) => (
                <ChainOfThoughtStep
                  key={step.key}
                  icon={getStepIcon(step.type)}
                  label={step.label}
                  status={step.isActive ? "active" : "complete"}
                >
                  {/* If step is a source, render the search results inside */}
                  {step.kind === "source" && step.url && (
                    <ChainOfThoughtSearchResults className="mt-1">
                      <ChainOfThoughtSearchResult>
                        {step.label}
                      </ChainOfThoughtSearchResult>
                    </ChainOfThoughtSearchResults>
                  )}
                </ChainOfThoughtStep>
              ))}
            </ChainOfThoughtContent>
          </ChainOfThought>
        )}

        {/* Fallback Reasoning display (legacy messages without interleaved steps) */}
        {!isUser && interleavedSteps.length === 0 && hasLegacyReasoning(message) && (
          <Reasoning className="w-full" isStreaming={isReasoningStreaming}>
            <ReasoningTrigger />
            <ReasoningContent>
              {extractLegacyReasoningText(message)}
            </ReasoningContent>
          </Reasoning>
        )}

        {/* Sources — grouped sibling block (per official pattern) */}
        {!isUser && sourceParts.length > 0 && (
          <Sources>
            <SourcesTrigger count={sourceParts.length} />
            {sourceParts.map((part, i) => (
              <SourcesContent key={`src-${message.id}-${i}`}>
                <Source
                  key={`s-${message.id}-${i}`}
                  href={part.url}
                  title={part.title ?? part.url}
                />
              </SourcesContent>
            ))}
          </Sources>
        )}

        {/* Tool calls — official Tool component per docs */}
        {!isUser &&
          (message.parts as any[]).map((part, i) => {
            if (typeof part.type === "string" && part.type.startsWith("tool-")) {
              return (
                <ToolPart
                  key={`tool-${message.id}-${i}`}
                  part={part}
                />
              );
            }
            return null;
          })}

        {/* Inline questions (askUser) */}
        {!isUser &&
          inlineQuestions.map((q) => (
            <InlineQuestion
              key={q.id}
              question={{
                id: q.id,
                prompt: q.prompt,
                fields: (q.fields ?? []).map((f: any) => ({
                  name: f.key,
                  label: f.label,
                  type: f.type,
                  options: f.options?.map((o: any) =>
                    typeof o === "string" ? o : o.label
                  ),
                  required: f.required,
                })),
              }}
              onSubmit={(values) => onSubmitQuestion?.(values)}
              disabled={!isLast || isStreaming}
            />
          ))}

        {/* Text content (rendered last, after all reasoning/tools/sources) */}
        {textParts.map((part, i) => {
          const text = part.text;
          if (!text) return null;
          return (
            <MessageResponse key={`text-${message.id}-${i}`}>
              {text}
            </MessageResponse>
          );
        })}

        {/* Action bar */}
        {!isUser && !isStreaming && fullText && onRegenerate && (
          <MessageActionBar
            messageId={message.id}
            content={fullText}
            onRegenerate={onRegenerate}
          />
        )}

        {/* Thinking shimmer while waiting for first chunk */}
        {isUser && isLast && isStreaming && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shimmer duration={1.2}>Thinking…</Shimmer>
          </div>
        )}
      </MessageContent>
    </Message>
  );
}

// Helpers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasLegacyReasoning(message: UIMessage): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (message.parts as any[]).some(
    (p) => p.type === "reasoning" && typeof p.text === "string" && p.text.length > 0
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractLegacyReasoningText(message: UIMessage): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (message.parts as any[])
    .filter((p) => p.type === "reasoning" && typeof p.text === "string")
    .map((p) => p.text)
    .join("\n\n");
}

function detectStepType(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("search") || lower.includes("finding")) return "search";
  if (lower.includes("analyz") || lower.includes("consider")) return "analysis";
  if (lower.includes("tool") || lower.includes("execut") || lower.includes("call"))
    return "tool";
  if (
    lower.includes("generat") ||
    lower.includes("creat") ||
    lower.includes("synthes")
  )
    return "synthesis";
  if (lower.includes("verif") || lower.includes("check") || lower.includes("confirm"))
    return "verification";
  return "thinking";
}

function getStepIcon(type: string) {
  switch (type) {
    case "search":
      return SearchIcon;
    case "tool":
      return FileTextIcon;
    default:
      return BrainIcon;
  }
}
