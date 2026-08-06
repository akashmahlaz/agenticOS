// useChatStream — thin wrapper around useChat
// All session/temp state is passed in via props
// Returns messages, sendMessage, status, stop, error, regenerate

"use client";

import { useMemo, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useAuth } from "@/components/auth-wrapper";

const DEFAULT_MODEL = "MiniMax-M2";

export interface UseChatStreamOptions {
  initialSessionId: string | null;
  initialMessages?: UIMessage[];
  isTemporary?: boolean;
}

export function useChatStream(opts: UseChatStreamOptions) {
  const { token } = useAuth();

  // Refs so the transport always reads the latest values
  const sessionIdRef = useRef<string | null>(opts.initialSessionId);
  const isTempRef = useRef<boolean>(!!opts.isTemporary);

  useEffect(() => {
    sessionIdRef.current = opts.initialSessionId;
    isTempRef.current = !!opts.isTemporary;
  }, [opts.initialSessionId, opts.isTemporary]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: () => ({ Authorization: `Bearer ${token ?? ""}` }),
        body: () => ({
          sessionId: sessionIdRef.current,
          model: DEFAULT_MODEL,
          isTemporary: isTempRef.current,
        }),
      }),
    [token]
  );

  const chat = useChat<UIMessage>({
    id: opts.initialSessionId ?? "default",
    transport,
    onData: (part) => {
      // Capture server-created session id
      if (part.type === "data-session") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sid = (part.data as any)?.sessionId;
        if (sid && sid !== sessionIdRef.current) {
          sessionIdRef.current = sid;
          try {
            localStorage.setItem("agenticos-active-session", sid);
          } catch {}
          window.dispatchEvent(new Event("agenticos-refresh-sessions"));
        }
      }
    },
  });

  return chat;
}
