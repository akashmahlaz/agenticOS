// ChatContainer — the chat orchestrator
// Composes ChatHeader + ChatMessage + ChatInput + ChatEmptyState
// Uses useChatStream hook for all the streaming state

"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth-wrapper";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Shimmer } from "@/components/ai-elements/shimmer";
import ChatHeader from "./chat-header";
import ChatMessage from "./chat-message";
import ChatInput from "./chat-input";
import ChatEmptyState from "./chat-empty-state";
import { useChatStream } from "./use-chat-stream";

export interface ChatContainerProps {
  initialSessionId: string | null;
  onSessionCreated?: (id: string) => void;
  onMenuClick?: () => void;
  isTempMode: boolean;
  onExitTemp: () => void;
  onStartTemp: () => void;
}

export default function ChatContainer(props: ChatContainerProps) {
  const { user } = useAuth();
  const [isShared, setIsShared] = useState(false);

  const { messages, sendMessage, status, stop, error, regenerate } = useChatStream({
    initialSessionId: props.initialSessionId,
    isTemporary: props.isTempMode,
  });

  // Load share state
  useEffect(() => {
    if (!props.initialSessionId) {
      setIsShared(false);
      return;
    }
    fetch(`/api/sessions/${props.initialSessionId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.isShared === "boolean") {
          setIsShared(data.isShared);
        }
      })
      .catch(() => {});
  }, [props.initialSessionId]);

  const isStreaming = status === "streaming" || status === "submitted";
  const isEmpty = messages.length === 0;

  const handleSubmit = useCallback(
    (message: { text: string; files?: unknown[] }) => {
      const text = (message?.text || "").trim();
      if (!text && (!message?.files || message.files.length === 0)) return;
      if (isStreaming) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sendMessage(
        {
          text: text || "Sent with attachments",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          files: (message.files as any[]) || [],
        } as any,
        {
          body: {
            sessionId: props.initialSessionId,
            isTemporary: props.isTempMode,
          },
        }
      );
    },
    [isStreaming, sendMessage, props.initialSessionId, props.isTempMode]
  );

  const handleSuggestion = useCallback(
    (prompt: string) => {
      handleSubmit({ text: prompt, files: [] });
    },
    [handleSubmit]
  );

  const handleToggleShare = useCallback(() => {
    if (!props.initialSessionId) return;
    fetch(`/api/sessions/${props.initialSessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isShared: !isShared }),
    })
      .then((r) => r.json())
      .then((data) => setIsShared(data.isShared ?? !isShared))
      .catch(() => {});
  }, [isShared, props.initialSessionId]);

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      <ChatHeader
        onMenuClick={props.onMenuClick}
        isTempMode={props.isTempMode}
        isShared={isShared}
        hasSession={!!props.initialSessionId}
        onExitTemp={props.onExitTemp}
        onStartTemp={props.onStartTemp}
        onToggleShare={handleToggleShare}
      />

      <div className="flex-1 min-h-0 overflow-hidden">
        {error ? (
          <div className="h-full flex flex-col items-center justify-center px-6 text-center">
            <p className="text-sm text-coral">Chat error: {error.message}</p>
            <button
              onClick={() => regenerate?.()}
              className="mt-3 px-3 py-1.5 text-sm rounded-md bg-foreground text-background"
            >
              Retry
            </button>
          </div>
        ) : isEmpty && !isStreaming ? (
          <ChatEmptyState
            isTempMode={props.isTempMode}
            userName={user?.name?.split(" ")[0]}
            onSuggestion={handleSuggestion}
          />
        ) : (
          <Conversation className="h-full">
            <ConversationContent className="p-3 md:p-5 space-y-5 max-w-3xl mx-auto w-full pb-4">
              {messages.map((message, idx) => {
                const isLast = idx === messages.length - 1;
                return (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isLast={isLast}
                    isStreaming={isStreaming}
                    onRegenerate={
                      isLast && !isStreaming && message.role === "assistant"
                        ? () => regenerate?.()
                        : undefined
                    }
                  />
                );
              })}
              {isStreaming && messages.length > 0 && messages[messages.length - 1].role === "user" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
                  <Shimmer duration={1.2}>Thinking…</Shimmer>
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        )}
      </div>

      <div className="flex-shrink-0 border-t bg-background/95 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-3 md:px-5 py-3">
          <ChatInput onSubmit={handleSubmit} status={status} onStop={() => stop()} />
          <p className="text-center text-[10px] text-muted-foreground/60 mt-2 px-2">
            agenticOS can make mistakes. Verify important info.
          </p>
        </div>
      </div>
    </div>
  );
}
