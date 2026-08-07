// ChatView — client wrapper for /chat/[id]
// Receives pre-loaded initialMessages from server component.
// Renders sidebar + chat-container with URL-based navigation.

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { UIMessage } from "ai";
import { useAuth } from "@/components/auth-wrapper";
import Sidebar from "@/components/chat/sidebar";
import ChatContainer from "@/components/chat/chat-container";
import AuthGate from "@/components/auth-gate";

export interface ChatViewProps {
  sessionId: string;
  initialMessages: UIMessage[];
  sessionTitle?: string;
  isShared?: boolean;
}

export default function ChatView({
  sessionId,
  initialMessages,
}: ChatViewProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // Bump to force sidebar refresh after new chat created
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Lock body scroll when drawer is open on mobile
  useEffect(() => {
    if (drawerOpen && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen, isMobile]);

  // Listen for sidebar refresh events
  useEffect(() => {
    const handler = () => setSidebarRefreshKey((k) => k + 1);
    window.addEventListener("agenticos-refresh-sessions", handler);
    return () => window.removeEventListener("agenticos-refresh-sessions", handler);
  }, []);

  // Persist active session in localStorage as a backup (helps on refresh)
  useEffect(() => {
    try {
      localStorage.setItem("agenticos-active-session", sessionId);
    } catch {}
  }, [sessionId]);

  // Handlers — all navigate via router
  const handleNewChat = useCallback(() => {
    try {
      localStorage.removeItem("agenticos-active-session");
    } catch {}
    router.push("/");
  }, [router]);

  const handleSelectSession = useCallback(
    (id: string) => {
      if (id === sessionId) return; // already on this chat
      try {
        localStorage.setItem("agenticos-active-session", id);
      } catch {}
      router.push(`/chat/${id}`);
    },
    [router, sessionId]
  );

  const handleStartTemp = useCallback(() => {
    // For now, temp chats are not URL-routed. Just clear active session
    // and let ChatContainer render empty state
    try {
      localStorage.setItem("agenticos-temp-mode", "true");
    } catch {}
    setDrawerOpen(false);
  }, []);

  const handleExitTemp = useCallback(() => {
    try {
      localStorage.removeItem("agenticos-temp-mode");
    } catch {}
    router.push("/");
  }, [router]);

  // After a new chat is created server-side, navigate to its URL
  const handleSessionCreated = useCallback(
    (id: string) => {
      if (id === sessionId) return;
      try {
        localStorage.setItem("agenticos-active-session", id);
      } catch {}
      router.replace(`/chat/${id}`);
    },
    [router, sessionId]
  );

  return (
    <AuthGate>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop sidebar */}
        <div className="hidden md:flex flex-shrink-0">
          <Sidebar
            activeSessionId={sessionId}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
            onStartTemp={handleStartTemp}
            isTempMode={false}
            refreshKey={sidebarRefreshKey}
          />
        </div>

        {/* Mobile drawer overlay */}
        {drawerOpen && (
          <div
            onClick={() => setDrawerOpen(false)}
            className="md:hidden fixed inset-0 bg-black/40 z-40 animate-fade-in"
          />
        )}

        {/* Mobile drawer sidebar */}
        <div
          className={`md:hidden fixed top-0 left-0 bottom-0 z-50 transform transition-transform duration-300 ease-out ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar
            activeSessionId={sessionId}
            onSelectSession={(id) => {
              handleSelectSession(id);
              setDrawerOpen(false);
            }}
            onNewChat={() => {
              handleNewChat();
              setDrawerOpen(false);
            }}
            onStartTemp={() => {
              handleStartTemp();
              setDrawerOpen(false);
            }}
            onClose={() => setDrawerOpen(false)}
            isTempMode={false}
            refreshKey={sidebarRefreshKey}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          <ChatContainer
            key={sessionId}
            initialSessionId={sessionId}
            initialMessages={initialMessages}
            onSessionCreated={handleSessionCreated}
            onMenuClick={() => setDrawerOpen(true)}
            isTempMode={false}
            onExitTemp={handleExitTemp}
            onStartTemp={handleStartTemp}
          />
        </div>
      </div>
    </AuthGate>
  );
}
