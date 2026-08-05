// @ts-nocheck
"use client";

import { useState } from "react";
import {
  CopyIcon,
  CheckIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  RefreshCwIcon,
  ShareIcon,
  Volume2Icon,
  Loader2Icon,
} from "lucide-react";

interface MessageActionBarProps {
  messageId: string;
  content: string;
  sessionId?: string | null;
  onRegenerate?: () => void;
  onShare?: () => void;
  onReadAloud?: () => void;
}

export default function MessageActionBar({
  messageId,
  content,
  onRegenerate,
  onShare,
  onReadAloud,
}: MessageActionBarProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  const handleFeedback = async (value: "up" | "down") => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, value }),
      });
      setFeedback(value);
    } catch (e) {
      console.error("Feedback failed", e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-0.5 mt-2 -ml-1 opacity-70 hover:opacity-100 transition-opacity">
      {/* Copy */}
      <button
        onClick={handleCopy}
        className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        aria-label="Copy message"
        title="Copy"
      >
        {copied ? (
          <CheckIcon size={14} className="text-success" />
        ) : (
          <CopyIcon size={14} />
        )}
      </button>

      {/* Thumbs up */}
      <button
        onClick={() => handleFeedback("up")}
        disabled={submitting}
        className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors ${
          feedback === "up"
            ? "text-teal bg-teal/10"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
        }`}
        aria-label="Good response"
        title="Good response"
      >
        {submitting && feedback === null ? (
          <Loader2Icon size={14} className="animate-spin" />
        ) : (
          <ThumbsUpIcon
            size={14}
            className={feedback === "up" ? "fill-current" : ""}
          />
        )}
      </button>

      {/* Thumbs down */}
      <button
        onClick={() => handleFeedback("down")}
        disabled={submitting}
        className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors ${
          feedback === "down"
            ? "text-coral bg-coral/10"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
        }`}
        aria-label="Bad response"
        title="Bad response"
      >
        <ThumbsDownIcon
          size={14}
          className={feedback === "down" ? "fill-current" : ""}
        />
      </button>

      {/* Regenerate */}
      {onRegenerate && (
        <button
          onClick={onRegenerate}
          className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          aria-label="Regenerate response"
          title="Regenerate"
        >
          <RefreshCwIcon size={13} />
        </button>
      )}

      {/* Read aloud (optional) */}
      {onReadAloud && (
        <button
          onClick={onReadAloud}
          className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          aria-label="Read aloud"
          title="Read aloud"
        >
          <Volume2Icon size={14} />
        </button>
      )}

      {/* Share (optional) */}
      {onShare && (
        <button
          onClick={onShare}
          className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          aria-label="Share"
          title="Share"
        >
          <ShareIcon size={13} />
        </button>
      )}
    </div>
  );
}
