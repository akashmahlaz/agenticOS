// ChatMessage — renders a single message (user or assistant) with all its parts

"use client";

import { memo, useCallback } from "react";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import {
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import type { AgentOSUIMessage } from "./types";
import SubAgentActivity from "./subagent-activity";
import InlineQuestion, { type Question } from "./inline-question";

export interface ChatMessageProps {
  message: AgentOSUIMessage;
  isStreaming: boolean;
  onSubmitAnswer?: (
    questionId: string,
    answers: Record<string, string | string[]>
  ) => void;
}

function getTextContent(message: AgentOSUIMessage): string {
  return message.parts
    .filter((p) => p.type === "text")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p) => (p as any).text as string)
    .join("");
}

function getReasoningContent(message: AgentOSUIMessage): string {
  return message.parts
    .filter((p) => p.type === "reasoning")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p) => (p as any).text as string)
    .join("\n");
}

function getToolParts(message: AgentOSUIMessage) {
  return message.parts.filter(
    (p) =>
      typeof p.type === "string" &&
      (p.type.startsWith("tool-") || p.type === "dynamic-tool")
  );
}

function getDataParts(message: AgentOSUIMessage) {
  return message.parts.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p): p is any =>
      typeof (p as any).type === "string" && (p as any).type.startsWith("data-")
  );
}

function ChatMessageImpl({ message, isStreaming, onSubmitAnswer }: ChatMessageProps) {
  const text = getTextContent(message);
  const reasoning = getReasoningContent(message);
  const toolParts = getToolParts(message);
  const dataParts = getDataParts(message);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subagentData = dataParts.find((p) => p.type === "data-subagent")?.data as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sourcesData = dataParts.find((p) => (p as any).type === "data-sources")?.data as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questionData = dataParts.find((p) => (p as any).type === "data-question")?.data as
    | Question
    | undefined;

  const handleAnswer = useCallback(
    (answers: Record<string, string | string[]>) => {
      if (questionData && onSubmitAnswer) {
        onSubmitAnswer(questionData.id, answers);
      }
    },
    [questionData, onSubmitAnswer]
  );

  return (
    <Message from={message.role}>
      <MessageContent>
        {/* Sub-agent activity timeline */}
        {subagentData && Array.isArray(subagentData) && subagentData.length > 0 && (
          <SubAgentActivity events={subagentData} isStreaming={isStreaming} />
        )}

        {/* Chain of thought (reasoning) */}
        {reasoning && (
          <ChainOfThought defaultOpen={isStreaming}>
            <ChainOfThoughtHeader>Thinking</ChainOfThoughtHeader>
            <ChainOfThoughtContent>
              {reasoning.split("\n").filter(Boolean).map((line, i) => (
                <ChainOfThoughtStep
                  key={i}
                  label={line.slice(0, 120)}
                  description=""
                />
              ))}
            </ChainOfThoughtContent>
          </ChainOfThought>
        )}

        {/* Tool calls */}
        {toolParts.map((part, i) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p = part as any;
          return (
            <Tool key={i}>
              <ToolHeader
                type={p.type}
                state={p.state}
                toolName={p.toolName ?? p.type.replace("tool-", "")}
              />
              <ToolContent>
                {p.input !== undefined && <ToolInput input={p.input} />}
                {p.output !== undefined && (
                  <ToolOutput output={p.output} errorText={p.errorText} />
                )}
              </ToolContent>
            </Tool>
          );
        })}

        {/* Main text content */}
        {text && (
          <MessageResponse className="prose-streamdown">
            {text}
          </MessageResponse>
        )}

        {/* Sources */}
        {sourcesData && Array.isArray(sourcesData) && sourcesData.length > 0 && (
          <Sources>
            <SourcesTrigger count={sourcesData.length} />
            <SourcesContent>
              {sourcesData.map((s: { title?: string; url?: string; snippet?: string }, i: number) => (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                <div key={i}>{s.title ?? s.url}</div>
              ))}
            </SourcesContent>
          </Sources>
        )}

        {/* Inline question (agent asked the user) */}
        {questionData && !isStreaming && onSubmitAnswer && (
          <InlineQuestion question={questionData} onAnswer={handleAnswer} />
        )}
      </MessageContent>
    </Message>
  );
}

export default memo(ChatMessageImpl);
