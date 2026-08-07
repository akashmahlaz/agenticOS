// ChatMessage — renders a single message using AI Elements.
//
// Follows the official Vercel AI Elements Chatbot example EXACTLY:
//   https://elements.ai-sdk.dev/examples/chatbot
//   https://elements.ai-sdk.dev/components/chain-of-thought
//   https://elements.ai-sdk.dev/components/reasoning
//   https://elements.ai-sdk.dev/components/sources
//   https://elements.ai-sdk.dev/components/tool
//
// Canonical pattern (per official chatbot example):
//   "We switch on message.parts and render the respective part
//    within Message, Reasoning, and Sources."
//
// The final answer text is rendered as the LAST ChainOfThoughtStep label
// (per the official CoT example where the answer is the step label:
//   label="Hayden Bleasel is an Australian product designer...").

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
  ChainOfThoughtImage,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { Image } from "@/components/ai-elements/image";
import SubAgentActivity, { type SubAgentEvent } from "./subagent-activity";
import ToolPart from "./message-parts/tool-part";
import InlineQuestion from "./inline-question";
import MessageActionBar from "./message-action-bar";
import { BrainIcon, SearchIcon, ImageIcon, WrenchIcon } from "lucide-react";

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
 * Per the official docs:
 *   "If your model outputs discrete, labeled steps (search queries,
 *    tool calls, distinct thought stages), consider using the
 *    Chain of Thought component instead."
 *
 * We detect this when parts contain tool calls, sub-agent events,
 * or source URLs (not just raw reasoning chunks).
 */
function hasDiscreteSteps(
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

  // ── Official Reasoning pattern ────────────────────────────────────────────
  // Per https://elements.ai-sdk.dev/components/reasoning
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reasoningParts = parts.filter((p) => p.type === "reasoning" && typeof p.text === "string");
  const reasoningText = reasoningParts.map((p) => p.text).join("\n\n");
  const hasReasoning = reasoningParts.length > 0;
  const lastPart = parts[parts.length - 1];
  const isReasoningStreaming =
    isLast && isStreaming && lastPart?.type === "reasoning";

  // ── Sub-agent events ─────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Inline questions ──────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inlineQuestions = useMemo<any[]>(() => {
    return parts.filter((p) => p.type === "data-question").map((p) => p.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Text parts ────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textParts = parts.filter((p) => p.type === "text" && typeof p.text === "string");
  const fullText = textParts.map((p) => p.text).join("");

  // ── Discrete steps → ChainOfThought (per official docs) ──────────────────
  // Per https://elements.ai-sdk.dev/components/chain-of-thought:
  //   "If your model outputs discrete, labeled steps (search queries,
  //    tool calls, distinct thought stages), consider using the
  //    Chain of Thought component instead."
  const useCoT = !isUser && hasDiscreteSteps(parts);

  /**
   * Build CoT steps in EXACT official pattern:
   * Each step has:
   *   icon   — SearchIcon / ImageIcon / BrainIcon / WrenchIcon
   *   label  — SHORT description of what the agent is doing
   *   status — "complete" or "active"
   *   children — (optional) search results / images / tool I/O
   *
   * The FINAL ANSWER text is the LAST step's label.
   * Text parts that precede tool calls = "thinking aloud" steps.
   * Text parts at the end = the final answer (rendered as CoT step label).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cotSteps = useMemo<Array<any>>(() => {
    if (!useCoT) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const steps: any[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addTextStep = (text: string, idx: number, isLastStep: boolean) => {
      if (!text) return;
      // Short label: first sentence or first 60 chars
      const firstSentenceEnd = text.indexOf(".");
      const label =
        firstSentenceEnd > 0 && firstSentenceEnd < 80
          ? text.slice(0, firstSentenceEnd + 1)
          : text.slice(0, 60) + (text.length > 60 ? "…" : "");
      steps.push({
        key: `text-${idx}`,
        icon: BrainIcon,
        label,
        description: text, // full text as description
        status: isLastStep && isStreaming ? "active" : "complete",
        children: null,
      });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addToolStep = (p: any, idx: number, isLastStep: boolean) => {
      const toolName = p.toolName ?? p.type.replace(/^tool-/, "");
      steps.push({
        key: `tool-${idx}-${p.toolCallId ?? idx}`,
        icon: WrenchIcon,
        label: `Calling ${toolName}`,
        description:
          p.input != null
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (typeof p.input === "object"
                ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  Object.entries(p.input as any)
                    .slice(0, 2)
                    .map(([k, v]) => `${k}: ${String(v).slice(0, 40)}`)
                    .join(", ")
                : String(p.input).slice(0, 80))
            : undefined,
        status: isLastStep && isStreaming ? "active" : "complete",
        children: null,
      });

      // Tool output → next step showing result
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (p.output !== undefined && p.output !== null) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const outStr: any =
          typeof p.output === "string" ? p.output : JSON.stringify(p.output);
        const truncated =
          typeof outStr === "string" && outStr.length > 150
            ? outStr.slice(0, 150) + "…"
            : outStr;
        steps.push({
          key: `tool-result-${idx}-${p.toolCallId ?? idx}`,
          icon: BrainIcon,
          label: `Result from ${toolName}`,
          description: typeof truncated === "string" ? truncated : undefined,
          status: "complete",
          children: null,
        });
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addSubagentStep = (p: any, idx: number, isLastStep: boolean) => {
      const agent = p.data?.agent ?? "sub-agent";
      const status = p.data?.status ?? "thinking";
      const labelMap: Record<string, string> = {
        start: `Delegated to ${agent}`,
        thinking: `${agent} agent thinking…`,
        tool: `${agent} using ${p.data?.toolName ?? "tool"}`,
        done: `${agent} agent finished`,
        error: `${agent} agent errored`,
      };
      steps.push({
        key: `agent-${idx}`,
        icon: BrainIcon,
        label: labelMap[status] ?? `${agent} agent: ${status}`,
        description: p.data?.task ?? undefined,
        status:
          isLastStep && isStreaming && status === "thinking"
            ? "active"
            : "complete",
        children: null,
      });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addSourceStep = (sources: any[], startIdx: number, isLastStep: boolean) => {
      steps.push({
        key: `sources-${startIdx}`,
        icon: SearchIcon,
        label: `Found ${sources.length} source${sources.length === 1 ? "" : "s"}`,
        description: undefined,
        status: isLastStep && isStreaming ? "active" : "complete",
        children: (
          <ChainOfThoughtSearchResults className="mt-1">
            {sources.map((s, k) => (
              <ChainOfThoughtSearchResult key={`${startIdx}-${k}`}>
                {s.title ?? s.url}
              </ChainOfThoughtSearchResult>
            ))}
          </ChainOfThoughtSearchResults>
        ),
      });
    };

    // ── Main pass: iterate parts in order, build steps ─────────────────────
    let i = 0;
    while (i < parts.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p: any = parts[i];
      const isLastStep = i === parts.length - 1;

      // Skip step-start marker (stream boundary, no UI)
      if (p.type === "step-start") {
        i++;
        continue;
      }

      // Reasoning part → "thinking" step (per official pattern)
      if (p.type === "reasoning" && typeof p.text === "string" && p.text) {
        addTextStep(p.text, i, isLastStep);
        i++;
        continue;
      }

      // Sub-agent event → agent step
      if (p.type === "data-subagent") {
        addSubagentStep(p, i, isLastStep);
        i++;
        continue;
      }

      // Source URLs → "found N sources" step with badges as children
      if (p.type === "source-url") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const consecutive: any[] = [];
        let j = i;
        while (j < parts.length && parts[j].type === "source-url") {
          consecutive.push(parts[j]);
          j++;
        }
        addSourceStep(consecutive, i, isLastStep || j - 1 === parts.length - 1);
        i = j;
        continue;
      }

      // Tool call → "calling X" step + optional result step
      if (
        (typeof p.type === "string" && p.type.startsWith("tool-")) ||
        p.type === "dynamic-tool"
      ) {
        addToolStep(p, i, isLastStep);
        i++;
        continue;
      }

      // Text part
      if (p.type === "text" && typeof p.text === "string" && p.text) {
        // Check if followed by a tool or sub-agent (thinking aloud pattern)
        let nextIdx = i + 1;
        while (nextIdx < parts.length && (parts[nextIdx].type === "step-start" || parts[nextIdx].type === "reasoning")) {
          nextIdx++;
        }
        const nextPart = parts[nextIdx];
        const isFollowedByAction =
          nextPart &&
          ((typeof nextPart.type === "string" &&
            (nextPart.type.startsWith("tool-") ||
              nextPart.type === "dynamic-tool")) ||
            nextPart.type === "data-subagent" ||
            nextPart.type === "source-url");

        if (isFollowedByAction) {
          // "Thinking aloud" before an action → show as a thinking step
          addTextStep(p.text, i, isLastStep);
        } else {
          // Final answer text → the LAST CoT step's label
          addTextStep(p.text, i, isLastStep);
        }
        i++;
        continue;
      }

      i++;
    }

    return steps;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useCoT, isStreaming, isLast, JSON.stringify(parts)]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Message from={message.role}>
      <MessageContent>
        {/* Sub-agent activity panel */}
        {!isUser && subAgentEvents.length > 0 && (
          <SubAgentActivity events={subAgentEvents} isStreaming={isStreaming} />
        )}

        {/* ── Chain of Thought (discrete labeled steps) ──────────────────────
            Per official docs:
              "If your model outputs discrete, labeled steps (search queries,
               tool calls, distinct thought stages), consider using the
               Chain of Thought component instead."
            https://elements.ai-sdk.dev/components/chain-of-thought
        */}
        {!isUser && useCoT && cotSteps.length > 0 && (
          <ChainOfThought defaultOpen className="mb-3 not-prose">
            {/* Official example: <ChainOfThoughtHeader /> with no children
                renders default "Chain of Thought" label */}
            <ChainOfThoughtHeader />
            <ChainOfThoughtContent>
              {cotSteps.map((step) => (
                <ChainOfThoughtStep
                  key={step.key}
                  icon={step.icon}
                  label={step.label}
                  description={step.description}
                  status={step.status}
                >
                  {step.children}
                </ChainOfThoughtStep>
              ))}
            </ChainOfThoughtContent>
          </ChainOfThought>
        )}

        {/* ── Reasoning (single continuous block) ──────────────────────────────
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

        {/* ── Sources (grouped collapsible) ────────────────────────────────────
            Per official example pattern:
              <Sources>
                <SourcesTrigger count={n} />
                {message.parts.filter(...).map(...)}
              </Sources>
            https://elements.ai-sdk.dev/components/sources
            NOTE: Only rendered when NOT using CoT (CoT renders sources
            inline as steps with search result badges).
        */}
        {!isUser && !useCoT && (() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sourceParts = (parts as any[]).filter((p) => p.type === "source-url");
          if (sourceParts.length === 0) return null;
          return (
            <Sources>
              <SourcesTrigger count={sourceParts.length} />
              {sourceParts.map((sp, i) => (
                <SourcesContent key={`src-${i}`}>
                  <Source href={sp.url} title={sp.title ?? sp.url} />
                </SourcesContent>
              ))}
            </Sources>
          );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        })()}

        {/* ── Inline questions (askUser) ────────────────────────────────────── */}
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

        {/* ── Official `switch (part.type)` pattern ────────────────────────────
            Per https://elements.ai-sdk.dev/examples/chatbot:
              "We switch on message.parts and render the respective
               part within Message, Reasoning, and Sources."
        */}
        {parts.map((part, i) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p: any = part;
          switch (p.type) {
            // Text — rendered here UNLESS it's a CoT step (final answer
            // text IS shown as the CoT step label above; thinking aloud
            // text IS absorbed into CoT step descriptions).
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            case "text": {
              if (!p.text) return null;
              // Skip text parts that are absorbed into CoT:
              // - If useCoT is true AND this text is followed by a tool/sub-agent
              //   OR is a reasoning part → it's a CoT step, skip here
              if (useCoT) {
                // Skip reasoning parts (shown in CoT)
                if (reasoningParts.some((rp) => rp === p)) return null;
                // Skip "thinking aloud" text (followed by tool/sub-agent/source)
                let nextIdx = i + 1;
                while (
                  nextIdx < parts.length &&
                  (parts[nextIdx].type === "step-start" ||
                    parts[nextIdx].type === "reasoning")
                ) {
                  nextIdx++;
                }
                const nextPart = parts[nextIdx];
                const isFollowedByAction =
                  nextPart &&
                  ((typeof nextPart.type === "string" &&
                    (nextPart.type.startsWith("tool-") ||
                      nextPart.type === "dynamic-tool")) ||
                    nextPart.type === "data-subagent" ||
                    nextPart.type === "source-url");
                if (isFollowedByAction) return null;
                // Final answer text: ALSO absorbed into CoT (shown as last step label)
                // We only render text here for non-CoT messages
                return null;
              }
              return (
                <MessageResponse key={`text-${message.id}-${i}`}>
                  {p.text}
                </MessageResponse>
              );
            }

            // Reasoning — shown in Reasoning component (or CoT step) above
            case "reasoning":
              return null;

            // Sources — shown in Sources component (or CoT steps) above
            case "source-url":
              return null;

            // Inline data — shown in SubAgentActivity / InlineQuestion above
            case "data-subagent":
            case "data-question":
              return null;

            // Stream step boundary — no UI
            case "step-start":
              return null;

            default:
              // Tool parts
              if (
                (typeof p.type === "string" && p.type.startsWith("tool-")) ||
                p.type === "dynamic-tool"
              ) {
                return <ToolPart key={`tool-${message.id}-${i}`} part={p} />;
              }
              return null;
          }
        })}

        {/* Action bar */}
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
