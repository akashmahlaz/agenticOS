// ChatInput — the prompt input at the bottom of the chat
// Supports text + file attachments (images, PDFs, docs, etc.)
// Files are sent to the API as data URLs and shown in the input area.

"use client";

import { useCallback, useRef, useState } from "react";
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
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  ArrowUpIcon,
  GlobeIcon,
  CodeIcon,
  PaperclipIcon,
  Square,
} from "lucide-react";
import { nanoid } from "nanoid";

export interface AttachedFile {
  id: string;
  filename: string;
  mediaType: string;
  url: string; // data: URL or http(s) URL
  size: number;
  type: "file";
}

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (text: string, files: AttachedFile[]) => void;
  isStreaming: boolean;
  onStop?: () => void;
  useWebSearch?: boolean;
  onToggleWebSearch?: (value: boolean) => void;
  /** Already-attached files (rendered above the textarea) */
  attachments?: AttachedFile[];
  onRemoveAttachment?: (id: string) => void;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB per file
const ACCEPT = "image/*,application/pdf,text/*,application/json,application/javascript,application/typescript,application/zip";

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  isStreaming,
  onStop,
  useWebSearch,
  onToggleWebSearch,
  attachments = [],
  onRemoveAttachment,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList) return;
      setError(null);
      const newAttachments: AttachedFile[] = [];
      for (const file of Array.from(fileList)) {
        if (file.size > MAX_FILE_SIZE) {
          setError(`"${file.name}" is too large (max 20MB)`);
          continue;
        }
        // Read as data URL so it can be sent to the API
        const url = await readFileAsDataURL(file);
        newAttachments.push({
          id: nanoid(),
          filename: file.name,
          mediaType: file.type || "application/octet-stream",
          url,
          size: file.size,
          type: "file",
        });
      }
      // Append to the attachments list (caller's onRemoveAttachment is for removal)
      // The parent component owns the list, so we push them up via onSubmit flow
      // but here we just need to render them — for that we piggyback on attachments prop
      // (parent will collect from onSubmit's files param)
      // For preview, we need local state
      setLocalAttachments((prev) => [...prev, ...newAttachments]);
    },
    []
  );

  const [localAttachments, setLocalAttachments] = useState<AttachedFile[]>([]);

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      const text = message.text || value;
      const all = [...attachments, ...localAttachments];
      if (!text.trim() && all.length === 0) return;
      onSubmit(text, all);
      setLocalAttachments([]);
    },
    [value, attachments, localAttachments, onSubmit]
  );

  const removeLocal = useCallback((id: string) => {
    setLocalAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const all = [...attachments, ...localAttachments];

  return (
    <div className="space-y-2">
      {error && (
        <div className="text-xs text-red-500 px-2">{error}</div>
      )}

      {all.length > 0 && (
        <Attachments variant="grid" className="px-1">
          {all.map((att) => (
            <Attachment
              key={att.id}
              data={att}
              onRemove={() => {
                removeLocal(att.id);
                onRemoveAttachment?.(att.id);
              }}
            >
              <AttachmentPreview />
              <AttachmentRemove />
            </Attachment>
          ))}
        </Attachments>
      )}

      <PromptInput
        onSubmit={handleSubmit}
        className="bg-input-elevated border-0 shadow-none"
      >
        <PromptInputBody>
          <PromptInputTextarea
            value={value}
            onChange={(e) => onChange(e.currentTarget.value)}
            placeholder="Message agenticOS… (attach files with 📎)"
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
            <PromptInputButton
              aria-label="Attach files"
              onClick={() => fileInputRef.current?.click()}
            >
              <PaperclipIcon size={14} />
            </PromptInputButton>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              multiple
              hidden
              onChange={(e) => handleFiles(e.target.files)}
            />
          </PromptInputTools>
          <PromptInputSubmit
            disabled={(!value.trim() && all.length === 0) || isStreaming}
            onClick={(e) => {
              e.preventDefault();
              if (isStreaming) onStop?.();
              else {
                const all = [...attachments, ...localAttachments];
                if (value.trim() || all.length > 0) {
                  onSubmit(value, all);
                  setLocalAttachments([]);
                }
              }
            }}
            className="!h-10 !w-10 !rounded-full !bg-foreground !text-background"
          >
            {isStreaming ? <Square size={16} /> : <ArrowUpIcon size={16} />}
          </PromptInputSubmit>
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}

/** Read a File as a data URL. */
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
