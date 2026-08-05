"use client";

// AppPage — no URL-based chat navigation.
// All chat state (active session, temp mode) lives in component state +
// localStorage. The URL stays at "/" always. This eliminates the race
// conditions that caused the first-message-of-new-chat bug.

import { useState, useCallback, useEffect } from "react";
import Sidebar from "@/components/chat/sidebar";
import ChatContainer from "@/components/chat/chat-container";
import AuthGate from "@/components/auth-gate";

const LS_ACTIVE_SESSION = "agenticos-active-session";
const LS_TEMP_MODE = "agenticos-temp-mode";

export default function AppPage() {
  // Chat state — local only, no URL sync
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isTempMode, setIsTempMode] = useState(false);
  // Bump this to force the sidebar to reload its session list
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  // UI state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_ACTIVE_SESSION);
      if (saved) setActiveSessionId(saved);
      const temp = localStorage.getItem(LS_TEMP_MODE);
      if (temp === "true") setIsTempMode(true);
    } catch {
      // localStorage unavailable (private mode etc.) — just use defaults
    }
  }, []);

  // Persist to localStorage
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

  // Listen for sidebar refresh events (fired by ChatContainer after a new
  // session or message)
  useEffect(() => {
    const handler = () => setSidebarRefreshKey((k) => k + 1);
    window.addEventListener("agenticos-refresh-sessions", handler);
    return () => window.removeEventListener("agenticos-refresh-sessions", handler);
  }, []);

  // ──────────────────────────────────────────────
  // Handlers — all in-state, no URL changes
  // ──────────────────────────────────────────────

  const handleNewChat = useCallback(() => {
    setActiveSessionId(null);
    setIsTempMode(false);
    setDrawerOpen(false);
  }, []);

  const handleSelectSession = useCallback((id: string) => {
    setActiveSessionId(id);
    setIsTempMode(false);
    setDrawerOpen(false);
  }, []);

  const handleSessionCreated = useCallback((id: string) => {
    // No URL update, no remount. Just set state.
    setActiveSessionId(id);
  }, []);

  const handleStartTemp = useCallback(() => {
    setActiveSessionId(null);
    setIsTempMode(true);
    setDrawerOpen(false);
  }, []);

  const handleExitTemp = useCallback(() => {
    setActiveSessionId(null);
    setIsTempMode(false);
    setDrawerOpen(false);
  }, []);

  return (
    <AuthGate>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop sidebar */}
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
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
            onStartTemp={handleStartTemp}
            onClose={() => setDrawerOpen(false)}
            isTempMode={isTempMode}
            refreshKey={sidebarRefreshKey}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          <ChatContainer
            initialSessionId={activeSessionId}
            onSessionCreated={handleSessionCreated}
            onMenuClick={() => setDrawerOpen(true)}
            isTempMode={isTempMode}
            onExitTemp={handleExitTemp}
            onStartTemp={handleStartTemp}
          />
        </div>
      </div>
    </AuthGate>
  );
}
