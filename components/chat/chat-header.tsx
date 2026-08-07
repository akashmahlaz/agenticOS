// ChatHeader — Gemini-style top bar
// Three sections, equal width: hamburger (left) | model picker (center) | sparkle (right)
// Pure black background, no border.

"use client";

import { MenuIcon, ChevronDownIcon, SparklesIcon, XIcon } from "lucide-react";
import { GeminiSparkle } from "@/components/icons/gemini-sparkle";

export interface ChatHeaderProps {
  onMenuClick?: () => void;
  isTempMode: boolean;
  isShared: boolean;
  hasSession: boolean;
  onExitTemp: () => void;
  onStartTemp: () => void;
  onToggleShare: () => void;
  // Optional model picker (Gemini has "Gemini Pro" dropdown)
  modelLabel?: string;
  onModelClick?: () => void;
  // Optional custom right icon
  onRightAction?: () => void;
}

export default function ChatHeader(props: ChatHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-2 md:px-4 h-12 flex-shrink-0 bg-background">
      {/* Left — hamburger menu */}
      <div className="flex items-center justify-start w-12">
        {props.onMenuClick && (
          <button
            onClick={props.onMenuClick}
            className="h-10 w-10 flex items-center justify-center rounded-full text-foreground hover:bg-muted/40 transition-colors"
            aria-label="Open menu"
          >
            <MenuIcon size={22} strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Center — model picker */}
      <div className="flex items-center justify-center flex-1 min-w-0">
        {props.modelLabel && !props.isTempMode ? (
          <button
            onClick={props.onModelClick}
            className="flex items-center gap-1 h-9 px-3 rounded-full text-foreground hover:bg-muted/40 transition-colors"
          >
            <SparklesIcon size={16} className="text-teal" />
            <span className="text-[15px] font-medium">{props.modelLabel}</span>
            <ChevronDownIcon size={16} className="text-muted-foreground" />
          </button>
        ) : props.isTempMode ? (
          <button
            onClick={props.onExitTemp}
            className="flex items-center gap-1 h-9 px-3 rounded-full text-foreground hover:bg-muted/40 transition-colors"
          >
            <XIcon size={14} />
            <span className="text-[13px] font-medium">Temporary chat</span>
          </button>
        ) : null}
      </div>

      {/* Right — sparkle / new chat */}
      <div className="flex items-center justify-end w-12">
        <button
          onClick={props.onRightAction}
          className="h-10 w-10 flex items-center justify-center rounded-full text-foreground hover:bg-muted/40 transition-colors"
          aria-label="New chat"
        >
          <GeminiSparkle size={20} idPrefix="header-sparkle" />
        </button>
      </div>
    </header>
  );
}
