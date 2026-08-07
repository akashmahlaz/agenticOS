// ContextMeter — compact token usage indicator for chat header
// Uses official AI Elements Context (HoverCard) for details
// https://elements.ai-sdk.dev/components/context

"use client";

import {
  Context,
  ContextTrigger,
  ContextContent,
  ContextContentHeader,
  ContextContentBody,
  ContextContentFooter,
  ContextInputUsage,
  ContextOutputUsage,
  ContextCacheUsage,
  ContextReasoningUsage,
} from "@/components/ai-elements/context";

export interface ContextMeterProps {
  usedTokens: number;
  maxTokens?: number;
  modelId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  usage?: any;
}

export default function ContextMeter({
  usedTokens,
  maxTokens = 128000,
  modelId,
  usage,
}: ContextMeterProps) {
  return (
    <Context
      usedTokens={usedTokens}
      maxTokens={maxTokens}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      usage={usage as any}
      modelId={modelId}
    >
      <ContextTrigger className="h-7 px-2 text-xs gap-1.5" />
      <ContextContent>
        <ContextContentHeader />
        <ContextContentBody>
          <ContextInputUsage />
          <ContextOutputUsage />
          <ContextReasoningUsage />
          <ContextCacheUsage />
        </ContextContentBody>
        <ContextContentFooter />
      </ContextContent>
    </Context>
  );
}
