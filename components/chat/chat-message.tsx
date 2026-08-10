// ChatMessage — renders a single message using AI Elements.
//
// Follows the exact e3985a9 commit architecture:
//   https://github.com/akashmahlaz/agenticOS/commit/e3985a9
//
// The rendering order is FIXED and SIMPLE (per the official AI Elements
// Chatbot example at https://elements.ai-sdk.dev/examples/chatbot and
// the Chain of Thought example):
//
//   1. SubAgentPanel       (data-subagent events)
//   2. ChainOfThought      (reasoning parts → parsed into steps)
//   3. Sources             (source-url parts, one block)
//   4. ToolPart × N        (each tool-* part as a separate official Tool card)
//   5. InlineQuestion      (data-question events)
//   6. Text                (text parts rendered with custom MarkdownText)
//   7. Action bar          (copy + regenerate)
//
// Tool calls are NOT nested inside CoT. Reasoning is NOT interleaved with
// tools. Each part type has its own section, in the order above. This is
// the official "switch (part.type)" pattern from the docs.

"use client";

import { useMemo } from "react";
import type { UIMessage } from "ai";
import {
  Message,
  MessageContent,
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
import SubAgentActivity, { type SubAgentEvent } from "./subagent-activity";
import ToolPart from "./message-parts/tool-part";
import InlineQuestion from "./inline-question";
import MessageActionBar from "./message-action-bar";
import MarkdownText from "./markdown-text";

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

  // ── Collect sub-agent events (data-subagent parts) ──────────────────────
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

  // ── Inline questions (data-question parts) ──────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inlineQuestions = useMemo<any[]>(() => {
    return parts.filter((p) => p.type === "data-question").map((p) => p.data);
  }, [parts]);

  // ── Reasoning (consolidated from all reasoning parts) ────────────────────
  const reasoningText = useMemo(() => {
    return parts
      .filter((p) => p.type === "reasoning" && typeof p.text === "string")
      .map((p) => p.text)
      .filter(Boolean)
      .join("\n\n");
  }, [parts]);

  // ── Source count (for SourcesTrigger) ────────────────────────────────────
  const sourceCount = useMemo(() => {
    return parts.filter(
      (p) => p.type === "source-url" || p.type === "source-document"
    ).length;
  }, [parts]);

  // ── Reasoning streaming check ───────────────────────────────────────────
  const lastPart = parts[parts.length - 1];
  const isReasoningStreaming =
    isLast && isStreaming && lastPart?.type === "reasoning";

  // ── Final answer text (joined text parts) ────────────────────────────────
  const fullText = useMemo(() => {
    return parts
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text || "")
      .join("");
  }, [parts]);

  // ── Parse reasoning into steps for ChainOfThought (per e3985a9) ─────────
  const reasoningSteps = useMemo(
    () => parseReasoningSteps(reasoningText),
    [reasoningText]
  );

  return (
    <Message from={message.role}>
      <MessageContent>
        {/* 1. SubAgentPanel — sub-agent activity (data-subagent parts) */}
        {!isUser && subAgentEvents.length > 0 && (
          <SubAgentActivity events={subAgentEvents} isStreaming={isStreaming} />
        )}

        {/* 2a. ChainOfThought — when reasoning text parses into steps */}
        {!isUser && reasoningText && reasoningSteps.length > 0 && (
          <ChainOfThought defaultOpen className="mb-3 not-prose">
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

        {/* 2b. Reasoning fallback — when reasoning text is one continuous block */}
        {!isUser && reasoningText && reasoningSteps.length === 0 && (
          <Reasoning className="w-full" isStreaming={isReasoningStreaming}>
            <ReasoningTrigger />
            <ReasoningContent>{reasoningText}</ReasoningContent>
          </Reasoning>
        )}

        {/* 3. Sources — sibling block, one Sources wrapper for all citations */}
        {!isUser && sourceCount > 0 && (
          <Sources>
            <SourcesTrigger count={sourceCount} />
            {parts.map((part, i) => {
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

        {/* 4. Tool calls — each rendered as separate official <ToolPart> */}
        {!isUser &&
          parts.map((part, i) => {
            if (
              typeof part.type === "string" &&
              part.type.startsWith("tool-")
            ) {
              return (
                <ToolPart
                  key={`tool-${message.id}-${i}`}
                  part={part}
                />
              );
            }
            return null;
          })}

        {/* 5. Inline questions (askUser) */}
        {!isUser &&
          inlineQuestions.map((q) => (
            <InlineQuestion
              key={q.id}
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
          ))}

        {/* 6. Text — final answer rendered with custom MarkdownText
            (reliable, no Streamdown failure modes — see markdown-text.tsx) */}
        {parts.map((part, i) => {
          if (part.type === "text" && typeof part.text === "string") {
            if (!part.text) return null;
            return (
              <div key={`text-${message.id}-${i}`} className="text-sm">
                <MarkdownText text={part.text} />
              </div>
            );
          }
          return null;
        })}

        {/* 7. Action bar (regenerate + copy) */}
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
// parseReasoningSteps — converts reasoning text into structured steps
// for ChainOfThought visualization (per e3985a9 pattern)
//
// Pattern recognition:
//   - "Step 1:" / "1." / "1)" → new step
//   - "**Search**" or "searching" → search step
//   - "**Analysis**" or "analyzing" → analysis step
//   - "**Tool**" or "executing" or "tool call" → tool step
//   - other text → append to current step
// ────────────────────────────────────────────────────────────────────────
function parseReasoningSteps(
  text: string
): Array<{ type: string; text: string }> {
  if (!text) return [];

  const steps: Array<{ type: string; text: string }> = [];
  const lines = text.split("\n");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let currentStep: { type: string; text: string } = { type: "thinking", text: "" };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Step number: "Step 1:" or "1." or "1)"
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
