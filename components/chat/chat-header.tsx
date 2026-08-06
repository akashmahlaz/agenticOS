// ChatHeader — top bar (menu button, brand, temp toggle, share button)

"use client";

import {
  CheckIcon,
  MenuIcon,
  MessageCircleDashedIcon,
  ShareIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";

export interface ChatHeaderProps {
  onMenuClick?: () => void;
  isTempMode: boolean;
  isShared: boolean;
  hasSession: boolean;
  onExitTemp: () => void;
  onStartTemp: () => void;
  onToggleShare: () => void;
}

export default function ChatHeader(props: ChatHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-3 md:px-5 h-12 flex-shrink-0 bg-background/90 backdrop-blur-md border-b">
      <div className="flex items-center gap-2 min-w-0">
        {props.onMenuClick && (
          <button
            onClick={props.onMenuClick}
            className="md:hidden p-2 rounded-lg hover:bg-secondary text-foreground transition-colors"
            aria-label="Open menu"
          >
            <MenuIcon size={18} />
          </button>
        )}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/40">
          <SparklesIcon size={15} className="text-teal" />
          <span className="text-[15px] font-medium">agenticOS</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {props.isTempMode ? (
          <button
            onClick={props.onExitTemp}
            className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="Close temporary chat"
            title="Close temporary chat"
          >
            <XIcon size={16} />
          </button>
        ) : (
          <>
            {props.onStartTemp && (
              <button
                onClick={props.onStartTemp}
                className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                aria-label="Start temporary chat"
                title="Temporary chat"
              >
                <MessageCircleDashedIcon size={16} />
              </button>
            )}
            {props.hasSession && (
              <button
                onClick={props.onToggleShare}
                className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                  props.isShared
                    ? "bg-teal/15 text-teal border border-teal/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
                aria-label="Share chat"
                title={props.isShared ? "Shared" : "Share chat"}
              >
                {props.isShared ? <CheckIcon size={14} /> : <ShareIcon size={14} />}
              </button>
            )}
          </>
        )}
      </div>
    </header>
  );
}
