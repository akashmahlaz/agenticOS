"use client";

import { useState, useCallback } from "react";
import Sidebar from "@/components/chat/sidebar";
import ChatContainer from "@/components/chat/chat-container";
import AuthGate from "@/components/auth-gate";

export default function AppPage() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Create new session and switch to it
  const handleNewChat = useCallback(async () => {
    setActiveSessionId(null);
    setRefreshKey((k) => k + 1);
  }, []);

  // Switch to existing session
  const handleSelectSession = useCallback((id: string) => {
    setActiveSessionId(id);
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <AuthGate>
      <div className="flex h-screen overflow-hidden bg-[#FAFAF9]">
        {/* Sidebar */}
        <div className="hidden md:flex flex-shrink-0">
          <Sidebar
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile header */}
          <div className="md:hidden flex items-center gap-2 px-4 h-12 border-b border-[#E8E0D8] bg-white z-10">
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C1917] text-white rounded-lg text-xs font-medium"
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M5.5 1V10M1 5.5H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              New
            </button>
            <span className="text-sm font-semibold text-[#1C1917]">agenticOS</span>
          </div>

          {/* Chat */}
          <div key={refreshKey} className="flex-1 flex flex-col overflow-hidden">
            <ChatContainer
              initialSessionId={activeSessionId}
              onSessionCreated={setActiveSessionId}
            />
          </div>
        </div>
      </div>
    </AuthGate>
  );
}
