// useChatStream — thin wrapper around useChat
// All session/temp/model state is passed in via props
// Returns messages, sendMessage, status, stop, error, regenerate

"use client";

import { useMemo, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useAuth } from "@/components/auth-wrapper";
import { DEFAULT_MODEL_ID } from "@/lib/models";

export interface UseChatStreamOptions {
  initialSessionId: string | null;
  initialMessages?: UIMessage[];
  isTemporary?: boolean;
  model?: string;
}

export function useChatStream(opts: UseChatStreamOptions) {
  const { token } = useAuth();

  // Refs so the transport always reads the latest values
  const sessionIdRef = useRef<string | null>(opts.initialSessionId);
  const isTempRef = useRef<boolean>(!!opts.isTemporary);
  const modelRef = useRef<string>(opts.model ?? DEFAULT_MODEL_ID);

  useEffect(() => {
    sessionIdRef.current = opts.initialSessionId;
    isTempRef.current = !!opts.isTemporary;
    modelRef.current = opts.model ?? DEFAULT_MODEL_ID;
  }, [opts.initialSessionId, opts.isTemporary, opts.model]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: () => ({ Authorization: `Bearer ${token ?? ""}` }),
        body: () => ({
          sessionId: sessionIdRef.current,
          model: modelRef.current,
          isTemporary: isTempRef.current,
        }),
      }),
    [token]
  );

  const chat = useChat<UIMessage>({
    // Use sessionId in the chat id so messages don't bleed across sessions
    id: opts.initialSessionId ?? "default",
    // Seed with loaded messages when a session is selected
    // (AI SDK 7.x uses `messages`, not `initialMessages`)
    messages: opts.initialMessages,
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
