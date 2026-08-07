// ChatMessage — renders a single message using AI Elements.
//
// Follows the official Vercel AI Elements CoT example EXACTLY:
//   https://elements.ai-sdk.dev/components/chain-of-thought
//
// Official pattern from the example:
//   <ChainOfThought defaultOpen>
//     <ChainOfThoughtHeader />
//     <ChainOfThoughtContent>
//       <ChainOfThoughtStep
//         icon={SearchIcon}
//         label="Searching for profiles for Hayden Bleasel"
//         status="complete"
//       >
//         <ChainOfThoughtSearchResults>
//           <ChainOfThoughtSearchResult>x.com</ChainOfThoughtSearchResult>
//         </ChainOfThoughtSearchResults>
//       </ChainOfThoughtStep>
//       <ChainOfThoughtStep
//         label="Hayden Bleasel is an Australian..."  ← THE ANSWER
//         status="complete"
//       />
//       <ChainOfThoughtStep
//         icon={SearchIcon}
//         label="Searching for recent work..."
//         status="active"
//       >
//         <ChainOfThoughtSearchResults>...</ChainOfThoughtSearchResults>
//       </ChainOfThoughtStep>
//     </ChainOfThoughtContent>
//   </ChainOfThought>
//
// Key rules from the official example:
//   1. Each step = ONE action with a SHORT label
//   2. children = the OUTPUT of that action (badges, image, tool output)
//   3. Final answer = last step's label (no icon, no children)
//   4. The "active" step is the one currently happening
//
// Per https://elements.ai-sdk.dev/components/reasoning:
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
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { CodeBlock } from "@/components/ai-elements/code-block";
import SubAgentActivity, { type SubAgentEvent } from "./subagent-activity";
import InlineQuestion from "./inline-question";
import MessageActionBar from "./message-action-bar";
import {
  BrainIcon,
  SearchIcon,
  WrenchIcon,
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
 * Per official docs:
 *   "If your model outputs discrete, labeled steps (search queries,
 *    tool calls, distinct thought stages), consider using the
 *    Chain of Thought component instead."
 *
 * Use CoT when: tool calls, sub-agent events, or source URLs present.
 * Use Reasoning when: pure continuous thinking text.
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

/**
 * Shorten a text to a label-friendly version: first sentence, or first 60 chars.
 * Mirrors the pattern in the official CoT example labels.
 */
function shortenLabel(text: string, max = 70): string {
  if (!text) return "";
  // Try first sentence
  const sentenceEnd = text.search(/[.!?]\s/);
  if (sentenceEnd > 0 && sentenceEnd < max) {
    return text.slice(0, sentenceEnd + 1);
  }
  return text.length > max ? text.slice(0, max) + "…" : text;
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

  // ── Reasoning parts (per official Reasoning pattern) ──────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reasoningParts = parts.filter(
    (p) => p.type === "reasoning" && typeof p.text === "string"
  );
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
  const textParts = parts.filter(
    (p) => p.type === "text" && typeof p.text === "string"
  );
  const fullText = textParts.map((p) => p.text).join("");

  // ── Use CoT when there are discrete steps (tools, sub-agents, sources) ────
  const useCoT = !isUser && hasDiscreteSteps(parts);

  // ── Build CoT steps in EXACT official pattern ─────────────────────────────
  // Each step = ONE action:
  //   label   = short description of what the agent is doing
  //   icon    = SearchIcon / WrenchIcon / BrainIcon / UserIcon
  //   status  = "complete" | "active"
  //   children = the OUTPUT of that action (badges / image / tool output)
  //
  // Pattern: thinking text + tool call = ONE step (thinking as label, tool as children)
  // Final answer (text not followed by tool) = LAST step's label
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cotSteps = useMemo<Array<any>>(() => {
    if (!useCoT) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const steps: any[] = [];

    // ── Helpers to build step content ──────────────────────────────────────

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolChildren = (p: any) => {
      const toolName = p.toolName ?? p.type.replace(/^tool-/, "");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const input: any = p.input;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const output: any = p.output;
      return (
        <div className="mt-1 space-y-2 text-xs">
          {input != null && (
            <div>
              <div className="text-muted-foreground mb-1">Input</div>
              <CodeBlock
                code={JSON.stringify(input, null, 2)}
                language="json"
              />
            </div>
          )}
          {output != null && (
            <div>
              <div className="text-muted-foreground mb-1">Output</div>
              {typeof output === "string" ? (
                <MessageResponse>{output}</MessageResponse>
              ) : (
                <CodeBlock
                  code={JSON.stringify(output, null, 2)}
                  language="json"
                />
              )}
            </div>
          )}
        </div>
      );
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subagentChildren = (p: any) => {
      const task = p.data?.task;
      const result = p.data?.result;
      return (
        <div className="mt-1 space-y-2 text-xs">
          {task && (
            <div>
              <div className="text-muted-foreground mb-1">Task</div>
              <MessageResponse>{task}</MessageResponse>
            </div>
          )}
          {result && (
            <div>
              <div className="text-muted-foreground mb-1">Result</div>
              <MessageResponse>
                {typeof result === "string"
                  ? result
                  : JSON.stringify(result, null, 2)}
              </MessageResponse>
            </div>
          )}
        </div>
      );
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sourceChildren = (sources: any[]) => (
      <ChainOfThoughtSearchResults className="mt-1">
        {sources.map((s, k) => (
          <ChainOfThoughtSearchResult key={k}>
            {s.title ?? s.url}
          </ChainOfThoughtSearchResult>
        ))}
      </ChainOfThoughtSearchResults>
    );

    // ── Main pass: group parts into "action blocks" ─────────────────────────
    //
    // An "action block" is: [thinking text] → [tool / source / sub-agent]
    // If there's no following action, the text IS the final answer.

    let i = 0;
    while (i < parts.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p: any = parts[i];

      // Skip stream step boundary
      if (p.type === "step-start") {
        i++;
        continue;
      }

      // Skip data parts — handled by SubAgentActivity / InlineQuestion
      if (p.type === "data-subagent" || p.type === "data-question") {
        i++;
        continue;
      }

      // Reasoning part → ONE step with full text as label + description
      if (p.type === "reasoning" && typeof p.text === "string" && p.text) {
        const isLastStep = i === parts.length - 1;
        steps.push({
          key: `reasoning-${i}`,
          icon: BrainIcon,
          label: shortenLabel(p.text),
          description: p.text.length > 70 ? p.text : undefined,
          status: isLastStep && isStreaming ? "active" : "complete",
          children: null,
        });
        i++;
        continue;
      }

      // Tool part → ONE step
      if (
        (typeof p.type === "string" && p.type.startsWith("tool-")) ||
        p.type === "dynamic-tool"
      ) {
        const toolName = p.toolName ?? p.type.replace(/^tool-/, "");
        // Check if previous part was a text/reasoning "thinking" part
        const prev = i > 0 ? parts[i - 1] : null;
        const hasPrevThinking =
          prev &&
          ((prev.type === "text" && typeof prev.text === "string") ||
            prev.type === "reasoning");
        const thinkingText =
          hasPrevThinking && prev.type === "text" ? prev.text : null;
        const thinkingReason =
          hasPrevThinking && prev.type === "reasoning" ? prev.text : null;

        const isLastStep = i === parts.length - 1;
        const label = thinkingText
          ? shortenLabel(thinkingText)
          : thinkingReason
            ? shortenLabel(thinkingReason)
            : `Calling ${toolName}`;

        steps.push({
          key: `tool-${i}-${p.toolCallId ?? i}`,
          icon: thinkingText || thinkingReason ? BrainIcon : WrenchIcon,
          label,
          description: undefined,
          status: isLastStep && isStreaming ? "active" : "complete",
          children: toolChildren(p),
        });
        i++;
        continue;
      }

      // Source URLs → ONE step with badges as children
      if (p.type === "source-url") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const consecutive: any[] = [];
        let j = i;
        while (j < parts.length && parts[j].type === "source-url") {
          consecutive.push(parts[j]);
          j++;
        }
        const isLastStep = j - 1 === parts.length - 1;
        // Use previous text/reasoning as label if any
        const prev = i > 0 ? parts[i - 1] : null;
        const hasPrevThinking =
          prev &&
          ((prev.type === "text" && typeof prev.text === "string") ||
            prev.type === "reasoning");
        const label = hasPrevThinking
          ? shortenLabel(
              prev.type === "text" ? prev.text : prev.text
            )
          : `Found ${consecutive.length} source${consecutive.length === 1 ? "" : "s"}`;

        steps.push({
          key: `sources-${i}`,
          icon: SearchIcon,
          label,
          description: undefined,
          status: isLastStep && isStreaming ? "active" : "complete",
          children: sourceChildren(consecutive),
        });
        i = j;
        continue;
      }

      // Text part
      if (p.type === "text" && typeof p.text === "string" && p.text) {
        // Check if next non-trivial part is an action (tool/source/sub-agent)
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

        if (isFollowedByAction) {
          // "Thinking aloud" before an action → SKIP here, the action's
          // step will use this text as its label.
          i++;
          continue;
        }

        // Final answer → last step, no icon (per official example
        // step 3: label="Hayden Bleasel is an Australian..." no icon)
        steps.push({
          key: `answer-${i}`,
          icon: undefined, // no icon for final answer
          label: p.text, // FULL text as label, just like the official example
          description: undefined,
          status: isLast && isStreaming ? "active" : "complete",
          children: null,
        });
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

        {/* ── Chain of Thought (EXACT official pattern) ──────────────────────
            https://elements.ai-sdk.dev/components/chain-of-thought
            <ChainOfThought defaultOpen>
              <ChainOfThoughtHeader />     ← no children, default label
              <ChainOfThoughtContent>
                <ChainOfThoughtStep icon={X} label="..." status="...">
                  {output as children}      ← badges, image, tool output
                </ChainOfThoughtStep>
              </ChainOfThoughtContent>
            </ChainOfThought>
        */}
        {!isUser && useCoT && cotSteps.length > 0 && (
          <ChainOfThought defaultOpen className="mb-3 not-prose">
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

        {/* ── Reasoning (single continuous block, per official docs) ─────────
            Per https://elements.ai-sdk.dev/components/reasoning:
            "If your model outputs discrete, labeled steps (search queries,
             tool calls, distinct thought stages), consider using the
             Chain of Thought component instead."
            So we use Reasoning ONLY when there are no discrete steps.
        */}
        {!isUser && !useCoT && hasReasoning && (
          <Reasoning className="w-full" isStreaming={isReasoningStreaming}>
            <ReasoningTrigger />
            <ReasoningContent>{reasoningText}</ReasoningContent>
          </Reasoning>
        )}

        {/* ── Sources (per official Sources pattern, only when NOT using CoT) ──
            https://elements.ai-sdk.dev/components/sources
            When CoT is active, sources are inside CoT step children.
        */}
        {!isUser &&
          !useCoT &&
          (() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sourceParts = (parts as any[]).filter(
              (p) => p.type === "source-url"
            );
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

        {/* ── Inline questions ─────────────────────────────────────────────── */}
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

        {/* ── Official `switch (part.type)` pattern (per Chatbot example) ──────
            Per https://elements.ai-sdk.dev/examples/chatbot:
              "We switch on message.parts and render the respective
               part within Message, Reasoning, and Sources."
            For CoT messages, ALL parts are absorbed into CoT steps above,
            so this switch only renders content for non-CoT messages.
        */}
        {parts.map((part, i) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p: any = part;

          // For CoT messages, everything is handled in the CoT block above
          if (useCoT) return null;

          switch (p.type) {
            case "text":
              if (!p.text) return null;
              return (
                <MessageResponse key={`text-${message.id}-${i}`}>
                  {p.text}
                </MessageResponse>
              );

            // Reasoning handled by Reasoning component above
            case "reasoning":
              return null;

            // Sources handled by Sources component above
            case "source-url":
              return null;

            // Inline data handled by SubAgentActivity / InlineQuestion
            case "data-subagent":
            case "data-question":
              return null;

            // Stream step boundary — no UI
            case "step-start":
              return null;

            default:
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
