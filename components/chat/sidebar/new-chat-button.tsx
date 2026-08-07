// NewChatButton — flat, no pill, with "pencil on paper" icon (Gemini style)
// Sits next to the temp chat button on the same row

"use client";

import { PencilIcon } from "./icons";

export interface NewChatButtonProps {
  onClick: () => void;
}

export default function NewChatButton({ onClick }: NewChatButtonProps) {
  return (
    <button
      onClick={onClick}
      className="group flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
    >
      <PencilIcon size={15} className="text-muted-foreground group-hover:text-foreground" />
      <span className="flex-1 text-left">New chat</span>
    </button>
  );
}
