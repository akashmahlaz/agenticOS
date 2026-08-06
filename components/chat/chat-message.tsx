// ChatMessage — renders a single message using AI Elements
// Follows the official AI Elements pattern:
// https://elements.ai-sdk.dev/components/reasoning
// - Consolidates reasoning parts into one <Reasoning> block
// - Maps text parts to <MessageResponse>
// - Returns null for tool/source parts (server only emits reasoning + text)

"use client";

import type { UIMessage } from "ai";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import MessageActionBar from "./message-action-bar";

export interface ChatMessageProps {
  message: UIMessage;
  isLast: boolean;
  isStreaming: boolean;
  onRegenerate?: () => void;
}

export default function ChatMessage({ message, isLast, isStreaming, onRegenerate }: ChatMessageProps) {
  const isUser = message.role === "user";

  // Consolidate all reasoning parts into one block
  const reasoningParts = message.parts.filter((p) => p.type === "reasoning");
  const reasoningText = reasoningParts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p: any) => p.text)
    .filter(Boolean)
    .join("\n\n");
  const hasReasoning = reasoningParts.length > 0;
  const lastPart = message.parts[message.parts.length - 1];
  const isReasoningStreaming =
    isLast && isStreaming && lastPart?.type === "reasoning";

  // Extract text for the action bar
  const textParts = message.parts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((p: any) => p.type === "text")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p: any) => p.text || "");
  const fullText = textParts.join("");

  return (
    <Message from={message.role}>
      <MessageContent>
        {hasReasoning && (
          <Reasoning className="w-full" isStreaming={isReasoningStreaming}>
            <ReasoningTrigger />
            <ReasoningContent>{reasoningText}</ReasoningContent>
          </Reasoning>
        )}

        {message.parts.map((part, i) => {
          if (part.type === "text") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const text = (part as any).text;
            if (!text) return null;
            return (
              <MessageResponse key={`${message.id}-${i}`}>{text}</MessageResponse>
            );
          }
          return null;
        })}

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
