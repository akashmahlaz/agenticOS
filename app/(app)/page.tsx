"use client";

import { useState, useCallback, useEffect } from "react";
import Sidebar from "@/components/chat/sidebar";
import ChatContainer from "@/components/chat/chat-container";
import AuthGate from "@/components/auth-gate";

export default function AppPage() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  const handleNewChat = useCallback(() => {
    setActiveSessionId(null);
    setRefreshKey((k) => k + 1);
    setDrawerOpen(false);
  }, []);

  const handleSelectSession = useCallback((id: string) => {
    setActiveSessionId(id);
    setRefreshKey((k) => k + 1);
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
            refreshKey={refreshKey}
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
            onClose={() => setDrawerOpen(false)}
            refreshKey={refreshKey}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          <div key={refreshKey} className="flex-1 flex flex-col overflow-hidden">
            <ChatContainer
              initialSessionId={activeSessionId}
              onSessionCreated={setActiveSessionId}
              onMenuClick={() => setDrawerOpen(true)}
            />
          </div>
        </div>
      </div>
    </AuthGate>
  );
}
