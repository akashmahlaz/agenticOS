// SessionItem — single chat row in the sidebar
// Hover shows time-ago + more-actions button
// Active state has left teal bar + teal-tinted background

"use client";

import { useState, useEffect, useRef } from "react";
import { MessageIcon, MoreIcon, PencilIcon, ShareIcon, TrashIcon } from "./icons";

export interface Session {
  id: string;
  title: string;
  updatedAt: string;
  isShared?: boolean;
  isTemporary?: boolean;
  _count?: { messages: number };
}

export interface SessionItemProps {
  session: Session;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
  onRename?: () => void;
  onShare?: () => void;
  onTogglePin?: () => void;
}

function timeAgo(date: string) {
  const ms = Date.now() - new Date(date).getTime();
  const m = Math.floor(ms / 60000);
  const h = Math.floor(ms / 3600000);
  const d = Math.floor(ms / 86400000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  if (d < 7) return `${d}d`;
  return new Date(date).toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function SessionItem({
  session,
  active,
  onClick,
  onDelete,
  onRename,
  onShare,
}: SessionItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const messageCount = session._count?.messages ?? 0;

  return (
    <div
      className={`group relative flex items-center gap-2 pl-3 pr-1.5 py-1.5 mx-1 rounded-lg cursor-pointer transition-all duration-150 ${
        active
          ? "bg-teal/10 text-foreground"
          : "text-foreground/80 hover:bg-foreground/5 hover:text-foreground"
      }`}
      onClick={onClick}
    >
      {/* Active indicator (left border) */}
      {active && (
        <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-teal" />
      )}

      <MessageIcon
        size={13}
        className={`flex-shrink-0 ${active ? "text-teal" : "text-muted-foreground/70"}`}
      />
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <span className="truncate text-[13px] font-medium">
          {session.title || "New Chat"}
        </span>
        {session.isShared && (
          <span title="Shared" className="text-[10px] text-teal flex-shrink-0">
            <ShareIcon size={10} />
          </span>
        )}
        {messageCount > 0 && !active && (
          <span className="text-[9px] text-muted-foreground/50 flex-shrink-0 tabular-nums">
            {messageCount}
          </span>
        )}
      </div>

      {/* Time ago (always visible on mobile, hover on desktop) */}
      <span
        className={`text-[10px] text-muted-foreground/60 tabular-nums flex-shrink-0 ${
          active ? "hidden sm:block" : "hidden group-hover:block"
        }`}
      >
        {timeAgo(session.updatedAt)}
      </span>

      {/* Action menu (on hover) */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className={`p-1 rounded-md hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-all ${
            active ? "" : "opacity-0 group-hover:opacity-100"
          } ${menuOpen ? "!opacity-100" : ""}`}
          aria-label="More actions"
        >
          <MoreIcon size={13} />
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-lg border border-foreground/10 bg-popover shadow-xl py-1 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {onRename && (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onRename();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-foreground/5 transition-colors"
              >
                <PencilIcon size={12} />
                Rename
              </button>
            )}
            {onShare && (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onShare();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-foreground/5 transition-colors"
              >
                <ShareIcon size={12} />
                {session.isShared ? "Copy share link" : "Share"}
              </button>
            )}
            <div className="border-t border-foreground/10 my-1" />
            <button
              onClick={() => {
                setMenuOpen(false);
                if (confirm("Delete this chat?")) onDelete();
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
            >
              <TrashIcon size={12} />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
