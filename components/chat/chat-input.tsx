// ChatInput — the prompt input at the bottom of the chat
// Clean simple style: textarea + send button + paperclip for files

"use client";

import { useCallback, useRef, useState } from "react";
import { ArrowUpIcon, PaperclipIcon, Square, XIcon } from "lucide-react";
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
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB per file
const ACCEPT = "image/*,application/pdf,text/*,application/json,application/javascript,application/typescript,application/zip";

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  isStreaming,
  onStop,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList) return;
    setError(null);
    const newAttachments: AttachedFile[] = [];
    for (const file of Array.from(fileList)) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`"${file.name}" is too large (max 20MB)`);
        continue;
      }
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
    setFiles((prev) => [...prev, ...newAttachments]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const submit = useCallback(() => {
    const text = value.trim();
    if (!text && files.length === 0) return;
    onSubmit(text, files);
    setFiles([]);
  }, [value, files, onSubmit]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!isStreaming) submit();
      }
    },
    [submit, isStreaming]
  );

  const hasContent = value.trim().length > 0 || files.length > 0;

  return (
    <div className="border-t border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-3xl mx-auto px-3 py-3 sm:px-4 sm:py-4">
        {error && (
          <div className="mb-2 text-xs text-red-500">{error}</div>
        )}

        {/* Attached files */}
        {files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {files.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-2.5 py-1 text-xs"
              >
                {f.mediaType.startsWith("image/") && f.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.url}
                    alt={f.filename}
                    className="size-5 rounded object-cover"
                  />
                ) : (
                  <PaperclipIcon className="size-3 text-muted-foreground" />
                )}
                <span className="max-w-[150px] truncate">{f.filename}</span>
                <button
                  type="button"
                  onClick={() => removeFile(f.id)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Remove"
                >
                  <XIcon className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-background px-3 py-2 shadow-sm focus-within:border-foreground/30">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming}
            className="flex size-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            aria-label="Attach files"
          >
            <PaperclipIcon className="size-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Message agenticOS…"
            disabled={isStreaming}
            rows={1}
            className="flex-1 resize-none border-0 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
            style={{ maxHeight: "200px" }}
            onInput={(e) => {
              // Auto-resize
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 200) + "px";
            }}
          />

          <button
            type="button"
            onClick={() => (isStreaming ? onStop?.() : submit())}
            disabled={!hasContent && !isStreaming}
            className={`flex size-8 flex-shrink-0 items-center justify-center rounded-full transition-all disabled:opacity-30 ${
              isStreaming
                ? "bg-foreground text-background hover:opacity-80"
                : "bg-foreground text-background hover:scale-105 active:scale-95"
            } ${!hasContent && !isStreaming ? "cursor-not-allowed" : ""}`}
            aria-label={isStreaming ? "Stop generating" : "Send message"}
          >
            {isStreaming ? (
              <Square className="size-3 fill-current" />
            ) : (
              <ArrowUpIcon className="size-4" />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
          agenticOS can make mistakes. Verify important info.
        </p>
      </div>
    </div>
  );
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
