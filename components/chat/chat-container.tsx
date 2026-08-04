"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/app/(app)/layout";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
interface ReasoningStep {
  title: string;
  status: "pending" | "active" | "complete";
}

interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
}

interface Message {
  id: string;
  role: string;
  content: string;
  reasoningSteps: ReasoningStep[];
  toolCalls: ToolCall[];
  model?: string;
  agent?: string;
  createdAt: string;
}

// ──────────────────────────────────────────────
// Icons
// ──────────────────────────────────────────────
const SparkleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1L8 5.5L12 6L8.5 8.5L9.5 13L7 10.5L4.5 13L5.5 8.5L2 6L6 5.5L7 1Z" fill="currentColor"/>
  </svg>
);
const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M13.5 1.5L1.5 7L7 8.5M13.5 1.5L8.5 13.5L7 8.5M13.5 1.5L7 8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg width="9" height="9" viewBox="0 0 9 9" fill="none"
    className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
    <path d="M2 3.5L4.5 6L7 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);
const UserIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <circle cx="6.5" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.1"/>
    <path d="M1.5 12C1.5 9.5 3.7 7.5 6.5 7.5C9.3 7.5 11.5 9.5 11.5 12" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
  </svg>
);
const ToolIcon = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <path d="M6.5 1L9 3.5L3.5 9H1V6.5L6.5 1Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
  </svg>
);
const BrainIcon = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.1"/>
    <path d="M3 5.5C3 4.1 4.1 3 5.5 3C6.9 3 8 4.1 8 5.5" stroke="currentColor" strokeWidth="1"/>
    <path d="M5.5 5.5V8M4 8H7" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
  </svg>
);
const ArrowIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M2.5 6H9.5M9.5 6L6.5 3M9.5 6L6.5 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const LoaderIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="animate-spin">
    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20 8" strokeLinecap="round"/>
  </svg>
);

// ──────────────────────────────────────────────
// Chain of Thought Block
// ──────────────────────────────────────────────
function ChainOfThought({ steps }: { steps: ReasoningStep[] }) {
  const [open, setOpen] = useState(true);
  if (!steps.length) return null;
  const active = steps.find((s) => s.status === "active");
  const done = steps.filter((s) => s.status === "complete").length;
  return (
    <div className="mt-2 rounded-xl border border-[#E8E0D8] bg-gradient-to-br from-[#FFFBF5] to-[#FAFAF8] overflow-hidden shadow-sm">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#F5F0EA] transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-[#DC7864]"><BrainIcon /></span>
          <span className="text-xs font-semibold text-[#57534E]">Chain of Thought</span>
          <span className="text-[10px] text-[#A8A29E]">{done}/{steps.length}</span>
          {active && <span className="text-[10px] text-amber-500 animate-pulse">thinking…</span>}
        </div>
        <ChevronIcon open={open} />
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-1.5 border-t border-[#F0EBE5] pt-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2.5 text-xs">
              <span className={`mt-0.5 flex-shrink-0 ${step.status === "complete" ? "text-green-500" : step.status === "active" ? "text-amber-400" : "text-[#D6D3D1]"}`}>
                {step.status === "complete" ? "✓" : step.status === "active" ? "▸" : "○"}
              </span>
              <span className={step.status === "pending" ? "text-[#C4BFB9]" : "text-[#78716C]"}>
                {step.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Tool Calls Block
// ──────────────────────────────────────────────
function ToolCallsBlock({ calls }: { calls: ToolCall[] }) {
  const [open, setOpen] = useState(false);
  if (!calls.length) return null;
  return (
    <div className="mt-2 rounded-xl border border-[#E8E0D8] bg-[#FAFAF8] overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#F5F0EA] transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-[#1C1917]"><ToolIcon /></span>
          <span className="text-xs font-semibold text-[#57534E]">Tool Calls</span>
          <span className="text-[10px] text-[#A8A29E]">{calls.length} {calls.length === 1 ? "tool" : "tools"} used</span>
        </div>
        <ChevronIcon open={open} />
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-2.5 border-t border-[#F0EBE5] pt-2">
          {calls.map((call, i) => (
            <div key={i} className="text-xs">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-lg bg-[#F5F0EA] text-[#57534E] border border-[#E8E0D8]">
                  {call.name}
                </span>
                {call.result != null ? (
                  <span className="text-green-500 text-[10px]">✓ executed</span>
                ) : (
                  <span className="text-[#A8A29E] text-[10px] animate-pulse">running…</span>
                )}
              </div>
              {call.result != null && (
                <pre className="p-2 bg-white rounded-lg border border-[#F0EBE5] text-[10px] text-[#78716C] overflow-x-auto whitespace-pre-wrap font-mono max-h-24 leading-relaxed">
                  {JSON.stringify(call.result, null, 2).slice(0, 250)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Message Bubble
// ──────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-1 duration-300`}>
      <div className={`flex gap-3 max-w-[70%] ${isUser ? "flex-row-reverse" : ""}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${
          isUser ? "bg-[#1C1917]" : "bg-gradient-to-br from-[#1C1917] to-[#44403C] shadow-sm"
        }`}>
          {isUser ? <UserIcon /> : <SparkleIcon />}
        </div>

        {/* Content */}
        <div className={`flex flex-col gap-0.5 ${isUser ? "items-end" : "items-start"}`}>
          <div className={`rounded-2xl px-5 py-3.5 shadow-sm ${
            isUser
              ? "bg-[#1C1917] text-white rounded-tr-sm"
              : "bg-white border border-[#E8E0D8] text-[#1C1917] rounded-tl-sm"
          }`}>
            {/* Chain of thought for AI */}
            {!isUser && msg.reasoningSteps.length > 0 && (
              <ChainOfThought steps={msg.reasoningSteps} />
            )}
            {/* Tool calls for AI */}
            {!isUser && msg.toolCalls.length > 0 && (
              <ToolCallsBlock calls={msg.toolCalls} />
            )}
            {/* Main content */}
            <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isUser ? "text-white" : "text-[#1C1917]"}`}>
              {msg.content || (isUser ? "" : "…")}
            </p>
          </div>
          {/* Meta */}
          <div className="flex items-center gap-1.5 px-1">
            {!isUser && msg.model && (
              <span className="text-[10px] text-[#C4BFB9] font-mono">{msg.model}</span>
            )}
            {!isUser && msg.agent && (
              <span className="text-[10px] text-[#C4BFB9]">via {msg.agent}</span>
            )}
            <span className="text-[10px] text-[#C4BFB9]">
              {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Loading indicator
// ──────────────────────────────────────────────
function LoadingIndicator({ steps }: { steps: ReasoningStep[] }) {
  const active = steps.find((s) => s.status === "active");
  return (
    <div className="flex justify-start animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="flex gap-3 max-w-[70%]">
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-[#1C1917] to-[#44403C] flex items-center justify-center text-white shadow-sm">
          <SparkleIcon />
        </div>
        <div className="rounded-2xl rounded-tl-sm bg-white border border-[#E8E0D8] px-5 py-3.5 shadow-sm">
          {active ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-[#78716C]">
                <span className="text-[#DC7864] animate-pulse"><LoaderIcon /></span>
                <span className="font-medium text-[#57534E]">Reasoning…</span>
              </div>
              {steps.filter((s) => s.status === "complete").slice(-3).map((s, i) => (
                <p key={i} className="text-xs text-[#A8A29E] flex items-center gap-1.5">
                  <span className="text-green-500">✓</span>
                  {s.title}
                </p>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-[#78716C]">
              <span className="w-4 h-4 border-2 border-[#D6D3D1] border-t-transparent rounded-full animate-spin" />
              <span>Thinking…</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Chat Input
// ──────────────────────────────────────────────
function ChatInput({ onSend, disabled }: { onSend: (text: string) => void; disabled: boolean }) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    textareaRef.current?.focus();
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [text]);

  return (
    <div className="border-t border-[#E8E0D8] bg-white px-4 py-3">
      <div className="flex items-end gap-3 max-w-3xl mx-auto">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Message agenticOS… (Shift+Enter for new line)"
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none text-sm text-[#1C1917] placeholder:text-[#C4BFB9] bg-[#FAFAF9] border border-[#E8E0D8] rounded-2xl px-4 py-3 outline-none focus:border-[#A8A29E] focus:ring-1 focus:ring-[#D6D3D1] transition-all disabled:opacity-50 leading-relaxed"
          style={{ minHeight: "48px", maxHeight: "140px" }}
        />
        <button
          onClick={submit}
          disabled={disabled || !text.trim()}
          className="flex-shrink-0 w-10 h-10 rounded-2xl bg-[#1C1917] text-white flex items-center justify-center hover:bg-[#DC2626] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          <SendIcon />
        </button>
      </div>
      <p className="text-center text-[10px] text-[#D6D3D1] mt-2 max-w-3xl mx-auto">
        agenticOS · MiniMax M2 · Press Enter to send · Shift+Enter for newline
      </p>
    </div>
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [liveReasoning, setLiveReasoning] = useState<ReasoningStep[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveReasoning]);

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
    const session = await res.json();
    setSessionId(session.id);
    onSessionCreated?.(session.id);
    setMessages([]);
    setLiveReasoning([]);
    return session.id;
  }, [token, onSessionCreated]);

  // Load session messages
  const loadSession = useCallback(async (id: string) => {
    setLoading(true);
    setSessionId(id);
    setMessages([]);
    setLiveReasoning([]);
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
          }))
        );
      }
    } catch (err) {
      console.error("Load session error:", err);
    }
    setLoading(false);
  }, [token]);

  // Load initial session on mount
  useEffect(() => {
    if (initialSessionId) {
      loadSession(initialSessionId);
    } else {
      // Start with fresh state, session created on first message
      setSessionId(null);
      setMessages([]);
      setLiveReasoning([]);
    }
  }, [initialSessionId, loadSession]);

  // Send message with streaming
  const handleSend = useCallback(async (text: string) => {
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      currentSessionId = await createSession();
    }

    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text,
      reasoningSteps: [],
      toolCalls: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLiveReasoning([]);
    setLoading(true);

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
      let toolCalls: ToolCall[] = [];
      let reasoningBuffer = "";

      const assistantMsg: Message = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: "",
        reasoningSteps: [],
        toolCalls: [],
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
                updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullText };
                return updated;
              });
            } else if (data.type === "reasoning") {
              reasoningBuffer += data.text;
              reasoningSteps = reasoningBuffer
                .split(/\n+/)
                .filter(Boolean)
                .slice(-10)
                .map((s, i, arr) => ({
                  title: s.trim().slice(0, 100),
                  status: i === arr.length - 1 ? "active" as const : "complete" as const,
                }));
              setLiveReasoning(reasoningSteps);
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], reasoningSteps };
                return updated;
              });
            } else if (data.type === "tool-call") {
              toolCalls.push({ name: data.toolName, args: data.args || {} });
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], toolCalls };
                return updated;
              });
            } else if (data.type === "tool-result") {
              toolCalls = toolCalls.map((t) =>
                t.name === data.toolName ? { ...t, result: data.result } : t
              );
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], toolCalls };
                return updated;
              });
            }
          } catch {
            // ignore parse errors
          }
        }
      }

      // Finalize reasoning steps
      const finalSteps = reasoningSteps.map((s) => ({ ...s, status: "complete" as const }));
      const cleanText = fullText.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "").trim();

      // Update final message
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: cleanText,
          reasoningSteps: finalSteps,
          toolCalls,
        };
        return updated;
      });
      setLiveReasoning([]);

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
          model: "MiniMax-M2",
        }),
      });
    } catch (err) {
      console.error("Chat error:", err);
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : "Something went wrong."}`,
        reasoningSteps: [],
        toolCalls: [],
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [sessionId, token, messages, createSession]);

  return (
    <div className="flex flex-col h-full bg-[#FAFAF9]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 h-14 border-b border-[#E8E0D8] bg-white flex-shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1C1917] to-[#44403C] flex items-center justify-center text-white shadow-sm">
            <SparkleIcon />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[#1C1917] leading-none">
              {sessionId ? "Conversation" : "agenticOS"}
            </h1>
            <p className="text-[10px] text-[#A8A29E]">MiniMax M2 · Chain of Thought</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {sessionId && (
            <button
              onClick={async () => {
                if (sessionId) {
                  await fetch(`/api/sessions/${sessionId}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  await createSession();
                }
              }}
              className="text-xs text-[#A8A29E] hover:text-[#1C1917] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#F5F4F2]"
            >
              Clear
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${loading ? "bg-amber-400 animate-pulse" : "bg-green-500"}`} />
            <span className="text-xs text-[#78716C]">{loading ? "Processing…" : "Ready"}</span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {messages.length === 0 && !loading && (
          <div className="text-center py-16 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1C1917] to-[#44403C] flex items-center justify-center text-white mx-auto shadow-lg">
              <SparkleIcon />
            </div>
            <div>
              <p className="text-lg font-semibold text-[#1C1917]">agenticOS</p>
              <p className="text-sm text-[#78716C] mt-1 max-w-xs mx-auto">
                Powered by <span className="font-medium text-[#1C1917]">MiniMax M2</span> with chain-of-thought reasoning and autonomous tool use.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {["Research a topic", "Write and debug code", "Analyze data", "Plan a project"].map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="px-3 py-1.5 text-xs bg-white border border-[#E8E0D8] rounded-full text-[#57534E] hover:bg-[#F5F4F2] hover:border-[#A8A29E] transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        {loading && <LoadingIndicator steps={liveReasoning} />}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  );
}
