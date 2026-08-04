// @ts-nocheck
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/app/(app)/layout";

// ──────────────────────────────────────────────
// AI Elements
// ──────────────────────────────────────────────
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
  ChainOfThoughtContent,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
  ChainOfThoughtImage,
} from "@/components/ai-elements/chain-of-thought";
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Sources, SourcesTrigger, SourcesContent } from "@/components/ai-elements/sources";
import { PromptInput } from "@/components/ai-elements/prompt-input";
import { Checkpoint, CheckpointIcon } from "@/components/ai-elements/checkpoint";

// Icons
import {
  BrainIcon,
  CheckCircleIcon,
  CircleIcon,
  ClockIcon,
  GlobeIcon,
  WrenchIcon,
  CalculatorIcon,
  DatabaseIcon,
  SearchIcon,
  ChevronDownIcon,
} from "lucide-react";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
interface ReasoningStep {
  title: string;
  description?: string;
  status: "pending" | "active" | "complete";
  icon?: string; // search | brain | tool | calc | fetch | database
  searchResults?: string[];
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

interface MessageData {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  reasoningSteps: ReasoningStep[];
  toolCalls: ToolCallPart[];
  citations?: SourceItem[];
  model?: string;
  agent?: string;
  createdAt: string;
}

// ──────────────────────────────────────────────
// Map step icon string to lucide icon
// ──────────────────────────────────────────────
function getStepIcon(iconName?: string) {
  switch (iconName) {
    case "search":
      return SearchIcon;
    case "tool":
      return WrenchIcon;
    case "calc":
      return CalculatorIcon;
    case "fetch":
      return GlobeIcon;
    case "database":
      return DatabaseIcon;
    default:
      return BrainIcon;
  }
}

// ──────────────────────────────────────────────
// Chain of Thought block — proper AI Elements pattern
// ──────────────────────────────────────────────
function ChainOfThoughtBlock({ steps, isStreaming }: { steps: ReasoningStep[]; isStreaming: boolean }) {
  if (!steps.length) return null;
  const done = steps.filter((s) => s.status === "complete").length;
  const activeStep = steps.find((s) => s.status === "active");

  return (
    <ChainOfThought defaultOpen={isStreaming || done > 0}>
      <ChainOfThoughtHeader>
        <span className="inline-flex items-center gap-2">
          <BrainIcon className="size-3.5 text-amber-500" />
          <span className="text-xs font-medium">Chain of Thought</span>
          <span className="text-[10px] text-muted-foreground/60">
            {done}/{steps.length}
          </span>
          {isStreaming && activeStep && (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-500">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              {activeStep.title.slice(0, 50)}
            </span>
          )}
        </span>
      </ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        <div className="space-y-2">
          {steps.map((step, i) => {
            const Icon = getStepIcon(step.icon);
            return (
              <ChainOfThoughtStep
                key={i}
                icon={Icon}
                label={step.title}
                description={step.description}
                status={step.status}
              >
                {step.searchResults && step.searchResults.length > 0 && (
                  <ChainOfThoughtSearchResults>
                    {step.searchResults.map((url) => (
                      <ChainOfThoughtSearchResult key={url}>
                        {(() => {
                          try {
                            return new URL(url).hostname;
                          } catch {
                            return url;
                          }
                        })()}
                      </ChainOfThoughtSearchResult>
                    ))}
                  </ChainOfThoughtSearchResults>
                )}
              </ChainOfThoughtStep>
            );
          })}
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

  const isRunning = !call.result && !call.errorText;

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
        {isRunning ? (
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
function SourcesBlock({ sources }: { sources?: SourceItem[] }) {
  if (!sources?.length) return null;
  return (
    <Sources>
      <SourcesTrigger count={sources.length}>
        <span className="text-[10px]">📚 {sources.length} source{sources.length > 1 ? "s" : ""}</span>
      </SourcesTrigger>
      <SourcesContent>
        <ul className="space-y-1">
          {sources.map((s, i) => (
            <li key={i} className="text-xs">
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {s.title || s.url}
              </a>
              {s.snippet && (
                <p className="text-muted-foreground text-[10px] mt-0.5">
                  {s.snippet?.slice(0, 150)}
                </p>
              )}
            </li>
          ))}
        </ul>
      </SourcesContent>
    </Sources>
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
        {!isUser && msg.reasoningSteps.length > 0 && (
          <ChainOfThoughtBlock steps={msg.reasoningSteps} isStreaming={isStreaming || false} />
        )}

        {!isUser && msg.toolCalls.map((tc, i) => (
          <ToolCallBlock key={i} call={tc} />
        ))}

        {!isUser && msg.citations && msg.citations.length > 0 && (
          <SourcesBlock sources={msg.citations} />
        )}

        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {msg.content || (isStreaming ? <Shimmer duration={1}>Thinking…</Shimmer> : null)}
        </div>
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
              : (m.citations ? JSON.parse(String(m.citations)) : []),
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

  // Auto-detect step type from text
  const detectStepIcon = (text: string): string => {
    const lower = text.toLowerCase();
    if (lower.includes("search") || lower.includes("look up") || lower.includes("find ")) return "search";
    if (lower.includes("calculat") || lower.includes("math") || lower.includes("compute")) return "calc";
    if (lower.includes("fetch") || lower.includes("read") || lower.includes("browse")) return "fetch";
    if (lower.includes("databas") || lower.includes("query") || lower.includes("sql")) return "database";
    if (lower.includes("tool") || lower.includes("call") || lower.includes("execute")) return "tool";
    return "brain";
  };

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
              const lines = reasoningBuffer
                .split(/\n+/)
                .filter(Boolean)
                .slice(-15);
              reasoningSteps = lines.map((s, i, arr) => ({
                title: s.trim().slice(0, 120),
                status: i === arr.length - 1 ? "active" : "complete",
                icon: detectStepIcon(s),
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
            } else if (data.type === "sources") {
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
  const handleSubmit = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            <BrainIcon className="size-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-none">
              {sessionId ? "Conversation" : "agenticOS"}
            </h1>
            <p className="text-[10px] text-muted-foreground">
              MiniMax M2 · Chain of Thought
            </p>
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
      <div className="flex-1 overflow-hidden relative">
        {messages.length === 0 && !loading ? (
          <ConversationEmptyState
            icon={
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-foreground to-muted-foreground flex items-center justify-center text-background">
                <BrainIcon className="size-5" />
              </div>
            }
            title="agenticOS"
            description="Powered by MiniMax M2 with chain-of-thought reasoning and autonomous tool use."
          >
            <div className="pt-4 w-full max-w-md">
              <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                {[
                  "Chain-of-thought reasoning",
                  "Web search & calculations",
                  "Deep research",
                  "Tool execution",
                  "Session history",
                ].map((f) => (
                  <span
                    key={f}
                    className="px-2 py-0.5 text-[10px] rounded-full bg-muted/60 border border-border text-muted-foreground"
                  >
                    ✓ {f}
                  </span>
                ))}
              </div>
              <Suggestions>
                {PROMPT_SUGGESTIONS.map((s) => (
                  <Suggestion key={s} suggestion={s} onClick={() => handleSendMessage(s)} />
                ))}
              </Suggestions>
              <p className="text-[10px] text-muted-foreground/50 mt-4">
                Press Enter to send · Shift+Enter for new line
              </p>
            </div>
          </ConversationEmptyState>
        ) : (
          <Conversation className="h-full">
            <ConversationContent className="p-4 space-y-6 max-w-3xl mx-auto">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isStreaming={isStreaming && msg.id === messages[messages.length - 1].id}
                />
              ))}

              {isStreaming && messages.length > 0 && (
                <Message from="assistant">
                  <MessageContent>
                    <Shimmer duration={1}>Thinking…</Shimmer>
                  </MessageContent>
                </Message>
              )}
            </ConversationContent>
            <ConversationScrollButton />
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
