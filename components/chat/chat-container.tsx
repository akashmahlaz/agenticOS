// @ts-nocheck
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/app/(app)/layout";

// ──────────────────────────────────────────────
// AI Elements imports
// ──────────────────────────────────────────────
import { Conversation, ConversationContent, ConversationEmptyState } from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
  ChainOfThoughtContent,
} from "@/components/ai-elements/chain-of-thought";
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Sources, SourcesTrigger, SourcesContent } from "@/components/ai-elements/sources";
import { PromptInput } from "@/components/ai-elements/prompt-input";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
interface ReasoningStep {
  title: string;
  description?: string;
  status: "pending" | "active" | "complete";
}

interface ToolCallPart {
  name: string;
  state: "input-available" | "output-available" | "output-error" | "input-streaming" | "approval-requested";
  args?: Record<string, unknown>;
  result?: unknown;
  errorText?: string;
}

interface SourceItem {
  title?: string;
  url?: string;
  snippet?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CitationItem = any;

interface MessageData {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  reasoningSteps: ReasoningStep[];
  toolCalls: ToolCallPart[];
  citations?: SourceItem[];
  contextUsed?: { total: number; remaining: number };
  model?: string;
  agent?: string;
  createdAt: string;
}

// ──────────────────────────────────────────────
// Icons (inline SVG, no extra deps)
// ──────────────────────────────────────────────
const SparkleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1L8 5.5L12 6L8.5 8.5L9.5 13L7 10.5L4.5 13L5.5 8.5L2 6L6 5.5L7 1Z" fill="currentColor"/>
  </svg>
);
const UserIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <circle cx="6.5" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.1"/>
    <path d="M1.5 12C1.5 9.5 3.7 7.5 6.5 7.5C9.3 7.5 11.5 9.5 11.5 12" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <path d="M5.5 1V10M1 5.5H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// ──────────────────────────────────────────────
// ChainOfThought steps renderer
// ──────────────────────────────────────────────
function ReasoningStepsBlock({ steps, isStreaming }: { steps: ReasoningStep[]; isStreaming: boolean }) {
  if (!steps.length) return null;
  return (
    <ChainOfThought defaultOpen>
      <ChainOfThoughtHeader>
        <span className="text-xs font-medium text-muted-foreground">
          Chain of Thought
          <span className="ml-2 text-[10px] text-muted-foreground/60">
            {steps.filter((s) => s.status === "complete").length}/{steps.length}
          </span>
          {isStreaming && (
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-amber-500">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
              thinking…
            </span>
          )}
        </span>
      </ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        <div className="space-y-2">
          {steps.map((step, i) => (
            <ChainOfThoughtStep
              key={i}
              label={step.title}
              description={step.description}
              status={step.status}
            />
          ))}
        </div>
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}

// ──────────────────────────────────────────────
// Tool call renderer
// ──────────────────────────────────────────────
function ToolCallBlock({ call }: { call: ToolCallPart }) {
  const getState = () => {
    if (call.errorText) return "output-error" as const;
    if (call.result) return "output-available" as const;
    return "input-available" as const;
  };

  const isStreaming = !call.result && !call.errorText;

  return (
    <Tool>
      <ToolHeader
        title={call.name}
        type="dynamic-tool"
        state={getState()}
        toolName={call.name}
      />
      <ToolContent>
        {call.args && Object.keys(call.args).length > 0 && (
          <ToolInput input={call.args as Record<string, unknown>} />
        )}
        {isStreaming ? (
          <div className="flex items-center gap-2 py-2">
            <Shimmer duration={1}>Processing…</Shimmer>
          </div>
        ) : (
          <ToolOutput
            output={call.result as Record<string, unknown>}
            errorText={call.errorText}
          />
        )}
      </ToolContent>
    </Tool>
  );
}

// ──────────────────────────────────────────────
// Source citations
// ──────────────────────────────────────────────
function SourcesBlock({ citations }: { citations?: SourceItem[] }) {
  if (!citations?.length) return null;
  return (
    <Sources>
      <SourcesTrigger count={citations.length}>
        <span className="text-[10px]">📚 {citations.length} source{citations.length > 1 ? "s" : ""}</span>
      </SourcesTrigger>
      <SourcesContent>
        <ul className="space-y-1">
          {citations.map((s, i) => (
            <li key={i} className="text-xs">
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {s.title || s.url}
              </a>
              {s.snippet && (
                <p className="text-muted-foreground text-[10px] mt-0.5">{s.snippet?.slice(0, 150)}</p>
              )}
            </li>
          ))}
        </ul>
      </SourcesContent>
    </Sources>
  );
}

// ──────────────────────────────────────────────
// Context usage
// ──────────────────────────────────────────────
function ContextBlock({ context }: { context?: { total: number; remaining: number } }) {
  if (!context) return null;
  const used = context.total - context.remaining;
  return (
    <div className="text-[10px] text-muted-foreground py-1">
      🧠 Context: {used}/{context.total} tokens
      {context.remaining > 0 && ` · ${context.remaining} remaining`}
    </div>
  );
}

// ──────────────────────────────────────────────
// Message bubble using AI Elements
// ──────────────────────────────────────────────
function MessageBubble({ msg, isStreaming }: { msg: MessageData; isStreaming?: boolean }) {
  const isUser = msg.role === "user";

  return (
    <Message from={msg.role}>
      <MessageContent>
        {/* Reasoning steps (AI only) */}
        {msg.reasoningSteps.length > 0 && (
          <ReasoningStepsBlock steps={msg.reasoningSteps} isStreaming={isStreaming || false} />
        )}

        {/* Tool calls */}
        {msg.toolCalls.map((tc, i) => (
          <ToolCallBlock key={i} call={tc} />
        ))}

        {/* Sources */}
        {msg.citations && <SourcesBlock citations={msg.citations} />}

        {/* Context */}
        {msg.contextUsed && <ContextBlock context={msg.contextUsed} />}

        {/* Main text */}
        {msg.content || (isStreaming ? <Shimmer duration={1}>Thinking…</Shimmer> : null)}
      </MessageContent>
    </Message>
  );
}

// ──────────────────────────────────────────────
// Prompt suggestions
// ──────────────────────────────────────────────
const PROMPT_SUGGESTIONS = [
  "Research a topic deeply",
  "Write and debug code",
  "Analyze data and trends",
  "Plan a project",
  "Explain a concept",
];

// ──────────────────────────────────────────────
// Empty state
// ──────────────────────────────────────────────
function EmptyState({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  return (
    <ConversationEmptyState>
      <div className="flex flex-col items-center justify-center h-full py-20 px-4 text-center space-y-6">
        {/* Logo */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-foreground to-muted-foreground flex items-center justify-center text-background shadow-lg">
            <SparkleIcon />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">agenticOS</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Powered by <span className="font-medium">MiniMax M2</span> with chain-of-thought reasoning and autonomous tool use.
          </p>
        </div>

        {/* Checkpoints / features */}
        <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
          {[
            "Chain-of-thought reasoning",
            "Web search & calculations",
            "Deep research",
            "Tool execution",
            "Session history",
          ].map((f) => (
            <span key={f} className="px-2.5 py-1 rounded-full bg-muted/60 border border-border flex items-center gap-1">
              <span className="text-[8px] text-green-500">✓</span> {f}
            </span>
          ))}
        </div>

        {/* Suggestions */}
        <div className="pt-2">
          <Suggestions>
            {PROMPT_SUGGESTIONS.map((s) => (
              <Suggestion key={s} suggestion={s} onClick={() => onSuggestion(s)} />
            ))}
          </Suggestions>
        </div>

        <p className="text-[10px] text-muted-foreground/50">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </ConversationEmptyState>
  );
}

// ──────────────────────────────────────────────
// Main Chat Container
// ──────────────────────────────────────────────
interface ChatContainerProps {
  initialSessionId?: string | null;
  onSessionCreated?: (id: string) => void;
}

export default function ChatContainer({ initialSessionId, onSessionCreated }: ChatContainerProps) {
  const { token } = useAuth();
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [liveSteps, setLiveSteps] = useState<ReasoningStep[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

  // Create a new session
  const createSession = useCallback(async (): Promise<string> => {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title: "New Chat" }),
    });
    const data = await res.json();
    setSessionId(data.id);
    onSessionCreated?.(data.id);
    setMessages([]);
    setLiveSteps([]);
    return data.id;
  }, [token, onSessionCreated]);

  // Load session messages
  const loadSession = useCallback(async (id: string) => {
    setLoading(true);
    setSessionId(id);
    setMessages([]);
    setLiveSteps([]);
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.messages) {
        setMessages(
          data.messages.map((m: Record<string, unknown>) => ({
            ...m,
            reasoningSteps: Array.isArray(m.reasoningSteps)
              ? m.reasoningSteps
              : JSON.parse(String(m.reasoningSteps || "[]")),
            toolCalls: Array.isArray(m.toolCalls)
              ? m.toolCalls
              : JSON.parse(String(m.toolCalls || "[]")),
            citations: Array.isArray(m.citations)
              ? m.citations
              : (m.citations ? JSON.parse(String(m.citations)) : undefined),
          }))
        );
      }
    } catch (err) {
      console.error("Load session error:", err);
    }
    setLoading(false);
  }, [token]);

  // Load initial session
  useEffect(() => {
    if (initialSessionId) {
      loadSession(initialSessionId);
    } else {
      setSessionId(null);
      setMessages([]);
      setLiveSteps([]);
    }
  }, [initialSessionId, loadSession]);

  // Send message with streaming
  const handleSendMessage = useCallback(async (text: string) => {
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      currentSessionId = await createSession();
    }

    const userMsg: MessageData = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text,
      reasoningSteps: [],
      toolCalls: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLiveSteps([]);
    setLoading(true);
    setIsStreaming(true);

    try {
      // Save user message
      await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
          role: "user",
          content: text,
        }),
      });

      // Stream AI response
      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
          messages: [...messages, { role: "user", content: text }],
          model: "MiniMax-M2",
        }),
      });

      if (!chatRes.ok) {
        const err = await chatRes.json();
        throw new Error(err.error || "Chat failed");
      }

      // Process streaming NDJSON
      const reader = chatRes.body?.getReader();
      if (!reader) throw new Error("No response stream");

      let fullText = "";
      let reasoningSteps: ReasoningStep[] = [];
      let toolCalls: ToolCallPart[] = [];
      let citations: SourceItem[] = [];
      let reasoningBuffer = "";
      let stepBuffer = "";

      const assistantMsg: MessageData = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: "",
        reasoningSteps: [],
        toolCalls: [],
        citations: [],
        model: "MiniMax-M2",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);

            if (data.type === "text-delta") {
              fullText += data.delta;
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = { ...last, content: fullText };
                return updated;
              });
            } else if (data.type === "reasoning") {
              reasoningBuffer += data.text;
              const lines = reasoningBuffer.split(/\n+/).filter(Boolean).slice(-15);
              reasoningSteps = lines.map((s, i, arr) => ({
                title: s.trim().slice(0, 120),
                status: i === arr.length - 1 ? "active" as const : "complete" as const,
              }));
              setLiveSteps(reasoningSteps);
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], reasoningSteps };
                return updated;
              });
            } else if (data.type === "tool-call") {
              const tc: ToolCallPart = {
                name: data.toolName,
                state: "input-available",
                args: data.args,
              };
              toolCalls.push(tc);
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], toolCalls: [...toolCalls] };
                return updated;
              });
            } else if (data.type === "tool-result") {
              toolCalls = toolCalls.map((t) =>
                t.name === data.toolName
                  ? {
                      ...t,
                      state: (data.errorText ? "output-error" : "output-available") as ToolCallPart["state"],
                      result: data.result,
                      errorText: data.errorText,
                    }
                  : t
              );
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], toolCalls: [...toolCalls] };
                return updated;
              });
            } else if (data.type === "citations") {
              citations = data.items || [];
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], citations };
                return updated;
              });
            } else if (data.type === "finish") {
              setIsStreaming(false);
            }
          } catch {
            // ignore parse errors
          }
        }
      }

      // Finalize
      const cleanText = fullText.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "").trim();
      const finalSteps = reasoningSteps.map((s) => ({ ...s, status: "complete" as const }));

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: cleanText,
          reasoningSteps: finalSteps,
          toolCalls,
          citations,
        };
        return updated;
      });
      setLiveSteps([]);

      // Save to DB
      await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
          role: "assistant",
          content: cleanText,
          reasoningSteps: finalSteps,
          toolCalls,
          citations,
          model: "MiniMax-M2",
        }),
      });
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : "Something went wrong."}`,
          reasoningSteps: [],
          toolCalls: [],
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  }, [sessionId, token, messages, createSession]);

  // Handle form submit
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSubmit = useCallback(
    async (message: any, event: any) => {
      const text = message?.text?.trim();
      if (!text || loading) return;
      await handleSendMessage(text);
    },
    [loading, handleSendMessage]
  );

  // Clear chat
  const handleClear = useCallback(async () => {
    if (sessionId) {
      await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await createSession();
    }
  }, [sessionId, token, createSession]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 h-14 border-b border-border flex-shrink-0 z-10 bg-background">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-foreground to-muted-foreground flex items-center justify-center text-background">
            <SparkleIcon />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-none">
              {sessionId ? "Conversation" : "agenticOS"}
            </h1>
            <p className="text-[10px] text-muted-foreground">MiniMax M2 · Chain of Thought</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {sessionId && (
            <button
              onClick={handleClear}
              className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              Clear
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isStreaming ? "bg-amber-400 animate-pulse" : "bg-green-500"}`} />
            <span className="text-xs text-muted-foreground">
              {isStreaming ? "Processing…" : "Ready"}
            </span>
          </div>
        </div>
      </header>

      {/* Conversation */}
      <div className="flex-1 overflow-hidden">
        {messages.length === 0 && !loading ? (
          <EmptyState onSuggestion={handleSendMessage} />
        ) : (
          <Conversation className="h-full">
            <ConversationContent className="p-4 space-y-4">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isStreaming={isStreaming && msg.id === messages[messages.length - 1].id}
                />
              ))}

              {/* Live streaming indicator */}
              {isStreaming && messages.length > 0 && (
                <Message from="assistant">
                  <MessageContent>
                    <Shimmer duration={1}>Thinking…</Shimmer>
                  </MessageContent>
                </Message>
              )}
            </ConversationContent>
          </Conversation>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3 bg-background">
        <div className="max-w-3xl mx-auto">
          <PromptInput
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onSubmit={handleSubmit as any}
            disabled={loading}
          />
        </div>
        <p className="text-center text-[10px] text-muted-foreground/40 mt-2 max-w-3xl mx-auto">
          agenticOS · MiniMax M2 · Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
