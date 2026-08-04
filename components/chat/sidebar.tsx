"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/(app)/layout";

interface Session {
  id: string;
  title: string;
  model: string;
  updatedAt: string;
  _count: { messages: number };
}

interface SidebarProps {
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
}

// ──────────────────────────────────────────────
// Icons
// ──────────────────────────────────────────────
const SparkleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1L8 5.5L12 6L8.5 8.5L9.5 13L7 10.5L4.5 13L5.5 8.5L2 6L6 5.5L7 1Z" fill="currentColor"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const ChatIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 2.5C2 2.2 2.2 2 2.5 2H11.5C11.8 2 12 2.2 12 2.5V9.5C12 9.8 11.8 10 11.5 10H4L2 12V2.5Z" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M1.5 3H10.5M4 3V1.5H8V3M5 5.5V9M7 5.5V9M2 3L2.5 10.5H9.5L10 3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const LogoutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M5 2H2.5C2.2 2 2 2.2 2 2.5V11.5C2 11.8 2.2 12 2.5 12H5M9.5 10L12 7L9.5 4M12 7H5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ──────────────────────────────────────────────
// Time ago
// ──────────────────────────────────────────────
function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

// ──────────────────────────────────────────────
// Sidebar
// ──────────────────────────────────────────────
export default function Sidebar({ activeSessionId, onSelectSession, onNewChat }: SidebarProps) {
  const { user, logout, token } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchSessions = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/sessions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch {
      setSessions([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
  }, [token]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deleting) return;
    setDeleting(id);
    try {
      await fetch(`/api/sessions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) {
        onNewChat();
      }
    } catch {
      // ignore
    }
    setDeleting(null);
  };

  return (
    <div className="w-64 flex-shrink-0 bg-[#FAFAF9] border-r border-[#E7E5E4] flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-[#E7E5E4]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-[#1C1917] flex items-center justify-center text-white">
            <SparkleIcon />
          </div>
          <span className="font-semibold text-[#1C1917] text-sm">agenticOS</span>
        </div>

        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2.5 bg-[#1C1917] text-white rounded-xl text-sm font-medium hover:bg-[#292524] active:scale-[0.98] transition-all"
        >
          <PlusIcon />
          New Chat
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-4 py-1">
          <p className="text-[10px] font-medium text-[#A8A29E] uppercase tracking-wider">Recent Chats</p>
        </div>

        {loading && (
          <div className="px-4 py-4 text-center">
            <div className="w-4 h-4 border border-[#D6D3D1] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-[#A8A29E]">No chats yet</p>
            <p className="text-[10px] text-[#D6D3D1] mt-1">Start a new conversation</p>
          </div>
        )}

        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className={`mx-2 mb-0.5 group rounded-xl cursor-pointer transition-all ${
              activeSessionId === session.id
                ? "bg-[#1C1917] text-white"
                : "hover:bg-[#F5F4F2] text-[#57534E] hover:text-[#1C1917]"
            }`}
          >
            <div className="flex items-center gap-2 px-3 py-2.5">
              <span className={activeSessionId === session.id ? "text-white/70" : "text-[#A8A29E]"}>
                <ChatIcon />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{session.title || "New Chat"}</p>
                <p className={`text-[10px] ${activeSessionId === session.id ? "text-white/50" : "text-[#A8A29E]"}`}>
                  {timeAgo(session.updatedAt)} · {session._count.messages} msgs
                </p>
              </div>
              <button
                onClick={(e) => handleDelete(e, session.id)}
                disabled={deleting === session.id}
                className={`opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-[#A8A29E] hover:text-red-500 transition-all ${
                  activeSessionId === session.id ? "group-hover:opacity-100" : ""
                }`}
              >
                {deleting === session.id ? (
                  <span className="w-3 h-3 border border-red-300 border-t-transparent rounded-full animate-spin inline-block" />
                ) : (
                  <TrashIcon />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* User footer */}
      <div className="border-t border-[#E7E5E4] p-3">
        <div className="flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-[#F5F4F2] cursor-pointer transition-colors group">
          <div className="w-7 h-7 rounded-full bg-[#E7E5E4] flex items-center justify-center text-[#57534E] text-xs font-medium flex-shrink-0">
            {(user?.name || user?.email || "U")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#1C1917] truncate">{user?.name || "User"}</p>
            <p className="text-[10px] text-[#A8A29E] truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="opacity-0 group-hover:opacity-100 p-1 text-[#A8A29E] hover:text-red-500 transition-all"
            title="Sign out"
          >
            <LogoutIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
