// RecentSection — scrollable list of chat history grouped by date
// Infinite scroll: just show all sessions in the scroll area (no pagination)
// Empty state for no chats / no matches

"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-wrapper";
import SessionItem, { type Session } from "./session-item";
import SessionGroup from "./session-group";
import EmptyState from "./empty-state";
import { MessageIcon, SearchIcon } from "./icons";

export interface RecentSectionProps {
  activeSessionId: string | null;
  query: string;
  onSelectSession: (id: string) => void;
  onDelete: (id: string) => void;
  refreshKey: number;
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

export default function RecentSection({
  activeSessionId,
  query,
  onSelectSession,
  onDelete,
  refreshKey,
}: RecentSectionProps) {
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

  const filtered = useMemo(() => {
    if (!query.trim()) return sessions;
    const q = query.toLowerCase();
    return sessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [sessions, query]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <div className="space-y-1.5 px-1.5 py-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-8 rounded-lg bg-foreground/[0.04] animate-pulse"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto">
        <EmptyState
          icon={<MessageIcon size={20} className="text-muted-foreground/40" />}
          title="No chats yet"
          subtitle="Start a new chat to begin"
        />
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto">
        <EmptyState
          icon={<SearchIcon size={18} className="text-muted-foreground/40" />}
          title="No matches"
          subtitle={`No chats match "${query}"`}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-2">
      {grouped.today.length > 0 && (
        <SessionGroup label="Today" count={grouped.today.length}>
          {grouped.today.map((s) => (
            <SessionItem
              key={s.id}
              session={s}
              active={activeSessionId === s.id}
              onClick={() => onSelectSession(s.id)}
              onDelete={() => onDelete(s.id)}
            />
          ))}
        </SessionGroup>
      )}
      {grouped.yesterday.length > 0 && (
        <SessionGroup label="Yesterday" count={grouped.yesterday.length}>
          {grouped.yesterday.map((s) => (
            <SessionItem
              key={s.id}
              session={s}
              active={activeSessionId === s.id}
              onClick={() => onSelectSession(s.id)}
              onDelete={() => onDelete(s.id)}
            />
          ))}
        </SessionGroup>
      )}
      {grouped.last7.length > 0 && (
        <SessionGroup label="Last 7 days" count={grouped.last7.length}>
          {grouped.last7.map((s) => (
            <SessionItem
              key={s.id}
              session={s}
              active={activeSessionId === s.id}
              onClick={() => onSelectSession(s.id)}
              onDelete={() => onDelete(s.id)}
            />
          ))}
        </SessionGroup>
      )}
      {grouped.last30.length > 0 && (
        <SessionGroup label="Last 30 days" count={grouped.last30.length}>
          {grouped.last30.map((s) => (
            <SessionItem
              key={s.id}
              session={s}
              active={activeSessionId === s.id}
              onClick={() => onSelectSession(s.id)}
              onDelete={() => onDelete(s.id)}
            />
          ))}
        </SessionGroup>
      )}
      {grouped.older.length > 0 && (
        <SessionGroup label="Older" count={grouped.older.length}>
          {grouped.older.map((s) => (
            <SessionItem
              key={s.id}
              session={s}
              active={activeSessionId === s.id}
              onClick={() => onSelectSession(s.id)}
              onDelete={() => onDelete(s.id)}
            />
          ))}
        </SessionGroup>
      )}
    </div>
  );
}
