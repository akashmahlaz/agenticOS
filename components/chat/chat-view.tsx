// ChatView — the main chat view (replaces the old 1100-line chat-container)
// Composes ChatHeader, ChatMessage, ChatInput, ChatEmptyState
// Uses useChatStream hook for all the streaming state
// All session/temp state is passed in via props (managed by the parent page)

"use client";

import { useCallback, useEffect, useState } from "react";
import { Conversation } from "@/components/ai-elements/conversation";
import ChatHeader from "./chat-header";
import ChatMessage from "./chat-message";
import ChatInput from "./chat-input";
import ChatEmptyState from "./chat-empty-state";
import MessageActionBar from "./message-action-bar";
import { useChatStream } from "./hooks/use-chat-stream";
import { useAuth } from "@/components/auth-wrapper";
import type { AgentOSUIMessage } from "./types";

const DEFAULT_MODEL = "MiniMax-M2";

export interface ChatViewProps {
  /** Server-supplied initial session id (from path-based routing) */
  initialSessionId: string | null;
  /** Server-supplied initial messages */
  initialMessages?: AgentOSUIMessage[];
  /** Initial model */
  initialModel?: string;
  /** Is this a temporary chat */
  isTempMode: boolean;
  /** Mobile menu */
  onMenuClick: () => void;
  /** Temp mode actions */
  onExitTemp: () => void;
  onStartTemp: () => void;
}

export default function ChatView(props: ChatViewProps) {
  const { user } = useAuth();
  const [model, setModel] = useState(props.initialModel || DEFAULT_MODEL);
  const [isShared, setIsShared] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [showShareBanner, setShowShareBanner] = useState(false);
  const [copied, setCopied] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);

  const stream = useChatStream({
    initialSessionId: props.initialSessionId,
    initialMessages: props.initialMessages,
    model,
    isTemporary: props.isTempMode,
  });

  // Load share state when session changes
  useEffect(() => {
    if (!props.initialSessionId) {
      setIsShared(false);
      setShareToken(null);
      return;
    }
    fetch(`/api/sessions/${props.initialSessionId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.isShared === "boolean") {
          setIsShared(data.isShared);
          setShareToken(data.shareToken ?? null);
        }
      })
      .catch(() => {});
  }, [props.initialSessionId]);

  const handleToggleShare = useCallback(async () => {
    if (!stream.sessionId) return;
    try {
      const res = await fetch(`/api/sessions/${stream.sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isShared: !isShared }),
      });
      const data = await res.json();
      setIsShared(!!data.isShared);
      setShareToken(data.shareToken ?? null);
      setShowShareBanner(!!data.isShared);
    } catch (err) {
      console.error("Share toggle failed", err);
    }
  }, [stream.sessionId, isShared]);

  const handleCopyShare = useCallback(() => {
    if (!shareToken) return;
    const url = `${window.location.origin}/share/${shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareToken]);

  const handlePickSuggestion = useCallback(
    (prompt: string) => {
      stream.setInput(prompt);
      // Submit on next tick so React has the updated value
      setTimeout(() => stream.submit(), 0);
    },
    [stream]
  );

  const isEmpty = stream.messages.length === 0;
  const lastMessage = stream.messages[stream.messages.length - 1];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ChatHeader
        onMenuClick={props.onMenuClick}
        isTempMode={props.isTempMode}
        onExitTemp={props.onExitTemp}
        onStartTemp={props.onStartTemp}
        model={model}
        onModelChange={setModel}
        isShared={isShared}
        shareToken={shareToken}
        onToggleShare={handleToggleShare}
        showShareBanner={showShareBanner}
        copied={copied}
        onCopyShare={handleCopyShare}
      />

      {isEmpty ? (
        <ChatEmptyState
          userName={user?.name?.split(" ")[0]}
          onPick={handlePickSuggestion}
        />
      ) : (
        <Conversation>
          {stream.messages.map((message) => {
            const text = getText(message);
            return (
              <div key={message.id} className="space-y-2">
                <ChatMessage
                  message={message}
                  isStreaming={
                    stream.isStreaming && message === lastMessage
                  }
                />
                {message.role === "assistant" && !stream.isStreaming && text && (
                  <MessageActionBar
                    messageId={message.id}
                    content={text}
                    onRegenerate={() => stream.reload()}
                  />
                )}
              </div>
            );
          })}
        </Conversation>
      )}

      <div className="border-t bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-3 py-3 sm:px-4 sm:py-4">
          <ChatInput
            value={stream.input}
            onChange={stream.setInput}
            onSubmit={stream.submit}
            isStreaming={stream.isStreaming}
            onStop={stream.stop}
            useWebSearch={useWebSearch}
            onToggleWebSearch={setUseWebSearch}
          />
        </div>
      </div>
    </div>
  );
}

function getText(message: AgentOSUIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}
