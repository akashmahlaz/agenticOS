// ChatMessage — renders a single message (user or assistant) with all its parts

"use client";

import { memo } from "react";
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

export interface ChatMessageProps {
  message: AgentOSUIMessage;
  isStreaming: boolean;
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
    (p) => typeof p.type === "string" && p.type.startsWith("data-")
  );
}

function ChatMessageImpl({ message, isStreaming }: ChatMessageProps) {
  const text = getTextContent(message);
  const reasoning = getReasoningContent(message);
  const toolParts = getToolParts(message);
  const dataParts = getDataParts(message);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subagentData = dataParts.find((p) => p.type === "data-subagent")?.data as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sourcesData = dataParts.find((p) => p.type === "data-sources")?.data as any;

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
      </MessageContent>
    </Message>
  );
}

export default memo(ChatMessageImpl);
