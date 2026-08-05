"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/components/auth-wrapper";
import { useTheme } from "@/components/theme-provider";
import ModeSwitcher from "@/components/chat/mode-switcher";

// ──────────────────────────────────────────────
// Icons (inline SVG, theme-aware)
// ──────────────────────────────────────────────
const PlusIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

const SearchIcon = ({ size = 14, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
    <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const MessageIcon = ({ size = 14, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <path
      d="M2.5 4.5C2.5 3.95 2.95 3.5 3.5 3.5H12.5C13.05 3.5 13.5 3.95 13.5 4.5V9.5C13.5 10.05 13.05 10.5 12.5 10.5H6.5L3.5 13V10.5H3.5C2.95 10.5 2.5 10.05 2.5 9.5V4.5Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
  </svg>
);

const MessageCircleDashedIcon = ({ size = 14, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M2 12C2 6.477 6.477 2 12 2M22 12C22 17.523 17.523 22 12 22M4.93 4.93C3.547 6.314 2.665 8.066 2.273 9.95M19.07 4.93C20.453 6.314 21.335 8.066 21.727 9.95M2.273 14.05C2.665 15.934 3.547 17.686 4.93 19.07M21.727 14.05C21.335 15.934 20.453 17.686 19.07 19.07M9 11.5h.01M15 11.5h.01M9 14.5c.5 1 1.5 1.5 3 1.5s2.5-.5 3-1.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SparkleIcon = ({ size = 18, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className}>
    <path
      d="M9 1L10.5 6.5L16 8L10.5 9.5L9 15L7.5 9.5L2 8L7.5 6.5L9 1Z"
      fill="currentColor"
    />
  </svg>
);

const TrashIcon = ({ size = 14, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <path
      d="M3 4.5H13M6.5 4.5V3.5C6.5 2.95 6.95 2.5 7.5 2.5H8.5C9.05 2.5 9.5 2.95 9.5 3.5V4.5M5 4.5L5.5 13C5.5 13.55 5.95 14 6.5 14H9.5C10.05 14 10.5 13.55 10.5 13L11 4.5"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const MoreIcon = ({ size = 14, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <circle cx="3" cy="8" r="1.2" fill="currentColor" />
    <circle cx="8" cy="8" r="1.2" fill="currentColor" />
    <circle cx="13" cy="8" r="1.2" fill="currentColor" />
  </svg>
);

const SunIcon = ({ size = 14, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3" />
    <path
      d="M8 1.5V3M8 13V14.5M14.5 8H13M3 8H1.5M12.95 3.05L11.9 4.1M4.1 11.9L3.05 12.95M12.95 12.95L11.9 11.9M4.1 4.1L3.05 3.05"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);

const MoonIcon = ({ size = 14, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <path
      d="M14 9.5C13.4 10.4 12.5 11 11.5 11.3C10.5 11.6 9.4 11.6 8.4 11.2C7.4 10.8 6.6 10.1 6.1 9.1C5.6 8.1 5.4 7 5.6 5.9C5.8 4.8 6.4 3.9 7.2 3.2C8 2.5 9 2.1 10 2.1C9 3 8.4 4.2 8.4 5.5C8.4 6.8 8.9 8 9.8 8.9C10.7 9.8 11.9 10.3 13.2 10.3C13.5 10.3 13.8 10.3 14 10.2C14 10 14 9.7 14 9.5Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SystemIcon = ({ size = 14, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <rect x="2" y="3" width="12" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M5 13H11M8 11V13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const SettingsIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
    <path
      d="M13.5 8C13.5 7.6 13.4 7.2 13.3 6.9L14.5 6L13 3.5L11.7 4C11.2 3.6 10.7 3.3 10.1 3.1L9.8 1.5H6.2L5.9 3.1C5.3 3.3 4.8 3.6 4.3 4L3 3.5L1.5 6L2.7 6.9C2.6 7.2 2.5 7.6 2.5 8C2.5 8.4 2.6 8.8 2.7 9.1L1.5 10L3 12.5L4.3 12C4.8 12.4 5.3 12.7 5.9 12.9L6.2 14.5H9.8L10.1 12.9C10.7 12.7 11.2 12.4 11.7 12L13 12.5L14.5 10L13.3 9.1C13.4 8.8 13.5 8.4 13.5 8Z"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
  </svg>
);

const LogoutIcon = ({ size = 14, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <path
      d="M9 2H4C3.45 2 3 2.45 3 3V13C3 13.55 3.45 14 4 14H9M11 11L14 8L11 5M14 8H6"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CloseIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const PinIcon = ({ size = 12, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <path d="M8 1L9.5 5.5L14 7L9.5 8.5L8 13L6.5 8.5L2 7L6.5 5.5L8 1Z" fill="currentColor" />
  </svg>
);

const ShareIcon = ({ size = 14, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <circle cx="12" cy="3" r="2" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="4" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="12" cy="13" r="2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M5.8 7L10.2 4M5.8 9L10.2 12" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

const PencilIcon = ({ size = 14, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <path
      d="M11.5 2L14 4.5L5 13.5H2.5V11L11.5 2Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
  </svg>
);

const CheckIcon = ({ size = 14, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
    <path d="M3 8L6.5 11.5L13 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronDownIcon = ({ size = 12, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className}>
    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
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

function getStartOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function groupByDate(sessions: Session[]) {
  const now = Date.now();
  const today = getStartOfDay(new Date());
  const yesterday = today - 86400000;
  const last7 = today - 7 * 86400000;
  const last30 = today - 30 * 86400000;

  return {
    today: sessions.filter((s) => new Date(s.updatedAt).getTime() >= today),
    yesterday: sessions.filter((s) => {
      const t = new Date(s.updatedAt).getTime();
      return t >= yesterday && t < today;
    }),
    last7: sessions.filter((s) => {
      const t = new Date(s.updatedAt).getTime();
      return t < yesterday && t >= last7;
    }),
    last30: sessions.filter((s) => {
      const t = new Date(s.updatedAt).getTime();
      return t < last7 && t >= last30;
    }),
    older: sessions.filter((s) => new Date(s.updatedAt).getTime() < last30),
  };
}

function getInitials(name?: string | null) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ──────────────────────────────────────────────
// Brand Header
// ──────────────────────────────────────────────
function BrandHeader({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex items-center justify-between px-3 h-14 flex-shrink-0 border-b border-sidebar-border">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative flex-shrink-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal/20"
            style={{
              background:
                "conic-gradient(from 180deg at 50% 50%, #4796E4 0deg, #847ACE 90deg, #C3677F 180deg, #4796E4 360deg)",
            }}
          >
            <SparkleIcon size={17} />
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold font-space-grotesk tracking-tight text-foreground truncate">
            agenticOS
          </div>
          <div className="text-[10px] text-muted-foreground truncate font-medium">
            <span className="text-teal">●</span> MiniMax M2 ready
          </div>
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="md:hidden p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          aria-label="Close sidebar"
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Session Item
// ──────────────────────────────────────────────
interface Session {
  id: string;
  title: string;
  updatedAt: string;
  isShared?: boolean;
  isTemporary?: boolean;
  _count?: { messages: number };
}

function SessionItem({
  session,
  active,
  onClick,
  onDelete,
  onRename,
  onShare,
}: {
  session: Session;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
  onRename?: () => void;
  onShare?: () => void;
}) {
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
      className={`group relative flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-lg cursor-pointer transition-all duration-150 ${
        active
          ? "bg-gradient-to-r from-teal/15 via-teal/5 to-transparent text-foreground"
          : "text-foreground/75 hover:bg-foreground/5 hover:text-foreground"
      }`}
      onClick={onClick}
    >
      {/* Active indicator (left border) */}
      {active && (
        <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-teal" />
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
            className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-lg border border-border bg-popover shadow-xl py-1 animate-fade-in"
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
            <div className="border-t border-border my-1" />
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

// ──────────────────────────────────────────────
// Session List (with search + grouped sections)
// ──────────────────────────────────────────────
function SessionList({
  activeSessionId,
  onSelectSession,
  onNewChat,
  onStartTemp,
  isTempMode,
  onDelete,
  onRename,
  onShare,
  refreshKey,
}: {
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onStartTemp?: () => void;
  isTempMode?: boolean;
  onDelete: (id: string) => void;
  onRename?: (id: string) => void;
  onShare?: (id: string) => void;
  refreshKey: number;
}) {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/sessions", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (mounted) setSessions(data || []);
      } catch (err) {
        console.error("Failed to load sessions:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token, refreshKey]);

  const filtered = useMemo(() => {
    if (!query.trim()) return sessions;
    const q = query.toLowerCase();
    return sessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [sessions, query]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  const totalCount = filtered.length;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* New Chat + Temp Chat buttons */}
      <div className="px-3 pt-3 pb-2 space-y-1.5 flex-shrink-0">
        <button
          onClick={onNewChat}
          className="group relative w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-teal to-teal/70 hover:from-teal hover:to-teal/80 text-white text-sm font-semibold transition-all shadow-md shadow-teal/20 hover:shadow-lg hover:shadow-teal/30 active:scale-[0.98]"
        >
          <div className="flex-shrink-0 w-5 h-5 rounded-md bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
            <PlusIcon size={12} className="text-white" />
          </div>
          <span className="flex-1 text-left">New Chat</span>
          <span className="text-[10px] font-mono opacity-70 hidden sm:block">⌘K</span>
        </button>

        {onStartTemp && (
          <button
            onClick={onStartTemp}
            className={`group w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all border ${
              isTempMode
                ? "bg-teal/10 border-teal/30 text-teal shadow-sm shadow-teal/10"
                : "bg-foreground/[0.02] hover:bg-foreground/5 border-border/60 text-foreground/75 hover:text-foreground"
            }`}
          >
            <MessageCircleDashedIcon
              size={14}
              className={isTempMode ? "text-teal" : "text-muted-foreground"}
            />
            <span className="flex-1 text-left">Temporary chat</span>
            {isTempMode && (
              <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
            )}
          </button>
        )}
      </div>

      {/* Search box */}
      <div className="px-3 pb-2 flex-shrink-0">
        <div
          className={`relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-colors ${
            searchFocused
              ? "border-teal/40 bg-foreground/5"
              : "border-border/60 bg-foreground/[0.02]"
          }`}
        >
          <SearchIcon
            size={12}
            className={searchFocused ? "text-teal" : "text-muted-foreground"}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search chats…"
            className="flex-1 bg-transparent border-0 outline-none text-xs text-foreground placeholder:text-muted-foreground/70 min-w-0"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-muted-foreground hover:text-foreground p-0.5"
              aria-label="Clear"
            >
              <CloseIcon size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Section label */}
      <div className="flex items-center justify-between px-4 pt-2 pb-1 flex-shrink-0">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold">
          Recent
        </span>
        {totalCount > 0 && (
          <span className="text-[10px] text-muted-foreground/60 font-mono tabular-nums">
            {totalCount}
          </span>
        )}
      </div>

      {/* Sessions scroll area */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {loading ? (
          <div className="space-y-1.5 px-1.5 py-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-7 rounded-lg bg-foreground/[0.04] animate-pulse"
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={<MessageIcon size={20} className="text-muted-foreground/40" />}
            title="No chats yet"
            subtitle="Start a new chat to begin"
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<SearchIcon size={18} className="text-muted-foreground/40" />}
            title="No matches"
            subtitle={`No chats match "${query}"`}
          />
        ) : (
          <div className="space-y-3">
            {grouped.today.length > 0 && (
              <SessionGroup label="Today">
                {grouped.today.map((s) => (
                  <SessionItem
                    key={s.id}
                    session={s}
                    active={activeSessionId === s.id}
                    onClick={() => onSelectSession(s.id)}
                    onDelete={() => onDelete(s.id)}
                    onRename={onRename ? () => onRename(s.id) : undefined}
                    onShare={onShare ? () => onShare(s.id) : undefined}
                  />
                ))}
              </SessionGroup>
            )}
            {grouped.yesterday.length > 0 && (
              <SessionGroup label="Yesterday">
                {grouped.yesterday.map((s) => (
                  <SessionItem
                    key={s.id}
                    session={s}
                    active={activeSessionId === s.id}
                    onClick={() => onSelectSession(s.id)}
                    onDelete={() => onDelete(s.id)}
                    onRename={onRename ? () => onRename(s.id) : undefined}
                    onShare={onShare ? () => onShare(s.id) : undefined}
                  />
                ))}
              </SessionGroup>
            )}
            {grouped.last7.length > 0 && (
              <SessionGroup label="Last 7 days">
                {grouped.last7.map((s) => (
                  <SessionItem
                    key={s.id}
                    session={s}
                    active={activeSessionId === s.id}
                    onClick={() => onSelectSession(s.id)}
                    onDelete={() => onDelete(s.id)}
                    onRename={onRename ? () => onRename(s.id) : undefined}
                    onShare={onShare ? () => onShare(s.id) : undefined}
                  />
                ))}
              </SessionGroup>
            )}
            {grouped.last30.length > 0 && (
              <SessionGroup label="Last 30 days">
                {grouped.last30.map((s) => (
                  <SessionItem
                    key={s.id}
                    session={s}
                    active={activeSessionId === s.id}
                    onClick={() => onSelectSession(s.id)}
                    onDelete={() => onDelete(s.id)}
                    onRename={onRename ? () => onRename(s.id) : undefined}
                    onShare={onShare ? () => onShare(s.id) : undefined}
                  />
                ))}
              </SessionGroup>
            )}
            {grouped.older.length > 0 && (
              <SessionGroup label="Older">
                {grouped.older.map((s) => (
                  <SessionItem
                    key={s.id}
                    session={s}
                    active={activeSessionId === s.id}
                    onClick={() => onSelectSession(s.id)}
                    onDelete={() => onDelete(s.id)}
                    onRename={onRename ? () => onRename(s.id) : undefined}
                    onShare={onShare ? () => onShare(s.id) : undefined}
                  />
                ))}
              </SessionGroup>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 px-2 pt-1 pb-1">
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 font-bold">
          {label}
        </span>
        <div className="flex-1 h-px bg-border/40" />
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-8">
      <div className="w-10 h-10 rounded-full bg-foreground/[0.04] flex items-center justify-center mb-2">
        {icon}
      </div>
      <p className="text-xs font-medium text-foreground/80">{title}</p>
      <p className="text-[11px] text-muted-foreground/70 mt-0.5">{subtitle}</p>
    </div>
  );
}

// ──────────────────────────────────────────────
// User Profile Footer
// ──────────────────────────────────────────────
function UserFooter({
  onOpenSettings,
  onClose,
}: {
  onOpenSettings: () => void;
  onClose?: () => void;
}) {
  const { user, logout } = useAuth();
  const initials = getInitials(user?.name);
  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const email = user?.email || "";

  return (
    <div className="border-t border-sidebar-border p-2.5 flex-shrink-0 bg-background/40">
      <div className="group flex items-center gap-2.5 p-2 rounded-xl bg-foreground/[0.02] hover:bg-foreground/[0.04] transition-colors border border-transparent hover:border-border/40">
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal via-primary to-coral flex items-center justify-center text-white text-sm font-semibold ring-2 ring-background">
            {initials}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-background" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-foreground truncate">
            {displayName}
          </div>
          <div className="text-[10px] text-muted-foreground truncate font-medium">
            {email}
          </div>
        </div>
        <div className="flex gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-md hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Settings"
            title="Settings"
          >
            <SettingsIcon size={14} />
          </button>
          <button
            onClick={logout}
            className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Logout"
            title="Logout"
          >
            <LogoutIcon size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Settings Panel (slide-in)
// ──────────────────────────────────────────────
function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { theme, setTheme } = useTheme();
  const options: { value: "light" | "dark" | "system"; label: string; icon: React.ReactNode; desc: string }[] = [
    { value: "light", label: "Light", icon: <SunIcon />, desc: "Bright background" },
    { value: "dark", label: "Dark", icon: <MoonIcon />, desc: "Easy on the eyes" },
    { value: "system", label: "System", icon: <SystemIcon />, desc: "Match OS setting" },
  ];

  return (
    <div className="absolute inset-0 bg-background z-10 flex flex-col animate-slide-in-left">
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border flex-shrink-0">
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
          aria-label="Back"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <h2 className="text-sm font-semibold font-heading">Settings</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
            Appearance
          </h3>
          <div className="space-y-1.5">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                  theme === opt.value
                    ? "bg-primary/10 border-primary/30"
                    : "bg-secondary/40 border-border hover:bg-secondary/70"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    theme === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground"
                  }`}
                >
                  {opt.icon}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">
                    {opt.label}
                    {opt.value === "system" && (
                      <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">
                        (default)
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{opt.desc}</div>
                </div>
                {theme === opt.value && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <CheckIcon size={11} className="text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
            About
          </h3>
          <div className="bg-secondary/40 rounded-xl p-4 space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Version</span>
              <span className="text-foreground font-mono">v1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>Model</span>
              <span className="text-foreground">MiniMax M2</span>
            </div>
            <div className="flex justify-between">
              <span>Framework</span>
              <span className="text-foreground">Next.js 16</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Sidebar
// ──────────────────────────────────────────────
interface SidebarProps {
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onStartTemp?: () => void;
  onClose?: () => void;
  isTempMode?: boolean;
  refreshKey: number;
}

export default function Sidebar({
  activeSessionId,
  onSelectSession,
  onNewChat,
  onStartTemp,
  onClose,
  isTempMode,
  refreshKey,
}: SidebarProps) {
  const { token } = useAuth();
  const [showSettings, setShowSettings] = useState(false);

  const handleDelete = useCallback(
    async (id: string) => {
      await fetch(`/api/sessions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (id === activeSessionId) onNewChat();
      window.dispatchEvent(new Event("agenticos-refresh-sessions"));
    },
    [token, activeSessionId, onNewChat]
  );

  return (
    <div className="w-72 h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col relative">
      {/* Brand header */}
      <BrandHeader onClose={onClose} />

      {/* Mode switcher */}
      <ModeSwitcher />

      {/* Session list */}
      <SessionList
        activeSessionId={activeSessionId}
        onSelectSession={(id) => {
          onSelectSession(id);
          onClose?.();
        }}
        onNewChat={onNewChat}
        onStartTemp={onStartTemp}
        isTempMode={isTempMode}
        onDelete={handleDelete}
        refreshKey={refreshKey}
      />

      {/* User footer */}
      <UserFooter onOpenSettings={() => setShowSettings(true)} onClose={onClose} />

      {/* Settings panel */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
