// ChatMessage — renders a single message using AI Elements
// Follows the official AI Elements "switch (part.type)" pattern from
// https://elements.ai-sdk.dev/docs/usage
// and the chatbot example at
// https://elements.ai-sdk.dev/examples/chatbot
//
// Renders, in order, for assistant messages:
//   1. SubAgentPanel (data-subagent events)
//   2. ChainOfThought (reasoning parts)
//   3. Sources (source-url parts) — sibling of Message per docs
//   4. Tool (tool-* parts) — official Tool component
//   5. InlineQuestion (data-question events)
//   6. Text (text parts) — MessageResponse
//   7. Action bar (after streaming finishes)

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

  // Collect sub-agent events from data-subagent parts
  const subAgentEvents = useMemo<SubAgentEvent[]>(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (message.parts as AnyPart[])
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
    return (message.parts as AnyPart[])
      .filter((p) => p.type === "data-question")
      .map((p) => p.data);
  }, [message.parts]);

  // Consolidate reasoning parts
  const reasoningText = useMemo(() => {
    return (message.parts as AnyPart[])
      .filter((p) => p.type === "reasoning")
      .map((p) => p.text)
      .filter(Boolean)
      .join("\n\n");
  }, [message.parts]);

  // Count source-url parts
  const sourceCount = useMemo(() => {
    return (message.parts as AnyPart[]).filter(
      (p) => p.type === "source-url" || p.type === "source-document"
    ).length;
  }, [message.parts]);

  // Check if reasoning is currently streaming
  const lastPart = (message.parts as AnyPart[])[
    (message.parts as AnyPart[]).length - 1
  ];
  const isReasoningStreaming =
    isLast && isStreaming && lastPart?.type === "reasoning";

  // Text content for action bar
  const fullText = useMemo(() => {
    return (message.parts as AnyPart[])
      .filter((p) => p.type === "text")
      .map((p) => p.text || "")
      .join("");
  }, [message.parts]);

  const reasoningSteps = parseReasoningSteps(reasoningText);

  return (
    <Message from={message.role}>
      <MessageContent>
        {/* Sub-agent activity panel */}
        {!isUser && subAgentEvents.length > 0 && (
          <SubAgentPanel events={subAgentEvents} isStreaming={isStreaming} />
        )}

        {/* Chain of Thought */}
        {!isUser && reasoningText && reasoningSteps.length > 0 && (
          <ChainOfThought defaultOpen className="mb-3">
            <ChainOfThoughtHeader>
              <span className="flex items-center gap-1.5">
                <BrainIcon className="size-3.5" />
                Chain of Thought
              </span>
            </ChainOfThoughtHeader>
            <ChainOfThoughtContent>
              {reasoningSteps.map((step, idx) => (
                <ChainOfThoughtStep
                  key={idx}
                  icon={getStepIcon(step.type)}
                  label={step.text}
                  status={
                    idx === reasoningSteps.length - 1 && isReasoningStreaming
                      ? "active"
                      : "complete"
                  }
                />
              ))}
            </ChainOfThoughtContent>
          </ChainOfThought>
        )}

        {/* Fallback Reasoning display */}
        {!isUser && reasoningText && reasoningSteps.length === 0 && (
          <Reasoning className="w-full" isStreaming={isReasoningStreaming}>
            <ReasoningTrigger />
            <ReasoningContent>{reasoningText}</ReasoningContent>
          </Reasoning>
        )}

        {/* Sources — sibling block, placed before MessageResponse per official pattern */}
        {!isUser && sourceCount > 0 && (
          <Sources>
            <SourcesTrigger count={sourceCount} />
            {(message.parts as AnyPart[]).map((part, i) => {
              if (part.type === "source-url") {
                return (
                  <SourcesContent key={`src-${message.id}-${i}`}>
                    <Source
                      key={`s-${message.id}-${i}`}
                      href={part.url}
                      title={part.title ?? part.url}
                    />
                  </SourcesContent>
                );
              }
              return null;
            })}
          </Sources>
        )}

        {/* Tool calls — official Tool component per docs */}
        {!isUser &&
          (message.parts as AnyPart[]).map((part, i) => {
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
                fields: (q.fields ?? []).map((f: AnyPart) => ({
                  name: f.key,
                  label: f.label,
                  type: f.type,
                  options: f.options?.map((o: AnyPart) =>
                    typeof o === "string" ? o : o.label
                  ),
                  required: f.required,
                })),
              }}
              onSubmit={(values) => onSubmitQuestion?.(values)}
              disabled={!isLast || isStreaming}
            />
          ))}

        {/* Text content */}
        {(message.parts as AnyPart[]).map((part, i) => {
          if (part.type === "text") {
            const text = part.text;
            if (!text) return null;
            return (
              <MessageResponse key={`text-${message.id}-${i}`}>
                {text}
              </MessageResponse>
            );
          }
          return null;
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

// Parse reasoning text into structured steps for Chain of Thought
function parseReasoningSteps(text: string): Array<{ type: string; text: string }> {
  if (!text) return [];

  const steps: Array<{ type: string; text: string }> = [];
  const lines = text.split("\n");
  let currentStep = { type: "thinking", text: "" };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (
      trimmed.match(/^(Step \d+[:.]|Step \d+)/i) ||
      trimmed.match(/^\d+[\.\)]\s/)
    ) {
      if (currentStep.text) steps.push(currentStep);
      const type = detectStepType(trimmed);
      currentStep = { type, text: trimmed };
    } else if (trimmed.match(/search(ing|ed)?/i)) {
      if (currentStep.text) steps.push(currentStep);
      currentStep = { type: "search", text: trimmed };
    } else if (trimmed.match(/analyz(e|ing)/i)) {
      if (currentStep.text) steps.push(currentStep);
      currentStep = { type: "analysis", text: trimmed };
    } else if (trimmed.match(/execut(e|ing|ion)|tool call/i)) {
      if (currentStep.text) steps.push(currentStep);
      currentStep = { type: "tool", text: trimmed };
    } else if (currentStep.text) {
      currentStep.text += " " + trimmed;
    } else {
      currentStep.text = trimmed;
    }
  }

  if (currentStep.text) steps.push(currentStep);
  if (steps.length === 0 && text) {
    steps.push({ type: "thinking", text: text.slice(0, 500) });
  }
  return steps;
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
