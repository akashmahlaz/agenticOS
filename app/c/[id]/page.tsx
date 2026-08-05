"use client";

import { useState, useCallback, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/chat/sidebar";
import ChatContainer from "@/components/chat/chat-container";
import AuthGate from "@/components/auth-gate";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ChatPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(id);
  const [refreshKey, setRefreshKey] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);

  // Verify session exists
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/sessions/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("agenticos-token") || ""}` },
        });
        if (!res.ok) {
          if (!cancelled) {
            router.replace("/");
          }
          return;
        }
        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) router.replace("/");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  // Update session id if URL param changes
  useEffect(() => {
    setActiveSessionId(id);
  }, [id]);

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
    (newId: string) => {
      setActiveSessionId(newId);
      setRefreshKey((k) => k + 1);
      setDrawerOpen(false);
      router.push(`/c/${newId}`);
    },
    [router]
  );

  const handleSessionCreated = useCallback(
    (newId: string) => {
      setActiveSessionId(newId);
      router.push(`/c/${newId}`);
    },
    [router]
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground animate-pulse">Loading chat…</div>
      </div>
    );
  }

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
              onSessionCreated={handleSessionCreated}
              onMenuClick={() => setDrawerOpen(true)}
            />
          </div>
        </div>
      </div>
    </AuthGate>
  );
}
