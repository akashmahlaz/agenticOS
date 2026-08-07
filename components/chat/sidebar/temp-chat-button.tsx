// TempChatButton — sits next to New chat (Gemini style: inline to the right)
// Shows active state with teal glow when in temp mode

"use client";

import { MessageCircleDashedIcon } from "./icons";

export interface TempChatButtonProps {
  active: boolean;
  onClick: () => void;
}

export default function TempChatButton({ active, onClick }: TempChatButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
        active
          ? "bg-teal/10 text-teal"
          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
      }`}
      title="Temporary chat"
      aria-label="Temporary chat"
    >
      <MessageCircleDashedIcon
        size={13}
        className={active ? "text-teal" : "text-muted-foreground group-hover:text-foreground"}
      />
      <span className="hidden lg:inline">Temp</span>
      {active && (
        <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
      )}
    </button>
  );
}
