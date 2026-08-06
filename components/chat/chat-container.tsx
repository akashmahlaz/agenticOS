// ChatContainer — the main chat view
// Uses useChat from @ai-sdk/react (the official Vercel AI SDK hook)
// All session/temp state is passed in via props
// The actual message rendering delegates to <MessageParts> which knows
// how to render each UIMessage part type using official AI Elements.

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useAuth } from "@/components/auth-wrapper";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ai-elements/reasoning";
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Sources, SourcesTrigger, SourcesContent, Source } from "@/components/ai-elements/sources";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTools,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionMenuItem,
  PromptInputActionAddAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import {
  ModelSelector,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorName,
} from "@/components/ai-elements/model-selector";
import MessageActionBar from "./message-action-bar";
import SubAgentActivity from "./subagent-activity";
import InlineQuestion from "./inline-question";
import {
  BrainIcon,
  CheckIcon,
  MenuIcon,
  MessageCircleDashedIcon,
  SearchIcon,
  SparklesIcon,
  XIcon,
  ShareIcon,
  CodeIcon,
  BookOpenIcon,
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
  {
    icon: SearchIcon,
    title: "Research",
    description: "Look up the latest on any topic",
    prompt: "Research the latest developments in AI agents",
  },
  {
    icon: CodeIcon,
    title: "Code",
    description: "Write, debug, or refactor code",
    prompt: "Write a TypeScript function that flattens a nested array",
  },
  {
    icon: BookOpenIcon,
    title: "Learn",
    description: "Explain a concept or skill",
    prompt: "Explain how vector embeddings work for semantic search",
  },
  {
    icon: SparklesIcon,
    title: "Create",
    description: "Brainstorm, draft, or design",
    prompt: "Help me draft a PRD for a new feature",
  },
];

export default function ChatContainer(props: ChatContainerProps) {
  const { user, token } = useAuth();
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [isShared, setIsShared] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [showShareBanner, setShowShareBanner] = useState(false);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [subagentEvents, setSubagentEvents] = useState<Array<Record<string, unknown>>>([]);
  const [inlineQuestion, setInlineQuestion] = useState<{
    id: string;
    prompt: string;
    fields: Array<{ name: string; label: string; type: "text" | "select" | "multiselect"; options?: string[]; required?: boolean }>;
  } | null>(null);

  // Refs for current sessionId (so useChat transport can read latest)
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

  // The transport: calls /api/chat with UIMessage format, expects UIMessageStream
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: () => ({ Authorization: `Bearer ${token ?? ""}` }),
        body: () => ({
          sessionId: sessionIdRef.current,
          model,
          isTemporary: isTempRef.current,
        }),
      }),
    [token, model]
  );

  const { messages, sendMessage, status, stop, error, regenerate } = useChat<UIMessage>({
    id: props.initialSessionId ?? undefined,
    transport,
    onData: (part) => {
      // Server emits custom data-* parts we care about
      if (part.type === "data-session") {
        const sid = (part.data as { sessionId: string }).sessionId;
        if (sid && sid !== sessionIdRef.current) {
          sessionIdRef.current = sid;
          try {
            localStorage.setItem(LS_ACTIVE_SESSION, sid);
          } catch {}
          window.dispatchEvent(new Event("agenticos-refresh-sessions"));
          props.onSessionCreated?.(sid);
        }
      } else if (part.type === "data-subagent") {
        setSubagentEvents((prev) => [...prev, part.data as Record<string, unknown>]);
      } else if (part.type === "data-question") {
        const q = part.data as typeof inlineQuestion;
        if (q) setInlineQuestion({ ...q, id: `q-${Date.now()}` });
      }
    },
    onError: (err) => {
      console.error("[chat] useChat error:", err);
    },
  });

  const isStreaming = status === "streaming" || status === "submitted";
  const isEmpty = messages.length === 0;
  const lastMessage = messages[messages.length - 1];

  const handleSubmit = useCallback(
    async (message: { text: string; files?: unknown[] }) => {
      const text = (message?.text || "").trim();
      if (!text && (!message?.files || message.files.length === 0)) return;
      if (isStreaming) return;

      // Clear any pending inline question
      setInlineQuestion(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const files = (message.files as any[]) || [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sendMessage(
        {
          text: text || "Sent with attachments",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          files: files.map((f) => ({
            type: "file",
            mediaType: f.mediaType,
            filename: f.filename,
            // data: URL or remote URL
            url: f.url ?? f.dataURL,
          })) as any,
        },
        {
          body: {
            sessionId: sessionIdRef.current,
            model,
            isTemporary: isTempRef.current,
          },
        }
      );
    },
    [isStreaming, sendMessage, model]
  );

  const handleSuggestion = useCallback(
    (prompt: string) => {
      handleSubmit({ text: prompt, files: [] });
    },
    [handleSubmit]
  );

  const handleToggleShare = useCallback(async () => {
    if (!sessionIdRef.current) return;
    try {
      const res = await fetch(`/api/sessions/${sessionIdRef.current}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isShared: !isShared }),
      });
      const data = await res.json();
      if (data) {
        setIsShared(data.isShared ?? !isShared);
        setShareToken(data.shareToken ?? null);
        if (data.shareToken) setShowShareBanner(true);
      }
    } catch (err) {
      console.error("Toggle share failed:", err);
    }
  }, [isShared]);

  const handleCopyShare = useCallback(() => {
    if (!shareToken) return;
    const url = `${window.location.origin}/share/${shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareToken]);

  const [copied, setCopied] = useState(false);

  const handleInlineQuestionAnswer = useCallback(
    (answer: Record<string, string | string[]>) => {
      const answerText = Object.entries(answer)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
        .join("\n");
      setInlineQuestion(null);
      // Send the answer as a new user message
      sendMessage(
        { text: answerText },
        {
          body: {
            sessionId: sessionIdRef.current,
            model,
            isTemporary: isTempRef.current,
          },
        }
      );
    },
    [sendMessage, model]
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
          <ModelSelector open={modelSelectorOpen} onOpenChange={setModelSelectorOpen}>
            <ModelSelectorTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-muted text-foreground text-[15px] font-medium transition-colors">
                <SparklesIcon size={15} className="text-teal" />
                <span className="truncate">agenticOS</span>
              </button>
            </ModelSelectorTrigger>
            <ModelSelectorContent>
              <ModelSelectorInput placeholder="Search models..." />
              <ModelSelectorList>
                <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                <ModelSelectorGroup heading="Available">
                  <ModelSelectorItem value={DEFAULT_MODEL} onSelect={() => { setModel(DEFAULT_MODEL); setModelSelectorOpen(false); }}>
                    <ModelSelectorName>MiniMax M2</ModelSelectorName>
                  </ModelSelectorItem>
                </ModelSelectorGroup>
              </ModelSelectorList>
            </ModelSelectorContent>
          </ModelSelector>
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
                  onClick={handleToggleShare}
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

      {/* Share banner */}
      {isShared && shareToken && showShareBanner && (
        <div className="px-3 md:px-5 py-2 bg-teal/10 border-b border-teal/20 text-xs text-teal flex items-center justify-between gap-2">
          <span className="truncate flex-1 font-mono text-[11px]">
            {typeof window !== "undefined" ? window.location.origin : ""}/share/{shareToken}
          </span>
          <button
            onClick={handleCopyShare}
            className="px-2 py-1 rounded bg-teal/20 hover:bg-teal/30 transition-colors flex items-center gap-1"
          >
            {copied ? <CheckIcon size={11} /> : <ShareIcon size={11} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      )}

      {/* Conversation — takes the remaining space, input below it in normal flow */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {isEmpty && !isStreaming ? (
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
                  <MessageParts
                    key={message.id}
                    message={message}
                    isStreaming={isStreaming && isLast}
                    subagentEvents={
                      message.role === "assistant" && isLast
                        ? subagentEvents
                        : undefined
                    }
                    onRegenerate={
                      isLast && message.role === "assistant" && !isStreaming
                        ? () => regenerate()
                        : undefined
                    }
                  />
                );
              })}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        )}
      </div>

      {/* Inline question UI (if any) */}
      {inlineQuestion && (
        <div className="px-3 md:px-5 py-3 border-t bg-background">
          <InlineQuestion
            question={inlineQuestion}
            onSubmit={handleInlineQuestionAnswer}
            disabled={isStreaming}
          />
        </div>
      )}

      {/* Input — in normal flow at the bottom, NOT fixed. Sticky border-t separates it from the conversation. */}
      <div className="flex-shrink-0 border-t bg-background/95 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-3 md:px-5 py-3">
          <PromptInput
            onSubmit={handleSubmit as (m: PromptInputMessage) => void}
            globalDrop
            multiple
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
              <PromptInputTools className="gap-0.5">
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionMenuItem onClick={() => {/* placeholder */}}>
                      <BrainIcon size={14} className="mr-2" />
                      Deep Research
                    </PromptInputActionMenuItem>
                    <PromptInputActionAddAttachments />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
              </PromptInputTools>
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
// MessageParts — renders a single message using AI Element components
// Maps UIMessage parts (text, reasoning, tool-*, source-url, data-*) to JSX
// ──────────────────────────────────────────────

interface MessagePartsProps {
  message: UIMessage;
  isStreaming: boolean;
  subagentEvents?: Array<Record<string, unknown>>;
  onRegenerate?: () => void;
}

function MessageParts({ message, isStreaming, subagentEvents, onRegenerate }: MessagePartsProps) {
  const isUser = message.role === "user";

  // Consolidate reasoning parts
  const reasoningParts = message.parts.filter((p) => p.type === "reasoning");
  const reasoningText = reasoningParts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p: any) => p.text)
    .filter(Boolean)
    .join("\n\n");
  const lastPart = message.parts[message.parts.length - 1];
  const isReasoningStreaming =
    isStreaming && !isUser && lastPart?.type === "reasoning";

  // Extract tool parts and source parts
  const textParts = message.parts.filter((p) => p.type === "text");
  const toolParts = message.parts.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any) => typeof p.type === "string" && p.type.startsWith("tool-") || p.type === "dynamic-tool"
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sourceParts = message.parts.filter((p: any) => p.type === "source-url");

  return (
    <Message from={message.role}>
      <MessageContent>
        {/* Reasoning block — auto-opens while streaming, auto-closes when done */}
        {reasoningText && (
          <Reasoning isStreaming={isReasoningStreaming} defaultOpen={isReasoningStreaming}>
            <ReasoningTrigger />
            <ReasoningContent>{reasoningText}</ReasoningContent>
          </Reasoning>
        )}

        {/* Tool calls — official AI Elements Tool component */}
        {toolParts.map((part, i) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tp = part as any;
          return (
            <Tool key={`${message.id}-tool-${i}`} defaultOpen={isStreaming}>
              <ToolHeader
                type={tp.type}
                state={tp.state}
                title={tp.toolName ?? "Tool"}
              />
              <ToolContent>
                {tp.input !== undefined && <ToolInput input={tp.input} />}
                {tp.output !== undefined && <ToolOutput output={tp.output} errorText={tp.errorText} />}
              </ToolContent>
            </Tool>
          );
        })}

        {/* Sources — collapsible citation list */}
        {sourceParts.length > 0 && (
          <Sources>
            <SourcesTrigger count={sourceParts.length} />
            <SourcesContent>
              {sourceParts.map((part, i) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const sp = part as any;
                return (
                  <Source key={`${message.id}-src-${i}`} href={sp.url} title={sp.title ?? sp.url}>
                    {sp.title ?? sp.url}
                  </Source>
                );
              })}
            </SourcesContent>
          </Sources>
        )}

        {/* Sub-agent activity (delegation timeline) */}
        {subagentEvents && subagentEvents.length > 0 && (
          <SubAgentActivity
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            events={subagentEvents as any}
            isStreaming={isStreaming}
          />
        )}

        {/* Text content (markdown via Streamdown) */}
        {textParts.map((part, i) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tp = part as any;
          if (!tp.text) return null;
          if (isUser) {
            return (
              <p key={`${message.id}-text-${i}`} className="text-sm leading-relaxed whitespace-pre-wrap">
                {tp.text}
              </p>
            );
          }
          return (
            <MessageResponse key={`${message.id}-text-${i}`}>{tp.text}</MessageResponse>
          );
        })}

        {/* Empty content + streaming → Shimmer */}
        {textParts.length === 0 &&
          reasoningText === "" &&
          toolParts.length === 0 &&
          isStreaming && (
            <Shimmer duration={1}>Thinking…</Shimmer>
          )}

        {/* Action bar for finished AI messages */}
        {!isUser && !isStreaming && message.parts.some((p) => p.type === "text" && (p as { text?: string }).text) && (
          <MessageActionBar
            messageId={message.id}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            content={textParts.map((p: any) => p.text).join("")}
            onRegenerate={onRegenerate}
          />
        )}
      </MessageContent>
    </Message>
  );
}
