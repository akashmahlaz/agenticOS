// ChatEmptyState — Gemini-style welcome screen
// Pure black background, centered 4-color sparkle icon,
// large greeting "Your move, [Name]!" in white.
// No suggestion cards (Gemini has none) — just the centered greeting.

"use client";

import { GeminiSparkle } from "@/components/icons/gemini-sparkle";

export interface ChatEmptyStateProps {
  isTempMode: boolean;
  userName?: string;
  onSuggestion?: (prompt: string) => void; // kept for API compat, unused
}

export default function ChatEmptyState(props: ChatEmptyStateProps) {
  const name = props.userName?.trim() || "there";
  const display = name.charAt(0).toUpperCase() + name.slice(1);

  return (
    <div className="h-full flex flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6">
        <GeminiSparkle size={64} idPrefix="empty-sparkle" />
        <h1 className="text-[2.25rem] leading-[1.15] font-normal text-foreground text-center tracking-tight">
          {props.isTempMode ? (
            "Temporary chat"
          ) : (
            <>
              Your move,
              <br />
              <span className="font-normal">{display}!</span>
            </>
          )}
        </h1>
      </div>
    </div>
  );
}
