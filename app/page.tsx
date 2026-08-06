// Home page — new chat (no session)
// The /c/[id] route handles existing chats with server-side data loading.

"use client";

import AppShell from "@/components/chat/app-shell";
import ChatView from "@/components/chat/chat-view";
import { useState, useCallback } from "react";

export default function HomePage() {
  const [isTempMode, setIsTempMode] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleStartTemp = useCallback(() => {
    setIsTempMode(true);
    setDrawerOpen(false);
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", "/?temporary-chat=true");
    }
  }, []);

  const handleExitTemp = useCallback(() => {
    setIsTempMode(false);
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", "/");
    }
  }, []);

  return (
    <AppShell activeSessionId={null} isTempMode={isTempMode}>
      <ChatView
        initialSessionId={null}
        isTempMode={isTempMode}
        onMenuClick={() => setDrawerOpen(true)}
        onStartTemp={handleStartTemp}
        onExitTemp={handleExitTemp}
      />
    </AppShell>
  );
}
