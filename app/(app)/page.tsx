"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/chat/sidebar";
import ChatContainer from "@/components/chat/chat-container";
import AuthGate from "@/components/auth-gate";

function AppPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlId = searchParams.get("id") || undefined;
  const isTempFromUrl = searchParams.get("temporary-chat") === "true";
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    isTempFromUrl ? null : urlId || null
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Sync URL -> state (NO remount — handled by ChatContainer's internal effect)
  useEffect(() => {
    const target = isTempFromUrl ? null : urlId || null;
    if (target !== activeSessionId) {
      setActiveSessionId(target);
    }
  }, [urlId, isTempFromUrl, activeSessionId]);

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
    router.push("/");
  }, [router]);

  const handleSelectSession = useCallback(
    (id: string) => {
      setActiveSessionId(id);
      setRefreshKey((k) => k + 1);
      setDrawerOpen(false);
      router.push(`/?id=${id}`);
    },
    [router]
  );

  // Session creation — only update URL, do NOT remount or refresh.
  // The ChatContainer manages its own state and will keep the streaming
  // response intact while updating the URL in the background.
  const handleSessionCreated = useCallback(
    (id: string) => {
      setActiveSessionId(id);
      if (isTempFromUrl) {
        router.replace(`/?temporary-chat=true`);
      } else {
        router.replace(`/?id=${id}`);
      }
    },
    [router, isTempFromUrl]
  );

  const handleStartTemp = useCallback(() => {
    setActiveSessionId(null);
    setRefreshKey((k) => k + 1);
    setDrawerOpen(false);
    router.push("/?temporary-chat=true");
  }, [router]);

  const handleExitTemp = useCallback(() => {
    setActiveSessionId(null);
    setRefreshKey((k) => k + 1);
    setDrawerOpen(false);
    router.push("/");
  }, [router]);

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
            isTempMode={isTempFromUrl}
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
            onStartTemp={handleStartTemp}
            onClose={() => setDrawerOpen(false)}
            isTempMode={isTempFromUrl}
            refreshKey={refreshKey}
          />
        </div>

        {/* Main content — no key remount, ChatContainer handles session state internally */}
        <div className="flex-1 flex flex-col min-w-0">
          <ChatContainer
            initialSessionId={activeSessionId}
            onSessionCreated={handleSessionCreated}
            onMenuClick={() => setDrawerOpen(true)}
            isTempMode={isTempFromUrl}
            onExitTemp={handleExitTemp}
            onStartTemp={handleStartTemp}
            refreshKey={refreshKey}
          />
        </div>
      </div>
    </AuthGate>
  );
}

export default function AppPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    }>
      <AppPageInner />
    </Suspense>
  );
}
