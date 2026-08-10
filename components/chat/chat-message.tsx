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
import SubAgentActivity, { type SubAgentEvent } from "./subagent-activity";
import ToolPart from "./message-parts/tool-part";
import InlineQuestion from "./inline-question";
import MessageActionBar from "./message-action-bar";
import MarkdownText from "./markdown-text";
import {
  BrainIcon,
  SearchIcon,
  WrenchIcon,
  CalculatorIcon,
  GlobeIcon,
  DatabaseIcon,
  CodeIcon,
  FileTextIcon,
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

/**
 * Map a tool name to the right lucide icon (per the patterns in your commit
 * f8ad7d7). Tool names are matched against keywords to pick an appropriate icon.
 */
function iconForToolName(toolName: string) {
  const lower = toolName.toLowerCase();
  // Search / web
  if (
    lower.includes("search") ||
    lower.includes("websearch") ||
    lower.includes("google") ||
    lower.includes("bing")
  )
    return SearchIcon;
  // Browse / fetch URL
  if (
    lower.includes("browser") ||
    lower.includes("fetchurl") ||
    lower.includes("browse") ||
    lower.includes("delegate") ||
    lower.includes("scrap") ||
    lower.includes("crawl")
  )
    return GlobeIcon;
  // Calculator / math
  if (
    lower.includes("calc") ||
    lower.includes("math") ||
    lower.includes("compute")
  )
    return CalculatorIcon;
  // Database / query
  if (
    lower.includes("database") ||
    lower.includes("query") ||
    lower.includes("sql") ||
    lower.includes("db_")
  )
    return DatabaseIcon;
  // Code / exec / shell
  if (
    lower.includes("code") ||
    lower.includes("exec") ||
    lower.includes("shell") ||
    lower.includes("bash") ||
    lower.includes("command")
  )
    return CodeIcon;
  // File operations
  if (
    lower.includes("file") ||
    lower.includes("readfile") ||
    lower.includes("writefile") ||
    lower.includes("open")
  )
    return FileTextIcon;
  // Sub-agents (delegate to researcher, coder, etc.)
  if (lower.startsWith("delegateto") || lower.includes("agent"))
    return BrainIcon;
  // Default: wrench
  return WrenchIcon;
}

/**
 * Auto-detect an icon from a reasoning text (per the patterns in your commit
 * f8ad7d7 — detectStepIcon). Looks for keywords to choose the right icon.
 */
function iconForText(text: string) {
  const lower = text.toLowerCase();
  if (
    lower.includes("search") ||
    lower.includes("look up") ||
    lower.includes("find ") ||
    lower.includes("look for")
  )
    return SearchIcon;
  if (
    lower.includes("calculat") ||
    lower.includes("math") ||
    lower.includes("compute")
  )
    return CalculatorIcon;
  if (
    lower.includes("fetch") ||
    lower.includes("read") ||
    lower.includes("browse") ||
    lower.includes("visit")
  )
    return GlobeIcon;
  if (
    lower.includes("databas") ||
    lower.includes("query") ||
    lower.includes("sql")
  )
    return DatabaseIcon;
  if (
    lower.includes("code") ||
    lower.includes("exec") ||
    lower.includes("run a command")
  )
    return CodeIcon;
  if (lower.includes("file") || lower.includes("open"))
    return FileTextIcon;
  if (
    lower.includes("tool") ||
    lower.includes("call") ||
    lower.includes("execute")
  )
    return WrenchIcon;
  return BrainIcon;
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

    // (Tool details are rendered as sibling <ToolPart> components below,
    // not inside CoT step children — per commit e3985a9 and the official
    // Tool pattern at https://elements.ai-sdk.dev/components/tool)

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
          // Auto-detect icon from reasoning text (per f8ad7d7 pattern)
          icon: iconForText(p.text),
          label: shortenLabel(p.text),
          description: p.text.length > 70 ? p.text : undefined,
          status: isLastStep && isStreaming ? "active" : "complete",
          children: null,
        });
        i++;
        continue;
      }

      // Tool part → NOT a CoT step. The tool is rendered as a SIBLING
      // <ToolPart> component (with official state badge, input, output)
      // per https://elements.ai-sdk.dev/components/tool — the same pattern
      // used in commit e3985a9. The "thinking aloud" text BEFORE the tool
      // (handled by the text branch above) provides the step label in CoT.
      if (
        (typeof p.type === "string" && p.type.startsWith("tool-")) ||
        p.type === "dynamic-tool"
      ) {
        // Skip — the tool is rendered by the switch below
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
          ? shortenLabel(prev.type === "text" ? prev.text : prev.text)
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

        {/* ── Chain of Thought (EXACT official pattern, with polished header) ─
            Per https://elements.ai-sdk.dev/components/chain-of-thought
            Per your commit f8ad7d7 — adds:
              • BrainIcon in amber in the header
              • Step counter "3/12"
              • Active step indicator with title preview
        */}
        {!isUser && useCoT && cotSteps.length > 0 && (
          (() => {
            const done = cotSteps.filter(
              (s: { status: string }) => s.status === "complete"
            ).length;
            const activeStep = cotSteps.find(
              (s: { status: string }) => s.status === "active"
            );
            return (
              <ChainOfThought
                defaultOpen
                className="mb-3 not-prose"
              >
                <ChainOfThoughtHeader>
                  <span className="inline-flex items-center gap-2">
                    <BrainIcon className="size-3.5 text-amber-500" />
                    <span className="text-xs font-medium">Chain of Thought</span>
                    <span className="text-[10px] text-muted-foreground/60">
                      {done}/{cotSteps.length}
                    </span>
                    {isStreaming && activeStep && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        {(activeStep.label ?? "").slice(0, 50)}
                      </span>
                    )}
                  </span>
                </ChainOfThoughtHeader>
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
            );
          })()
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

            Architecture (matches commit e3985a9 + elements.ai-sdk.dev docs):
            - ChainOfThought block (above) handles reasoning + thinking text
            - <ToolPart> (in this switch) handles tool invocations as
              SIBLINGS with the official Tool/ToolHeader/ToolContent
              pattern, including a state badge (Running/Completed/Error)
            - <Sources> (in this switch) handles citations
            - <MessageResponse> (in this switch) handles final text

            For CoT messages:
            - reasoning parts: skipped (in CoT)
            - "thinking aloud" text: skipped (in CoT as step label)
            - source-url: skipped (rendered as search result badges in CoT)
            - tool-*: RENDERED as <ToolPart> (sibling with state badge)
            - final text: RENDERED as <MessageResponse>
        */}
        {parts.map((part, i) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p: any = part;
          switch (p.type) {
            case "text": {
              if (!p.text) return null;
              // Skip "thinking aloud" text (followed by tool/sub-agent/source)
              // when CoT is active — it's already a CoT step label
              if (useCoT) {
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
              }
              return (
                <MarkdownText key={`text-${message.id}-${i}`} text={p.text} />
              );
            }

            // Reasoning handled by Reasoning/ChainOfThought block above
            case "reasoning":
              return null;

            // Sources: when CoT active, rendered as search result badges
            // inside CoT step children; when no CoT, render as <Sources> block
            case "source-url": {
              if (useCoT) return null;
              return (
                <Sources key={`src-${message.id}-${i}`}>
                  <SourcesTrigger count={1} />
                  <SourcesContent>
                    <Source href={p.url} title={p.title ?? p.url} />
                  </SourcesContent>
                </Sources>
              );
            }

            // Tool invocations: always render as <ToolPart> sibling
            // (official Tool pattern with state badge, input, output)
            default: {
              if (
                (typeof p.type === "string" && p.type.startsWith("tool-")) ||
                p.type === "dynamic-tool"
              ) {
                return (
                  <ToolPart key={`tool-${message.id}-${i}`} part={p} />
                );
              }
              // Skip data parts (handled by SubAgentActivity / InlineQuestion)
              if (p.type === "data-subagent" || p.type === "data-question") {
                return null;
              }
              // Stream step boundary — no UI
              if (p.type === "step-start") return null;
              return null;
            }
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
