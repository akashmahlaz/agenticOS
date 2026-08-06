// ChatInput — prompt input with file attachments
// Uses AI Elements PromptInput with proper Menu wrapping for attachments
// Pattern from https://elements.ai-sdk.dev/components/prompt-input

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
}

export default function ChatInput({ onSubmit, status, onStop }: ChatInputProps) {
  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasFiles = Boolean(message.files?.length);
    if (!hasText && !hasFiles) return;
    onSubmit({
      text: message.text,
      files: message.files,
    });
  };

  return (
    <PromptInput
      onSubmit={handleSubmit}
      globalDrop
      multiple
      className="relative border border-foreground/10 bg-input-elevated shadow-[0_2px_24px_-8px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_28px_-4px_rgba(0,0,0,0.4)] focus-within:border-foreground/30 rounded-[28px] transition-all"
    >
      <PromptInputHeader>
        <PromptInputAttachmentsDisplay />
      </PromptInputHeader>
      <PromptInputBody>
        <PromptInputTextarea
          placeholder="Ask anything…"
          className="min-h-12 max-h-40 text-[15px] leading-relaxed placeholder:text-muted-foreground/60 resize-none border-0 !bg-transparent !shadow-none !ring-0 px-4 py-3 focus-visible:!outline-none focus-visible:!ring-0"
          rows={1}
        />
      </PromptInputBody>
      <PromptInputFooter className="px-2 pb-2 pt-0">
        <PromptInputTools className="gap-0.5">
          {/* Action menu — MUST wrap PromptInputActionAddAttachments */}
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
        </PromptInputTools>
        <PromptInputSubmit
          status={status}
          onClick={(e) => {
            if (status === "streaming" || status === "submitted") {
              e.preventDefault();
              onStop();
            }
          }}
          className="!h-10 !w-10 !rounded-full !bg-foreground !text-background hover:!bg-foreground/90 disabled:!bg-muted disabled:!text-muted-foreground shadow-sm transition-all [&_svg]:!size-4"
        />
      </PromptInputFooter>
    </PromptInput>
  );
}
