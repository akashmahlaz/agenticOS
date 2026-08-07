// ChatContainer — the chat orchestrator
// Composes ChatHeader + ChatMessage + ChatInput + ChatEmptyState
// Uses useChatStream hook for all the streaming state
//
// Queue is shown when there are pending user messages (sent while
// another response is streaming). All AI Elements primitives are used
// per official patterns. Model selection is managed here and persisted
// to localStorage.

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { UIMessage } from "ai";
import { useAuth } from "@/components/auth-wrapper";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Shimmer } from "@/components/ai-elements/shimmer";
import ChatHeader from "./chat-header";
import ChatMessage from "./chat-message";
import ChatInput from "./chat-input";
import ChatEmptyState from "./chat-empty-state";
import MessageQueue from "./queue";
import { useChatStream } from "./use-chat-stream";
import type { QueuedMessage } from "./queue";
import type { ChatStatus } from "ai";
import { getStoredModel, setStoredModel } from "@/lib/models";
import { loadSessionMessages } from "@/lib/load-messages";

export interface ChatContainerProps {
  initialSessionId: string | null;
  /** Pre-loaded messages (from /chat/[id] server component) */
  initialMessages?: UIMessage[];
  onSessionCreated?: (id: string) => void;
  onMenuClick?: () => void;
  isTempMode: boolean;
  onExitTemp: () => void;
  onStartTemp: () => void;
}

export default function ChatContainer(props: ChatContainerProps) {
  const { user, token } = useAuth();
  const [isShared, setIsShared] = useState(false);
  const [queued, setQueued] = useState<QueuedMessage[]>([]);
  // Hydrate-safe: start with default, then read from localStorage in effect
  const [selectedModel, setSelectedModel] = useState<string>("MiniMax-M3");
  // Loaded messages for the active session (null = not loaded yet)
  const [loadedMessages, setLoadedMessages] = useState<UIMessage[] | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Read persisted model on mount
  useEffect(() => {
    setSelectedModel(getStoredModel());
  }, []);

  // Load messages when the active session changes
  useEffect(() => {
    let cancelled = false;

    // No active session → empty messages
    if (!props.initialSessionId) {
      setLoadedMessages([]);
      return () => {
        cancelled = true;
      };
    }

    // If parent already provided messages (e.g. from /chat/[id] server
    // component), use them directly — no need to fetch again
    if (props.initialMessages) {
      setLoadedMessages(props.initialMessages);
      setIsLoadingMessages(false);
      return () => {
        cancelled = true;
      };
    }

    setIsLoadingMessages(true);
    loadSessionMessages(props.initialSessionId, token)
      .then((msgs) => {
        if (!cancelled) {
          setLoadedMessages(msgs);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadedMessages([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMessages(false);
      });

    return () => {
      cancelled = true;
    };
  }, [props.initialSessionId, token, props.initialMessages]);

  const { messages, sendMessage, status, stop, error, regenerate } = useChatStream({
    initialSessionId: props.initialSessionId,
    // Priority: server-provided messages (from /chat/[id] RSC) first.
    // If those aren't available, use the API-fetched messages (loadedMessages).
    // When neither exists (new chat), use an empty array.
    initialMessages:
      props.initialMessages ??
      (loadedMessages !== null ? loadedMessages : undefined),
    isTemporary: props.isTempMode,
    model: selectedModel,
  });

  // Track if we're streaming to show queue
  const isStreaming = status === "streaming" || status === "submitted";

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

  const handleModelChange = useCallback((modelId: string) => {
    setSelectedModel(modelId);
    setStoredModel(modelId);
  }, []);

  const handleSubmit = useCallback(
    (message: { text: string; files?: unknown[] }) => {
      const text = (message?.text || "").trim();
      if (!text && (!message?.files || message.files.length === 0)) return;

      if (isStreaming) {
        // Queue the message to be sent when current stream completes
        setQueued((q) => [
          ...q,
          { id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text },
        ]);
        return;
      }

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

  // Send all queued messages when streaming finishes
  const wasStreamingRef = useRef(false);
  useEffect(() => {
    if (wasStreamingRef.current && !isStreaming && queued.length > 0) {
      const [first, ...rest] = queued;
      setQueued(rest);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sendMessage(
        { text: first.text } as any,
        {
          body: {
            sessionId: props.initialSessionId,
            isTemporary: props.isTempMode,
          },
        }
      );
    }
    wasStreamingRef.current = isStreaming;
  }, [isStreaming, queued, sendMessage, props.initialSessionId, props.isTempMode]);

  const handleRemoveQueued = useCallback((id: string) => {
    setQueued((q) => q.filter((m) => m.id !== id));
  }, []);

  const handleSubmitQuestion = useCallback(
    (answer: Record<string, string | string[]>) => {
      const text = Object.entries(answer)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
        .join("\n");
      if (!text) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sendMessage({ text } as any, {
        body: {
          sessionId: props.initialSessionId,
          isTemporary: props.isTempMode,
        },
      });
    },
    [sendMessage, props.initialSessionId, props.isTempMode]
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

  const handleNewChat = useCallback(() => {
    try {
      localStorage.removeItem("agenticos-active-session");
    } catch {}
    window.location.href = "/";
  }, []);

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
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
        onRightAction={handleNewChat}
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
        ) : isLoadingMessages && messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shimmer duration={1.2}>Loading chat…</Shimmer>
            </div>
          </div>
        ) : isEmpty(messages) && !isStreaming ? (
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
                    onSubmitQuestion={handleSubmitQuestion}
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

      {/* Queue above input when streaming — no border-t per Gemini style */}
      {isStreaming && queued.length > 0 && (
        <div className="flex-shrink-0 bg-background/95 backdrop-blur-md">
          <div className="max-w-3xl mx-auto px-3 md:px-5 pt-2">
            <MessageQueue
              todos={[]}
              messages={queued}
              onRemoveMessage={handleRemoveQueued}
            />
          </div>
        </div>
      )}

      {/* Input area — no border-t per Gemini style */}
      <div className="flex-shrink-0 bg-background/95 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-3 md:px-5 py-3">
          <ChatInput
            onSubmit={handleSubmit}
            status={status as ChatStatus}
            onStop={() => stop()}
          />
          <p className="text-center text-[10px] text-muted-foreground/60 mt-2 px-2">
            agenticOS can make mistakes. Verify important info.
          </p>
        </div>
      </div>
    </div>
  );
}

function isEmpty(messages: { length: number }): boolean {
  return messages.length === 0;
}
