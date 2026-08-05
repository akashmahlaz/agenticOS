// useSidebarSession — manages the active chat session id in component state
// No URL state synchronization (URL is updated via window.history.replaceState
// inside useChatStream on first message).

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const LS_ACTIVE_SESSION = "agenticos-active-session";
const LS_TEMP_MODE = "agenticos-temp-mode";

export interface UseSidebarSessionOptions {
  initialSessionId: string | null;
  isTempMode: boolean;
}

export interface UseSidebarSessionReturn {
  activeSessionId: string | null;
  isTempMode: boolean;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onStartTemp: () => void;
  onExitTemp: () => void;
}

export function useSidebarSession(
  opts: UseSidebarSessionOptions
): UseSidebarSessionReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    opts.initialSessionId
  );
  const [isTempMode, setIsTempMode] = useState(opts.isTempMode);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_ACTIVE_SESSION);
      const temp = localStorage.getItem(LS_TEMP_MODE);
      if (saved) setActiveSessionId(saved);
      if (temp === "true") setIsTempMode(true);
    } catch {
      // localStorage unavailable — use defaults
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

  const onNewChat = useCallback(() => {
    setActiveSessionId(null);
    setIsTempMode(false);
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", "/");
    }
    router.refresh();
  }, [router]);

  const onSelectSession = useCallback(
    (id: string) => {
      setActiveSessionId(id);
      setIsTempMode(false);
      if (typeof window !== "undefined") {
        window.history.pushState({}, "", `/c/${id}`);
      }
      router.refresh();
    },
    [router]
  );

  const onStartTemp = useCallback(() => {
    setActiveSessionId(null);
    setIsTempMode(true);
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", "/?temporary-chat=true");
    }
    router.refresh();
  }, [router]);

  const onExitTemp = useCallback(() => {
    setActiveSessionId(null);
    setIsTempMode(false);
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", "/");
    }
    router.refresh();
  }, [router]);

  // Suppress unused warning
  void searchParams;

  return {
    activeSessionId,
    isTempMode,
    onNewChat,
    onSelectSession,
    onStartTemp,
    onExitTemp,
  };
}
