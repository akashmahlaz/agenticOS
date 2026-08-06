// Client wrapper for /c/[id] — handles function props that can't be
// serialized across the RSC boundary. The server component passes
// plain data; this client component provides the UI handlers.

"use client";

import { useState, useCallback } from "react";
import AppShell from "@/components/chat/app-shell";
import ChatView from "@/components/chat/chat-view";
import type { AgentOSUIMessage } from "@/components/chat/types";

export interface ChatSessionClientProps {
  sessionId: string;
  initialMessages: AgentOSUIMessage[];
  initialModel: string;
}

export default function ChatSessionClient({
  sessionId,
  initialMessages,
  initialModel,
}: ChatSessionClientProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const noop = useCallback(() => {}, []);

  return (
    <AppShell activeSessionId={sessionId} isTempMode={false}>
      <ChatView
        initialSessionId={sessionId}
        initialMessages={initialMessages}
        initialModel={initialModel}
        isTempMode={false}
        onMenuClick={() => setDrawerOpen(true)}
        onStartTemp={noop}
        onExitTemp={noop}
      />
    </AppShell>
  );
}
