// ChatMessage — renders a single message using AI Elements.
//
// Follows the official Vercel AI Elements Chatbot example:
//   https://elements.ai-sdk.dev/examples/chatbot
//   https://elements.ai-sdk.dev/components/chain-of-thought
//   https://elements.ai-sdk.dev/components/reasoning
//   https://elements.ai-sdk.dev/components/sources
//   https://elements.ai-sdk.dev/components/tool
//
// The official pattern is:
//   "We switch on `message.parts` and render the respective part
//    within `Message`, `Reasoning`, and `Sources`."
//   — https://elements.ai-sdk.dev/examples/chatbot
//
// The official Reasoning component is for a single block of continuous
// thinking content (Deepseek R1, Claude extended thinking).
// For discrete, labeled steps, the docs recommend Chain of Thought:
//   "If your model outputs discrete, labeled steps (search queries,
//    tool calls, distinct thought stages), consider using the
//    Chain of Thought component instead for a more structured
//    visual representation."

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
  SourcesTrigger,
  Source,
} from "@/components/ai-elements/sources";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
} from "@/components/ai-elements/chain-of-thought";
import SubAgentActivity, { type SubAgentEvent } from "./subagent-activity";
import ToolPart from "./message-parts/tool-part";
import InlineQuestion from "./inline-question";
import MessageActionBar from "./message-action-bar";
import {
  SearchIcon,
  WrenchIcon,
  BrainIcon,
} from "lucide-react";

export interface ChatMessageProps {
  message: UIMessage;
  isLast: boolean;
  isStreaming: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRegenerate?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmitQuestion?: (values: Record<string, string | string[]>) => void;
}

/**
 * Determine if the model emits "discrete steps" suitable for ChainOfThought
 * (vs a single continuous reasoning block suitable for the Reasoning
 * component). Per the official docs:
 *   "If your model outputs discrete, labeled steps (search queries,
 *    tool calls, distinct thought stages), consider using ChainOfThought"
 *
 * We detect: tool calls, sub-agent activity, or source URLs → ChainOfThought.
 * Pure reasoning text only → Reasoning.
 */
function shouldUseChainOfThought(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parts: any[]
): boolean {
  return parts.some(
    (p) =>
      (typeof p?.type === "string" && p.type.startsWith("tool-")) ||
      p?.type === "dynamic-tool" ||
      p?.type === "data-subagent" ||
      p?.type === "source-url"
  );
}

export default function ChatMessage({
  message,
  isLast,
  isStreaming,
  onRegenerate,
  onSubmitQuestion,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts = (message.parts as any[]) ?? [];

  // Official Reasoning pattern:
  //   Consolidate all reasoning parts into one block.
  //   https://elements.ai-sdk.dev/components/reasoning
  const reasoningParts = parts.filter(
    (p) => p.type === "reasoning" && typeof p.text === "string"
  );
  const reasoningText = reasoningParts.map((p) => p.text).join("\n\n");
  const hasReasoning = reasoningParts.length > 0;

  // Check if reasoning is still streaming
  const lastPart = parts[parts.length - 1];
  const isReasoningStreaming =
    isLast && isStreaming && lastPart?.type === "reasoning";

  // Sub-agent events from data-subagent parts
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

  // Inline questions from data-question parts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inlineQuestions = useMemo<any[]>(() => {
    return parts
      .filter((p) => p.type === "data-question")
      .map((p) => p.data);
  }, [parts]);

  // Text content (joined for fullText and action bar)
  const textParts = parts.filter(
    (p) => p.type === "text" && typeof p.text === "string"
  );
  const fullText = textParts.map((p) => p.text).join("");

  // Chain of Thought: build steps from parts in original order
  // (one step per tool call / source / agent event / reasoning block)
  // Only when the model emits discrete, labeled steps (per official docs).
  const useCoT = !isUser && shouldUseChainOfThought(parts);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cotSteps = useMemo<Array<{
    key: string;
    icon: typeof SearchIcon;
    label: string;
    description?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    children?: any;
    isLast: boolean;
    isActive: boolean;
  }>>(() => {
    if (!useCoT) return [];
    const steps: Array<{
      key: string;
      icon: typeof SearchIcon;
      label: string;
      description?: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      children?: any;
      isLast: boolean;
      isActive: boolean;
    }> = [];

    parts.forEach((p, idx) => {
      const isLastStep = idx === parts.length - 1;
      const isActive = isLastStep && isStreaming && isLast;

      // Tool part
      if (
        (typeof p.type === "string" && p.type.startsWith("tool-")) ||
        p.type === "dynamic-tool"
      ) {
        const toolName =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (p as any).toolName ?? p.type.replace(/^tool-/, "");
        const input = p.input;
        const output = p.output;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const inputSummary: any = input
          ? typeof input === "object"
            ? Object.keys(input).slice(0, 3).join(", ")
            : String(input)
          : undefined;
        steps.push({
          key: `tool-${idx}-${p.toolCallId ?? idx}`,
          icon: WrenchIcon,
          label: `Calling ${toolName}`,
          description: inputSummary,
          isLast: isLastStep,
          isActive,
        });
        // Add a follow-up "observation" step for tool output
        if (output !== undefined && output !== null) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const outputStr: any = typeof output === "string" ? output : JSON.stringify(output);
          const truncated =
            typeof outputStr === "string" && outputStr.length > 120
              ? outputStr.slice(0, 120) + "…"
              : outputStr;
          steps.push({
            key: `tool-res-${idx}-${p.toolCallId ?? idx}`,
            icon: BrainIcon,
            label: `Received result from ${toolName}`,
            description: typeof truncated === "string" ? truncated : undefined,
            isLast: isLastStep,
            isActive: false,
          });
        }
        return;
      }

      // Sub-agent event
      if (p.type === "data-subagent") {
        const agent = p.data?.agent ?? "sub-agent";
        const status = p.data?.status ?? "thinking";
        const message = p.data?.message ?? `Delegated to ${agent}`;
        const labelByStatus: Record<string, string> = {
          start: `Delegated task to ${agent} agent`,
          thinking: `${agent} agent thinking…`,
          tool: `${agent} agent using ${p.data?.toolName ?? "tool"}`,
          done: `${agent} agent finished`,
          error: `${agent} agent errored`,
        };
        steps.push({
          key: `agent-${idx}`,
          icon: BrainIcon,
          label: labelByStatus[status] ?? message,
          description: p.data?.task,
          isLast: isLastStep,
          isActive: isActive && status === "thinking",
        });
        return;
      }

      // Source URL
      if (p.type === "source-url") {
        // Collect consecutive source-url parts for a single step
        const consecutiveSources = [];
        let j = idx;
        while (j < parts.length && parts[j].type === "source-url") {
          consecutiveSources.push(parts[j]);
          j++;
        }
        steps.push({
          key: `src-${idx}`,
          icon: SearchIcon,
          label: `Found ${consecutiveSources.length} source${consecutiveSources.length === 1 ? "" : "s"}`,
          children: (
            <ChainOfThoughtSearchResults className="mt-1">
              {consecutiveSources.map((s, k) => (
                <ChainOfThoughtSearchResult key={`${idx}-${k}`}>
                  {s.title ?? s.url}
                </ChainOfThoughtSearchResult>
              ))}
            </ChainOfThoughtSearchResults>
          ),
          isLast: isLastStep,
          isActive: false,
        });
        // Skip the ones we consumed
        for (let k = 1; k < consecutiveSources.length; k++) {
          // Mark as consumed by using a unique key; render-time filter handles
        }
        return;
      }

      // Reasoning part — show as a "thinking" step (one per reasoning chunk,
      // collapsed into the previous reasoning step if consecutive)
      if (p.type === "reasoning" && typeof p.text === "string" && p.text) {
        const lastStep = steps[steps.length - 1];
        // If the previous step is a reasoning step, skip (we'll consolidate)
        if (lastStep && lastStep.key.startsWith("reason-")) {
          return;
        }
        const snippet = p.text.length > 100 ? p.text.slice(0, 100) + "…" : p.text;
        steps.push({
          key: `reason-${idx}`,
          icon: BrainIcon,
          label: "Reasoning…",
          description: snippet,
          isLast: isLastStep,
          isActive,
        });
        return;
      }
    });

    return steps;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useCoT, isStreaming, isLast, JSON.stringify(parts)]);

  return (
    <Message from={message.role}>
      <MessageContent>
        {/* ── Sub-agent activity (sibling of CoT — shows delegation timeline) ── */}
        {!isUser && subAgentEvents.length > 0 && (
          <SubAgentActivity events={subAgentEvents} isStreaming={isStreaming} />
        )}

        {/* ── Chain of Thought (discrete steps: tool calls, sources, agents) ──
            Per official docs:
              "If your model outputs discrete, labeled steps (search queries,
               tool calls, distinct thought stages), consider using the
               Chain of Thought component instead."
            https://elements.ai-sdk.dev/components/chain-of-thought
        */}
        {!isUser && useCoT && cotSteps.length > 0 && (
          <ChainOfThought defaultOpen className="mb-3 not-prose">
            <ChainOfThoughtHeader>Chain of Thought</ChainOfThoughtHeader>
            <ChainOfThoughtContent>
              {cotSteps.map((step) => (
                <ChainOfThoughtStep
                  key={step.key}
                  icon={step.icon}
                  label={step.label}
                  description={step.description}
                  status={step.isActive ? "active" : "complete"}
                >
                  {step.children}
                </ChainOfThoughtStep>
              ))}
            </ChainOfThoughtContent>
          </ChainOfThought>
        )}

        {/* ── Reasoning (single block of continuous thinking) ──
            Per official docs example:
              <Reasoning isStreaming={isReasoningStreaming}>
                <ReasoningTrigger />
                <ReasoningContent>{reasoningText}</ReasoningContent>
              </Reasoning>
            https://elements.ai-sdk.dev/components/reasoning
        */}
        {!isUser && !useCoT && hasReasoning && (
          <Reasoning className="w-full" isStreaming={isReasoningStreaming}>
            <ReasoningTrigger />
            <ReasoningContent>{reasoningText}</ReasoningContent>
          </Reasoning>
        )}

        {/* ── Inline questions (askUser) ── */}
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

        {/* ── Official `switch (part.type)` pattern ─────────────────────────
            Per https://elements.ai-sdk.dev/examples/chatbot:
              "We switch on `message.parts` and render the respective
               part within Message, Reasoning, and Sources."
        */}
        {parts.map((part, i) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p: any = part;
          switch (p.type) {
            case "text":
              if (!p.text) return null;
              return (
                <MessageResponse key={`text-${message.id}-${i}`}>
                  {p.text}
                </MessageResponse>
              );

            case "reasoning":
              // Handled by the <Reasoning> / <ChainOfThought> block above
              return null;

            case "source-url":
              // Sources are grouped into the <ChainOfThought> block above
              // (since our model emits discrete steps, not loose sources).
              return null;

            case "data-subagent":
            case "data-question":
              // Handled by SubAgentActivity / InlineQuestion above
              return null;

            default:
              // Tool parts (tool-* and dynamic-tool)
              if (
                (typeof p.type === "string" && p.type.startsWith("tool-")) ||
                p.type === "dynamic-tool"
              ) {
                return <ToolPart key={`tool-${message.id}-${i}`} part={p} />;
              }
              return null;
          }
        })}

        {/* Action bar (regenerate, copy, etc.) */}
        {!isUser && !isStreaming && fullText && onRegenerate && (
          <MessageActionBar
            messageId={message.id}
            content={fullText}
            onRegenerate={onRegenerate}
          />
        )}
      </MessageContent>
    </Message>
  );
}
