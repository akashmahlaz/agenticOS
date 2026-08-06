// ChatContainer — simple, reliable chat
// Uses useChat from @ai-sdk/react
// Falls back to simple text rendering if AI Elements fail

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useAuth } from "@/components/auth-wrapper";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import MessageActionBar from "./message-action-bar";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import {
  BookOpenIcon,
  CodeIcon,
  SearchIcon,
  SparklesIcon,
  MenuIcon,
  MessageCircleDashedIcon,
  ShareIcon,
  CheckIcon,
  XIcon,
} from "lucide-react";

const DEFAULT_MODEL = "MiniMax-M2";
const LS_ACTIVE_SESSION = "agenticos-active-session";
const LS_TEMP_MODE = "agenticos-temp-mode";

export interface ChatContainerProps {
  initialSessionId: string | null;
  onSessionCreated?: (id: string) => void;
  onMenuClick?: () => void;
  isTempMode: boolean;
  onExitTemp: () => void;
  onStartTemp: () => void;
}

const PROMPT_SUGGESTIONS = [
  { icon: SearchIcon, title: "Research", description: "Look up the latest on any topic", prompt: "Research the latest developments in AI agents" },
  { icon: CodeIcon, title: "Code", description: "Write, debug, or refactor code", prompt: "Write a TypeScript function that flattens a nested array" },
  { icon: BookOpenIcon, title: "Learn", description: "Explain a concept or skill", prompt: "Explain how vector embeddings work for semantic search" },
  { icon: SparklesIcon, title: "Create", description: "Brainstorm, draft, or design", prompt: "Help me draft a PRD for a new feature" },
];

export default function ChatContainer(props: ChatContainerProps) {
  const { user, token } = useAuth();
  const [isShared, setIsShared] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);

  // Refs for current sessionId (so transport can read latest)
  const sessionIdRef = useRef<string | null>(props.initialSessionId);
  const isTempRef = useRef<boolean>(props.isTempMode);

  useEffect(() => {
    sessionIdRef.current = props.initialSessionId;
    isTempRef.current = props.isTempMode;
  }, [props.initialSessionId, props.isTempMode]);

  // Load share state
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

  // Transport with current auth + session
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

  const { messages, sendMessage, status, stop, error, regenerate } = useChat<UIMessage>({
    id: props.initialSessionId ?? "default",
    transport,
    onData: (part) => {
      // Capture the server-created session id
      if (part.type === "data-session") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sid = (part.data as any)?.sessionId;
        if (sid && sid !== sessionIdRef.current) {
          sessionIdRef.current = sid;
          try {
            localStorage.setItem(LS_ACTIVE_SESSION, sid);
          } catch {}
          window.dispatchEvent(new Event("agenticos-refresh-sessions"));
          props.onSessionCreated?.(sid);
        }
      }
    },
    onError: (err) => {
      console.error("[chat] useChat error:", err);
    },
  });

  const isStreaming = status === "streaming" || status === "submitted";
  const isEmpty = messages.length === 0;

  // Log state for debugging
  useEffect(() => {
    if (typeof window !== "undefined") {
      console.log("[chat state]", { status, messageCount: messages.length, hasError: !!error });
    }
  }, [status, messages.length, error]);

  const handleSubmit = useCallback(
    (message: { text: string; files?: unknown[] }) => {
      const text = (message?.text || "").trim();
      if (!text) return;
      if (isStreaming) return;

      sendMessage(
        { text },
        {
          body: {
            sessionId: sessionIdRef.current,
            model: DEFAULT_MODEL,
            isTemporary: isTempRef.current,
          },
        }
      );
    },
    [isStreaming, sendMessage]
  );

  const handleSuggestion = useCallback(
    (prompt: string) => {
      handleSubmit({ text: prompt, files: [] });
    },
    [handleSubmit]
  );

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-3 md:px-5 h-12 flex-shrink-0 bg-background/90 backdrop-blur-md border-b">
        <div className="flex items-center gap-2 min-w-0">
          {props.onMenuClick && (
            <button
              onClick={props.onMenuClick}
              className="md:hidden p-2 rounded-lg hover:bg-secondary text-foreground transition-colors"
              aria-label="Open menu"
            >
              <MenuIcon size={18} />
            </button>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/40">
            <SparklesIcon size={15} className="text-teal" />
            <span className="text-[15px] font-medium">agenticOS</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {props.isTempMode ? (
            <button
              onClick={props.onExitTemp}
              className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-label="Close temporary chat"
              title="Close temporary chat"
            >
              <XIcon size={16} />
            </button>
          ) : (
            <>
              {props.onStartTemp && (
                <button
                  onClick={props.onStartTemp}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  aria-label="Start temporary chat"
                  title="Temporary chat"
                >
                  <MessageCircleDashedIcon size={16} />
                </button>
              )}
              {props.initialSessionId && (
                <button
                  onClick={() => {
                    if (!sessionIdRef.current) return;
                    fetch(`/api/sessions/${sessionIdRef.current}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ isShared: !isShared }),
                    })
                      .then((r) => r.json())
                      .then((data) => {
                        setIsShared(data.isShared ?? !isShared);
                        setShareToken(data.shareToken ?? null);
                      })
                      .catch(() => {});
                  }}
                  className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                    isShared
                      ? "bg-teal/15 text-teal border border-teal/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                  aria-label="Share chat"
                  title={isShared ? "Shared" : "Share chat"}
                >
                  {isShared ? <CheckIcon size={14} /> : <ShareIcon size={14} />}
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {/* Conversation */}
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
          <div className="h-full flex flex-col items-center justify-center px-4 pb-32">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal/20 to-coral/20 flex items-center justify-center mb-3">
              <SparklesIcon size={22} className="text-teal" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-1">
              {props.isTempMode ? "Temporary chat" : `Hi ${user?.name?.split(" ")[0] || "there"}`}
            </h2>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
              {props.isTempMode
                ? "This conversation won't be saved. Start typing to begin."
                : "What can I help you build today?"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
              {PROMPT_SUGGESTIONS.map((s) => (
                <button
                  key={s.title}
                  onClick={() => handleSuggestion(s.prompt)}
                  className="flex items-start gap-3 p-3 rounded-xl border border-border bg-background hover:bg-muted/50 hover:border-foreground/20 transition-all text-left"
                >
                  <s.icon size={18} className="text-teal mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">{s.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <Conversation className="h-full">
            <ConversationContent className="p-3 md:p-5 space-y-5 max-w-3xl mx-auto w-full pb-4">
              {messages.map((message, idx) => {
                const isLast = idx === messages.length - 1;
                return (
                  <SimpleMessage
                    key={message.id}
                    message={message}
                    isStreaming={isStreaming && isLast}
                    onRegenerate={isLast && !isStreaming && message.role === "assistant" ? () => regenerate?.() : undefined}
                  />
                );
              })}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        )}
      </div>

      {/* Input — in normal flow at the bottom */}
      <div className="flex-shrink-0 border-t bg-background/95 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-3 md:px-5 py-3">
          <PromptInput
            onSubmit={handleSubmit as (m: PromptInputMessage) => void}
            className="relative border border-foreground/10 bg-input-elevated shadow-[0_2px_24px_-8px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_28px_-4px_rgba(0,0,0,0.4)] focus-within:border-foreground/30 rounded-[28px] transition-all"
          >
            <PromptInputBody>
              <PromptInputTextarea
                placeholder="Ask anything…"
                className="min-h-12 max-h-40 text-[15px] leading-relaxed placeholder:text-muted-foreground/60 resize-none border-0 !bg-transparent !shadow-none !ring-0 px-4 py-3 focus-visible:!outline-none focus-visible:!ring-0"
                rows={1}
              />
            </PromptInputBody>
            <PromptInputFooter className="px-2 pb-2 pt-0">
              <PromptInputTools className="gap-0.5" />
              <PromptInputSubmit
                status={isStreaming ? "streaming" : "ready"}
                onClick={(e) => {
                  if (isStreaming) {
                    e.preventDefault();
                    stop();
                  }
                }}
                className="!h-10 !w-10 !rounded-full !bg-foreground !text-background hover:!bg-foreground/90 disabled:!bg-muted disabled:!text-muted-foreground shadow-sm transition-all [&_svg]:!size-4"
              />
            </PromptInputFooter>
          </PromptInput>
          <p className="text-center text-[10px] text-muted-foreground/60 mt-2 px-2">
            agenticOS can make mistakes. Verify important info.
          </p>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// SimpleMessage — renders a single message with plain text + markdown
// Avoids all the complex AI Elements that could fail
// ──────────────────────────────────────────────

interface SimpleMessageProps {
  message: UIMessage;
  isStreaming: boolean;
  onRegenerate?: () => void;
}

function SimpleMessage({ message, isStreaming, onRegenerate }: SimpleMessageProps) {
  const isUser = message.role === "user";

  // Extract text from all parts
  const fullText = message.parts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((p: any) => p.type === "text")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p: any) => p.text || "")
    .join("");

  // Extract reasoning
  const reasoningText = message.parts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((p: any) => p.type === "reasoning")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p: any) => p.text || "")
    .join("\n\n");

  return (
    <Message from={message.role}>
      <MessageContent>
        {/* Reasoning — collapsible, shows while streaming */}
        {reasoningText && (
          <details
            open={isStreaming}
            className="mb-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
          >
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground flex items-center gap-2">
              {isStreaming ? (
                <Shimmer duration={1.5}>Thinking…</Shimmer>
              ) : (
                <span>Thought process</span>
              )}
            </summary>
            <div className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
              {reasoningText}
            </div>
          </details>
        )}

        {/* Text content */}
        {fullText ? (
          isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{fullText}</p>
          ) : (
            <MarkdownText text={fullText} />
          )
        ) : isStreaming ? (
          <Shimmer duration={1}>Thinking…</Shimmer>
        ) : null}

        {/* Action bar for finished AI messages */}
        {!isUser && !isStreaming && fullText && onRegenerate && (
          <MessageActionBar
            messageId={message.id}
            content={fullText}
            onRegenerate={onRegenerate}
          />
        )}
      </MessageContent>
    </Message>
  );
}

// Simple markdown renderer — handles basic formatting without dependencies
function MarkdownText({ text }: { text: string }) {
  // Split into blocks (paragraphs, code blocks, lists)
  const blocks = text.split(/\n\n+/);

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      {blocks.map((block, i) => {
        // Code block
        if (block.startsWith("```")) {
          const match = block.match(/^```(\w+)?\n([\s\S]+?)\n```$/);
          if (match) {
            return (
              <pre key={i} className="bg-muted/50 border border-border rounded-lg p-3 overflow-x-auto text-xs my-2">
                <code className="text-foreground">{match[2]}</code>
              </pre>
            );
          }
        }

        // List
        if (block.match(/^[\-\*]\s/m)) {
          const items = block.split(/\n/).filter(Boolean);
          return (
            <ul key={i} className="list-disc pl-5 my-2 space-y-1">
              {items.map((item, j) => (
                <li key={j} className="text-sm">{renderInline(item.replace(/^[\-\*]\s/, ""))}</li>
              ))}
            </ul>
          );
        }

        // Numbered list
        if (block.match(/^\d+\.\s/m)) {
          const items = block.split(/\n/).filter(Boolean);
          return (
            <ol key={i} className="list-decimal pl-5 my-2 space-y-1">
              {items.map((item, j) => (
                <li key={j} className="text-sm">{renderInline(item.replace(/^\d+\.\s/, ""))}</li>
              ))}
            </ol>
          );
        }

        // Heading
        if (block.startsWith("# ")) {
          return <h1 key={i} className="text-lg font-semibold mt-3 mb-2">{renderInline(block.slice(2))}</h1>;
        }
        if (block.startsWith("## ")) {
          return <h2 key={i} className="text-base font-semibold mt-3 mb-1">{renderInline(block.slice(3))}</h2>;
        }
        if (block.startsWith("### ")) {
          return <h3 key={i} className="text-sm font-semibold mt-2 mb-1">{renderInline(block.slice(4))}</h3>;
        }

        // Default paragraph
        return <p key={i} className="text-sm leading-relaxed my-2">{renderInline(block)}</p>;
      })}
    </div>
  );
}

// Inline markdown: **bold**, *italic*, `code`, [text](url)
function renderInline(text: string): React.ReactNode {
  // First handle inline code (so we don't process markdown inside it)
  const codeRegex = /`([^`]+)`/g;
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = codeRegex.exec(text)) !== null) {
    if (m.index > lastIdx) {
      parts.push(renderTextFormatting(text.slice(lastIdx, m.index), key));
      key++;
    }
    parts.push(
      <code key={key++} className="px-1 py-0.5 rounded bg-muted/50 border border-border/50 text-xs font-mono">
        {m[1]}
      </code>
    );
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) {
    parts.push(renderTextFormatting(text.slice(lastIdx), key));
  }
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

function renderTextFormatting(text: string, key: number): React.ReactNode {
  // Handle **bold**, *italic*, [text](url)
  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let subKey = 0;

  // Pattern: **bold**, *italic*, [text](url)
  const combined = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = combined.exec(remaining)) !== null) {
    if (m.index > lastIdx) {
      nodes.push(remaining.slice(lastIdx, m.index));
    }
    const match = m[0];
    if (match.startsWith("**")) {
      nodes.push(<strong key={`${key}-${subKey++}`}>{match.slice(2, -2)}</strong>);
    } else if (match.startsWith("*")) {
      nodes.push(<em key={`${key}-${subKey++}`}>{match.slice(1, -1)}</em>);
    } else if (match.startsWith("[")) {
      const linkMatch = match.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        nodes.push(
          <a
            key={`${key}-${subKey++}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal underline"
          >
            {linkMatch[1]}
          </a>
        );
      }
    }
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < remaining.length) {
    nodes.push(remaining.slice(lastIdx));
  }
  return nodes.length === 1 ? nodes[0] : <>{nodes}</>;
}
