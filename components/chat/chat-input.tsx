// ChatInput — Gemini-style prompt input
// Pattern from https://elements.ai-sdk.dev/components/prompt-input
// Gemini-style layout: + | placeholder | mic | circular submit button
// Single rounded bar, dark gray input on near-black background

"use client";

import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Attachment, AttachmentPreview, AttachmentRemove, Attachments } from "@/components/ai-elements/attachments";
import { PlusIcon } from "lucide-react";
import type { ChatStatus } from "ai";

// Attachments display — must be inside PromptInputHeader
function PromptInputAttachmentsDisplay() {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) return null;
  return (
    <Attachments variant="inline">
      {attachments.files.map((file) => (
        <Attachment key={file.id} data={file} onRemove={() => attachments.remove(file.id)}>
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
}

export interface ChatInputProps {
  onSubmit: (message: { text: string; files?: unknown[] }) => void;
  status: ChatStatus;
  onStop: () => void;
  placeholder?: string;
}

export default function ChatInput({
  onSubmit,
  status,
  onStop,
  placeholder = "Ask agenticOS",
}: ChatInputProps) {
  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasFiles = Boolean(message.files?.length);
    if (!hasText && !hasFiles) return;
    onSubmit({ text: message.text, files: message.files });
  };

  return (
    <PromptInput
      onSubmit={handleSubmit}
      globalDrop
      multiple
      className="relative border border-foreground/10 bg-muted/30 shadow-none focus-within:border-foreground/20 rounded-[28px] transition-all"
    >
      <PromptInputHeader>
        <PromptInputAttachmentsDisplay />
      </PromptInputHeader>
      <PromptInputBody>
        <PromptInputTextarea
          placeholder={placeholder}
          className="min-h-12 max-h-40 text-[16px] leading-relaxed placeholder:text-muted-foreground/60 resize-none border-0 !bg-transparent !shadow-none !ring-0 px-4 py-3 focus-visible:!outline-none focus-visible:!ring-0"
          rows={1}
        />
      </PromptInputBody>
      <PromptInputFooter className="px-2 pb-2 pt-0">
        <PromptInputTools className="gap-0.5">
          {/* + action menu — MUST wrap PromptInputActionAddAttachments */}
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger
              aria-label="Add"
              className="!h-9 !w-9 !rounded-full text-muted-foreground hover:!bg-muted hover:!text-foreground !bg-transparent !shadow-none"
            >
              <PlusIcon size={20} strokeWidth={1.75} />
            </PromptInputActionMenuTrigger>
            <PromptInputActionMenuContent align="start">
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
        </PromptInputTools>

        {/* (voice/mic icon removed per user request) */}

        {/* Submit — dark blue circle, white icon (Gemini's submit button) */}
        <PromptInputSubmit
          status={status}
          onStop={onStop}
          onClick={(e) => {
            if (status === "streaming" || status === "submitted") {
              e.preventDefault();
              onStop();
            }
          }}
          className="!h-10 !w-10 !rounded-full !bg-[#1A1A2E] dark:!bg-[#2A2A4A] !text-white hover:!bg-[#252540] dark:hover:!bg-[#353560] disabled:!bg-muted disabled:!text-muted-foreground shadow-sm transition-all [&_svg]:!size-4"
        />
      </PromptInputFooter>
    </PromptInput>
  );
}
