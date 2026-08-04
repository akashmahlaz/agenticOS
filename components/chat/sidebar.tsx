"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/(app)/layout";
import { useTheme } from "@/components/theme-provider";

// ──────────────────────────────────────────────
// Icons
// ──────────────────────────────────────────────
const PlusIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const MessageIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M2 4C2 3.45 2.45 3 3 3H13C13.55 3 14 3.45 14 4V10C14 10.55 13.55 11 13 11H6L3 14V11H3C2.45 11 2 10.55 2 10V4Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
);
const TrashIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M3 4.5H13M6.5 4.5V3.5C6.5 2.95 6.95 2.5 7.5 2.5H8.5C9.05 2.5 9.5 2.95 9.5 3.5V4.5M5 4.5L5.5 13C5.5 13.55 5.95 14 6.5 14H9.5C10.05 14 10.5 13.55 10.5 13L11 4.5"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const SunIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3" />
    <path
      d="M8 1.5V3M8 13V14.5M14.5 8H13M3 8H1.5M12.95 3.05L11.9 4.1M4.1 11.9L3.05 12.95M12.95 12.95L11.9 11.9M4.1 4.1L3.05 3.05"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);
const MoonIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M14 9.5C13.4 10.4 12.5 11 11.5 11.3C10.5 11.6 9.4 11.6 8.4 11.2C7.4 10.8 6.6 10.1 6.1 9.1C5.6 8.1 5.4 7 5.6 5.9C5.8 4.8 6.4 3.9 7.2 3.2C8 2.5 9 2.1 10 2.1C9 3 8.4 4.2 8.4 5.5C8.4 6.8 8.9 8 9.8 8.9C10.7 9.8 11.9 10.3 13.2 10.3C13.5 10.3 13.8 10.3 14 10.2C14 10 14 9.7 14 9.5Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
  </svg>
);
const SystemIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="2" y="3" width="12" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M5 13H11M8 11V13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);
const SettingsIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
    <path
      d="M13.5 8C13.5 7.6 13.4 7.2 13.3 6.9L14.5 6L13 3.5L11.7 4C11.2 3.6 10.7 3.3 10.1 3.1L9.8 1.5H6.2L5.9 3.1C5.3 3.3 4.8 3.6 4.3 4L3 3.5L1.5 6L2.7 6.9C2.6 7.2 2.5 7.6 2.5 8C2.5 8.4 2.6 8.8 2.7 9.1L1.5 10L3 12.5L4.3 12C4.8 12.4 5.3 12.7 5.9 12.9L6.2 14.5H9.8L10.1 12.9C10.7 12.7 11.2 12.4 11.7 12L13 12.5L14.5 10L13.3 9.1C13.4 8.8 13.5 8.4 13.5 8Z"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
  </svg>
);
const LogoutIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M9 2H4C3.45 2 3 2.45 3 3V13C3 13.55 3.45 14 4 14H9M11 11L14 8L11 5M14 8H6"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const CloseIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const SparkleIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
    <path
      d="M9 1L10.5 6.5L16 8L10.5 9.5L9 15L7.5 9.5L2 8L7.5 6.5L9 1Z"
      fill="currentColor"
    />
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
// Session List
// ──────────────────────────────────────────────
interface Session {
  id: string;
  title: string;
  updatedAt: string;
}

function SessionList({
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDelete,
  refreshKey,
}: {
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  refreshKey: number;
}) {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

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

  const grouped = {
    today: sessions.filter((s) => {
      const age = Date.now() - new Date(s.updatedAt).getTime();
      return age < 86400000;
    }),
    earlier: sessions.filter((s) => {
      const age = Date.now() - new Date(s.updatedAt).getTime();
      return age >= 86400000;
    }),
  };

  return (
    <div className="flex-1 overflow-y-auto px-2 py-2">
      <button
        onClick={onNewChat}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/15 text-primary text-sm font-medium transition-colors border border-primary/20"
      >
        <PlusIcon size={15} />
        <span>New Chat</span>
      </button>

      {loading ? (
        <div className="text-xs text-muted-foreground px-3 py-4 text-center">Loading…</div>
      ) : sessions.length === 0 ? (
        <div className="text-xs text-muted-foreground px-3 py-4 text-center">No chats yet</div>
      ) : (
        <>
          {grouped.today.length > 0 && (
            <div className="mt-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-1 font-semibold">
                Today
              </div>
              {grouped.today.map((s) => (
                <SessionItem
                  key={s.id}
                  session={s}
                  active={activeSessionId === s.id}
                  onClick={() => onSelectSession(s.id)}
                  onDelete={() => onDelete(s.id)}
                />
              ))}
            </div>
          )}
          {grouped.earlier.length > 0 && (
            <div className="mt-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-1 font-semibold">
                Earlier
              </div>
              {grouped.earlier.map((s) => (
                <SessionItem
                  key={s.id}
                  session={s}
                  active={activeSessionId === s.id}
                  onClick={() => onSelectSession(s.id)}
                  onDelete={() => onDelete(s.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SessionItem({
  session,
  active,
  onClick,
  onDelete,
}: {
  session: Session;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors text-sm ${
        active
          ? "bg-primary/15 text-foreground"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      <MessageIcon size={14} />
      <span className="flex-1 truncate text-xs">{session.title}</span>
      <span className="text-[10px] text-muted-foreground/60">{timeAgo(session.updatedAt)}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
        aria-label="Delete chat"
      >
        <TrashIcon size={12} />
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────
// User Profile Footer (avatar + settings + logout)
// ──────────────────────────────────────────────
function UserFooter({ onOpenSettings, onClose }: { onOpenSettings: () => void; onClose?: () => void }) {
  const { user, logout } = useAuth();
  const initials = getInitials(user?.name);
  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const email = user?.email || "";

  return (
    <div className="border-t border-border p-3 flex-shrink-0">
      <div className="flex items-center gap-3 p-2 rounded-xl bg-secondary/50">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal to-coral flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">{displayName}</div>
          <div className="text-[10px] text-muted-foreground truncate">{email}</div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Settings"
            title="Settings"
          >
            <SettingsIcon size={15} />
          </button>
          <button
            onClick={logout}
            className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Logout"
            title="Logout"
          >
            <LogoutIcon size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Settings Panel
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
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3 8L6.5 11.5L13 5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-primary"
                    />
                  </svg>
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
  onClose?: () => void;
  refreshKey: number;
}

export default function Sidebar({
  activeSessionId,
  onSelectSession,
  onNewChat,
  onClose,
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
      // Force refresh
      window.dispatchEvent(new Event("agenticos-refresh-sessions"));
    },
    [token, activeSessionId, onNewChat]
  );

  return (
    <div className="w-72 h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col relative">
      {/* Brand */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal to-coral flex items-center justify-center text-white">
            <SparkleIcon size={16} />
          </div>
          <div>
            <div className="text-sm font-semibold font-heading text-foreground">agenticOS</div>
            <div className="text-[9px] text-muted-foreground">Powered by MiniMax M2</div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
            aria-label="Close sidebar"
          >
            <CloseIcon />
          </button>
        )}
      </div>

      {/* Session list */}
      <SessionList
        activeSessionId={activeSessionId}
        onSelectSession={(id) => {
          onSelectSession(id);
          onClose?.();
        }}
        onNewChat={onNewChat}
        onDelete={handleDelete}
        refreshKey={refreshKey}
      />

      {/* User footer with settings + logout */}
      <UserFooter onOpenSettings={() => setShowSettings(true)} onClose={onClose} />

      {/* Settings panel */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
