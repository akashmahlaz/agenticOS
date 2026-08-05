// ChatInput — the prompt input at the bottom of the chat
// Uses AI Elements PromptInput primitives

"use client";

import { useCallback, useState } from "react";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTools,
  PromptInputButton,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { ArrowUpIcon, GlobeIcon, CodeIcon, PaperclipIcon } from "lucide-react";

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isStreaming: boolean;
  onStop?: () => void;
  useWebSearch?: boolean;
  onToggleWebSearch?: (value: boolean) => void;
}

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  isStreaming,
  onStop,
  useWebSearch,
  onToggleWebSearch,
}: ChatInputProps) {
  const [files, setFiles] = useState<File[]>([]);

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      if (message.text) onChange(message.text);
      if (message.files) setFiles(message.files as unknown as File[]);
      onSubmit();
    },
    [onChange, onSubmit]
  );

  return (
    <PromptInput
      onSubmit={handleSubmit}
      className="bg-input-elevated border-0 shadow-none"
    >
      <PromptInputBody>
        <PromptInputTextarea
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          placeholder="Message agenticOS…"
          disabled={isStreaming}
          className="focus-visible:!border-transparent"
        />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools>
          {onToggleWebSearch && (
            <PromptInputButton
              onClick={() => onToggleWebSearch(!useWebSearch)}
              variant={useWebSearch ? "default" : "ghost"}
              aria-label="Web search"
            >
              <GlobeIcon size={14} />
              <span>Search</span>
            </PromptInputButton>
          )}
          <PromptInputButton aria-label="Attach">
            <PaperclipIcon size={14} />
          </PromptInputButton>
        </PromptInputTools>
        <PromptInputSubmit
          disabled={!value.trim() || isStreaming}
          onClick={(e) => {
            e.preventDefault();
            if (isStreaming) onStop?.();
            else onSubmit();
          }}
          className="!h-10 !w-10 !rounded-full !bg-foreground !text-background"
        >
          <ArrowUpIcon size={16} />
        </PromptInputSubmit>
      </PromptInputFooter>
    </PromptInput>
  );
}
