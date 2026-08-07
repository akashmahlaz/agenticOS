// Sidebar — main orchestrator
// Composes: BrandHeader + NewChat+TempChat row + SearchInput + RecentSection + UserFooter + SettingsMenu
// Uses bg-background to match the chat page exactly
// Same component for desktop (visible) and mobile drawer (slide-in)

"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/components/auth-wrapper";
import BrandHeader from "./brand-header";
import NewChatButton from "./new-chat-button";
import TempChatButton from "./temp-chat-button";
import SearchInput from "./search-input";
import RecentSection from "./recent-section";
import UserFooter from "./user-footer";
import SettingsMenu from "./settings-menu";

export interface SidebarProps {
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
  const [query, setQuery] = useState("");

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
    <div className="w-72 h-full bg-background text-foreground flex flex-col relative">
      {/* Brand header */}
      <BrandHeader onClose={onClose} />

      {/* New chat + Temp chat row (Gemini-style) */}
      <div className="px-2 pt-1 pb-2 flex items-center gap-1 flex-shrink-0">
        <NewChatButton onClick={onNewChat} />
        {onStartTemp && (
          <TempChatButton active={!!isTempMode} onClick={onStartTemp} />
        )}
      </div>

      {/* Search */}
      <SearchInput value={query} onChange={setQuery} />

      {/* Recent chats */}
      <RecentSection
        activeSessionId={activeSessionId}
        query={query}
        onSelectSession={(id) => {
          onSelectSession(id);
          onClose?.();
        }}
        onDelete={handleDelete}
        refreshKey={refreshKey}
      />

      {/* User footer */}
      <UserFooter onOpenSettings={() => setShowSettings(true)} />

      {/* Settings slide-in */}
      {showSettings && <SettingsMenu onClose={() => setShowSettings(false)} />}
    </div>
  );
}
