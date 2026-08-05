// AppShell — the outer layout with sidebar + main content
// Used by both / (new chat) and /c/[id] (existing chat)

"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./sidebar";
import AuthGate from "@/components/auth-gate";
import { useChatStream } from "./hooks/use-chat-stream";
import type { AgentOSUIMessage } from "./types";

const LS_ACTIVE_SESSION = "agenticos-active-session";
const LS_TEMP_MODE = "agenticos-temp-mode";

export interface AppShellProps {
  /** Active session id (from server component) */
  activeSessionId: string | null;
  /** Whether in temp mode */
  isTempMode: boolean;
  /** The chat view (server or client) */
  chatView: React.ReactNode;
}

export default function AppShell({
  activeSessionId: initialSessionId,
  isTempMode: initialIsTempMode,
  chatView,
}: AppShellProps) {
  const router = useRouter();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    initialSessionId
  );
  const [isTempMode, setIsTempMode] = useState(initialIsTempMode);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Hydrate from localStorage on mount (for refresh-restores-last-session)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_ACTIVE_SESSION);
      const temp = localStorage.getItem(LS_TEMP_MODE);
      if (saved && saved !== initialSessionId) {
        // Server has a session; localStorage has another. Prefer server.
        // Only use localStorage if there's no current session.
        if (!initialSessionId) {
          setActiveSessionId(saved);
          router.replace(`/c/${saved}`);
        }
      }
      if (temp === "true" && !initialIsTempMode) {
        setIsTempMode(true);
      }
    } catch {
      // ignore
    }
  }, [initialSessionId, initialIsTempMode, router]);

  // Persist
  useEffect(() => {
    try {
      if (activeSessionId) {
        localStorage.setItem(LS_ACTIVE_SESSION, activeSessionId);
      } else {
        localStorage.removeItem(LS_ACTIVE_SESSION);
      }
    } catch {}
  }, [activeSessionId]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_TEMP_MODE, String(isTempMode));
    } catch {}
  }, [isTempMode]);

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

  const handleNewChat = useCallback(() => {
    setActiveSessionId(null);
    setIsTempMode(false);
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", "/");
    }
  }, []);

  const handleSelectSession = useCallback((id: string) => {
    setActiveSessionId(id);
    setIsTempMode(false);
    setDrawerOpen(false);
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", `/c/${id}`);
    }
  }, []);

  const handleStartTemp = useCallback(() => {
    setActiveSessionId(null);
    setIsTempMode(true);
    setDrawerOpen(false);
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", "/?temporary-chat=true");
    }
  }, []);

  const handleExitTemp = useCallback(() => {
    setActiveSessionId(null);
    setIsTempMode(false);
    setDrawerOpen(false);
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", "/");
    }
  }, []);

  return (
    <AuthGate>
      <div className="flex h-screen overflow-hidden bg-background">
        <div className="hidden md:flex flex-shrink-0">
          <Sidebar
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
            onStartTemp={handleStartTemp}
            isTempMode={isTempMode}
            refreshKey={sidebarRefreshKey}
          />
        </div>

        {drawerOpen && (
          <div
            onClick={() => setDrawerOpen(false)}
            className="md:hidden fixed inset-0 bg-black/40 z-40 animate-fade-in"
          />
        )}

        <div
          className={`md:hidden fixed top-0 left-0 bottom-0 z-50 transform transition-transform duration-300 ease-out ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
            onStartTemp={handleStartTemp}
            onClose={() => setDrawerOpen(false)}
            isTempMode={isTempMode}
            refreshKey={sidebarRefreshKey}
          />
        </div>

        <div className="flex-1 flex flex-col min-w-0">{chatView}</div>
      </div>
    </AuthGate>
  );
}
