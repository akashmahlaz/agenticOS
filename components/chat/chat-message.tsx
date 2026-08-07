// ChatMessage — renders a single message using AI Elements
// Follows the official AI Elements pattern:
// https://elements.ai-sdk.dev/components/reasoning
// - Shows Chain of Thought collapsible reasoning steps
// - Maps text parts to <MessageResponse>
// - Returns null for tool/source parts (server only emits reasoning + text)

"use client";

import type { UIMessage } from "ai";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { BrainIcon, SearchIcon, FileTextIcon } from "lucide-react";
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

  // Parse reasoning text into steps for Chain of Thought visualization
  // Format: lines starting with "Step N:" or numbered steps
  const reasoningSteps = parseReasoningSteps(reasoningText);

  return (
    <Message from={message.role}>
      <MessageContent>
        {/* Chain of Thought - collapsible reasoning visualization */}
        {hasReasoning && reasoningSteps.length > 0 && (
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
                  status={idx === reasoningSteps.length - 1 && isReasoningStreaming ? "active" : "complete"}
                />
              ))}
            </ChainOfThoughtContent>
          </ChainOfThought>
        )}

        {/* Fallback reasoning display if steps parsing didn't work */}
        {hasReasoning && reasoningSteps.length === 0 && (
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

// Parse reasoning text into structured steps
function parseReasoningSteps(text: string): Array<{ type: string; text: string }> {
  if (!text) return [];
  
  const steps: Array<{ type: string; text: string }> = [];
  const lines = text.split("\n");
  
  let currentStep = { type: "thinking", text: "" };
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Detect step patterns
    if (trimmed.match(/^(Step \d+[:.]|Step \d+)/i) || trimmed.match(/^\d+[\.\)]\s/)) {
      if (currentStep.text) {
        steps.push(currentStep);
      }
      const type = detectStepType(trimmed);
      currentStep = { type, text: trimmed };
    } else if (trimmed.startsWith("**Search**") || trimmed.match(/search(ing|ed)?/i)) {
      if (currentStep.text) {
        steps.push(currentStep);
      }
      currentStep = { type: "search", text: trimmed };
    } else if (trimmed.startsWith("**Analysis**") || trimmed.match(/analyz(e|ing)/i)) {
      if (currentStep.text) {
        steps.push(currentStep);
      }
      currentStep = { type: "analysis", text: trimmed };
    } else if (trimmed.startsWith("**Tool**") || trimmed.match(/execut(e|ing|ion)|tool call/i)) {
      if (currentStep.text) {
        steps.push(currentStep);
      }
      currentStep = { type: "tool", text: trimmed };
    } else if (currentStep.text) {
      // Append to current step
      currentStep.text += " " + trimmed;
    } else {
      // First line without step marker
      currentStep.text = trimmed;
    }
  }
  
  if (currentStep.text) {
    steps.push(currentStep);
  }
  
  // If no steps were parsed, create a single thinking step
  if (steps.length === 0 && text) {
    steps.push({ type: "thinking", text: text.slice(0, 500) });
  }
  
  return steps;
}

function detectStepType(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("search") || lower.includes("finding")) return "search";
  if (lower.includes("analyz") || lower.includes("consider")) return "analysis";
  if (lower.includes("tool") || lower.includes("execut") || lower.includes("call")) return "tool";
  if (lower.includes("generat") || lower.includes("creat") || lower.includes("synthes")) return "synthesis";
  if (lower.includes("verif") || lower.includes("check") || lower.includes("confirm")) return "verification";
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
