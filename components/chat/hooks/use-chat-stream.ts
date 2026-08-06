// useChatStream — focused wrapper around the AI SDK's useChat hook
// Adds auth headers, session management, and URL coordination via
// window.history.replaceState (no React re-render for URL changes).

"use client";

import { useChat, type UseChatHelpers } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-wrapper";
import type { AgentOSUIMessage } from "../types";

const CHAT_API = "/api/chat";
const LS_ACTIVE_SESSION = "agenticos-active-session";

export interface UseChatStreamOptions {
  /** Initial session id from server component or localStorage */
  initialSessionId: string | null;
  /** Initial messages from server (path-based routing) */
  initialMessages?: AgentOSUIMessage[];
  /** Model id to use (default: MiniMax-M2) */
  model?: string;
  /** Whether this is a temporary chat */
  isTemporary?: boolean;
}

export interface UseChatStreamReturn {
  messages: AgentOSUIMessage[];
  input: string;
  setInput: (value: string) => void;
  submit: () => void;
  status: UseChatHelpers<AgentOSUIMessage>["status"];
  error: Error | undefined;
  stop: () => void;
  reload: () => void;
  setMessages: UseChatHelpers<AgentOSUIMessage>["setMessages"];
  sessionId: string | null;
  isStreaming: boolean;
}

export function useChatStream(
  opts: UseChatStreamOptions
): UseChatStreamReturn {
  const { token } = useAuth();
  const sessionIdRef = useRef<string | null>(opts.initialSessionId);
  const modelRef = useRef<string>(opts.model || "MiniMax-M2");
  const isTemporaryRef = useRef<boolean>(!!opts.isTemporary);
  const [input, setInput] = useState("");

  // The AI SDK's useChat hook — handles all the streaming state
  const chat = useChat<AgentOSUIMessage>({
    id: opts.initialSessionId ?? undefined,
    messages: opts.initialMessages,
    transport: new DefaultChatTransport({
      api: CHAT_API,
      headers: () => ({
        Authorization: `Bearer ${token ?? ""}`,
      }),
      body: () => ({
        sessionId: sessionIdRef.current,
        model: modelRef.current,
        isTemporary: isTemporaryRef.current,
      }),
    }),
    onData: (part) => {
      // Server emits data-session right at the start of a new chat
      if (part.type === "data-session") {
        const newSessionId = (part.data as { sessionId: string }).sessionId;
        if (newSessionId && newSessionId !== sessionIdRef.current) {
          sessionIdRef.current = newSessionId;
          // Update the URL using the history API — NO React re-render
          if (typeof window !== "undefined") {
            const target = isTemporaryRef.current
              ? `/?temporary-chat=true`
              : `/c/${newSessionId}`;
            window.history.replaceState({}, "", target);
          }
          try {
            localStorage.setItem(LS_ACTIVE_SESSION, newSessionId);
          } catch {
            // ignore
          }
          // Notify the sidebar to reload
          window.dispatchEvent(new Event("agenticos-refresh-sessions"));
        }
      }
    },
    onError: (err) => {
      console.error("[chat] useChat error:", err);
    },
  });

  // Keep refs in sync with the latest props
  useEffect(() => {
    sessionIdRef.current = opts.initialSessionId;
    modelRef.current = opts.model || "MiniMax-M2";
    isTemporaryRef.current = !!opts.isTemporary;
  }, [opts.initialSessionId, opts.model, opts.isTemporary]);

  const submit = useCallback(
    (overrideText?: string, files?: Array<{ filename: string; mediaType: string; url: string }>) => {
      const text = (overrideText ?? input).trim();
      if (!text && (!files || files.length === 0)) return;
      if (chat.status === "streaming" || chat.status === "submitted") return;

      // Build message parts: text + file parts (AI SDK 5.x format)
      // The convertToModelMessages function expects {type:'file', url} where
      // url can be a data: URL for inline content.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts: any[] = [];
      if (text) parts.push({ type: "text", text });
      if (files) {
        for (const f of files) {
          parts.push({
            type: "file",
            mediaType: f.mediaType,
            filename: f.filename,
            url: f.url,
          });
        }
      }

      chat.sendMessage(
        { parts },
        {
          body: {
            sessionId: sessionIdRef.current,
            model: modelRef.current,
            isTemporary: isTemporaryRef.current,
          },
        }
      );
      setInput("");
    },
    [input, chat]
  );

  return {
    messages: chat.messages,
    input,
    setInput,
    submit,
    status: chat.status,
    error: chat.error,
    stop: chat.stop,
    reload: chat.regenerate,
    setMessages: chat.setMessages,
    sessionId: sessionIdRef.current,
    isStreaming: chat.status === "streaming" || chat.status === "submitted",
  };
}
