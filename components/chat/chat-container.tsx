"use client";

import { useState, useRef, useEffect, useCallback } from "react";

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
  createdAt: string;
}

// ──────────────────────────────────────────────
// Icons (inline SVG — no external deps)
// ──────────────────────────────────────────────

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M14 2L2 7L7 9.5M14 2L9 14L7 9.5M14 2L7 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M2.5 13.5C2.5 11.3 4.9 9.5 8 9.5C11.1 9.5 13.5 11.3 13.5 13.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

const SparkleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1.5L8.9 5.4L12 5.5L9.5 7.7L10.3 11.5L8 9.4L5.7 11.5L6.5 7.7L4 5.5L7.1 5.4L8 1.5Z" fill="currentColor"/>
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
    className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
    <path d="M2.5 3.5L5 6.5L7.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ToolIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M7.5 1.5L10.5 4.5L4.5 10.5H1.5V7.5L7.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
  </svg>
);

const BrainIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M6 1C4.3 1 3 2.3 3 4C3 4.7 3.3 5.4 3.8 5.8L2 10H10L8.2 5.8C8.7 5.4 9 4.7 9 4C9 2.3 7.7 1 6 1Z" stroke="currentColor" strokeWidth="1.1"/>
    <circle cx="4.5" cy="3.5" r="0.7" fill="currentColor"/>
    <circle cx="7.5" cy="3.5" r="0.7" fill="currentColor"/>
  </svg>
);

// ──────────────────────────────────────────────
// Reasoning Block
// ──────────────────────────────────────────────
const ReasoningBlock = ({ steps }: { steps: ReasoningStep[] }) => {
  const [open, setOpen] = useState(false);
  if (!steps.length) return null;
  const done = steps.filter((s) => s.status === "complete").length;
  return (
    <div className="mt-2 rounded-xl border border-[#E4E0DC] bg-[#FAFAF8] overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#F4F2EF] transition-colors text-left">
        <div className="flex items-center gap-2">
          <span className="text-[#E8653A]"><BrainIcon /></span>
          <span className="text-xs font-medium text-[#57534E]">Thinking</span>
          <span className="text-[10px] text-[#A8A29E]">{done}/{steps.length}</span>
        </div>
        <ChevronIcon open={open} />
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-1.5">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className={step.status === "complete" ? "text-green-500 mt-0.5" : "text-[#D6D3D1] mt-0.5"}>
                {step.status === "complete" ? "✓" : "○"}
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
};

// ──────────────────────────────────────────────
// Tool Call Block
// ──────────────────────────────────────────────
const ToolCallBlock = ({ calls }: { calls: ToolCall[] }) => {
  const [open, setOpen] = useState(false);
  if (!calls.length) return null;
  return (
    <div className="mt-2 rounded-xl border border-[#E4E0DC] bg-[#FAFAF8] overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#F4F2EF] transition-colors text-left">
        <div className="flex items-center gap-2">
          <span className="text-[#1C1917]"><ToolIcon /></span>
          <span className="text-xs font-medium text-[#57534E]">Tools</span>
          <span className="text-[10px] text-[#A8A29E]">{calls.length} used</span>
        </div>
        <ChevronIcon open={open} />
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-2">
          {calls.map((call, i) => (
            <div key={i} className="text-xs">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#F4F2EF] text-[#57534E] border border-[#E4E0DC]">
                  {call.name}
                </span>
                <span className="text-green-500">✓</span>
              </div>
              {call.result != null && (
                <pre className="mt-1 p-2 bg-white rounded border border-[#E4E0DC] text-[10px] text-[#78716C] overflow-x-auto whitespace-pre-wrap font-mono max-h-28">
                  {JSON.stringify(call.result, null, 2).slice(0, 200)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────
// Message Bubble
// ──────────────────────────────────────────────
const MessageBubble = ({ msg }: { msg: Message }) => {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`flex gap-3 max-w-[72%] ${isUser ? "flex-row-reverse" : ""}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${
          isUser ? "bg-[#1C1917]" : "bg-gradient-to-br from-[#1C1917] to-[#44403C]"
        }`}>
          {isUser ? <UserIcon /> : <SparkleIcon />}
        </div>
        {/* Bubble */}
        <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
          <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-[#1C1917] text-white rounded-tr-sm"
              : "bg-white border border-[#E4E0DC] text-[#1C1917] rounded-tl-sm"
          }`}>
            {!isUser && msg.reasoningSteps.length > 0 && (
              <ReasoningBlock steps={msg.reasoningSteps} />
            )}
            {!isUser && msg.toolCalls.length > 0 && (
              <ToolCallBlock calls={msg.toolCalls} />
            )}
            <p className={isUser ? "text-white" : "text-[#1C1917]"}>
              {msg.content || (isUser ? "" : "Thinking...")}
            </p>
          </div>
          <span className="text-[10px] text-[#C4BFB9] px-1">
            {msg.model && !isUser ? `${msg.model} · ` : ""}
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// Loading dots
// ──────────────────────────────────────────────
const LoadingDots = () => (
  <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div className="flex gap-3 max-w-[72%]">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#1C1917] to-[#44403C] flex items-center justify-center text-white">
        <SparkleIcon />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-white border border-[#E4E0DC] px-4 py-3.5">
        <div className="flex items-center gap-1.5">
          {[0, 150, 300].map((delay) => (
            <span key={delay}
              className="w-1.5 h-1.5 rounded-full bg-[#A8A29E] animate-bounce"
              style={{ animationDelay: `${delay}ms` }} />
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ──────────────────────────────────────────────
// Chat Input
// ──────────────────────────────────────────────
const ChatInput = ({ onSend, disabled }: { onSend: (text: string) => void; disabled: boolean }) => {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    textareaRef.current?.focus();
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [text]);

  return (
    <div className="border-t border-[#E4E0DC] bg-white px-4 py-3">
      <div className="flex items-end gap-3 max-w-3xl mx-auto">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Message agenticOS… (Shift+Enter for newline)"
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none text-sm text-[#1C1917] placeholder:text-[#C4BFB9] bg-[#FAFAF8] border border-[#E4E0DC] rounded-xl px-4 py-3 outline-none focus:border-[#A8A29E] focus:ring-1 focus:ring-[#D6D3D1] transition-all disabled:opacity-50 leading-relaxed"
          style={{ minHeight: "48px", maxHeight: "160px" }}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !text.trim()}
          className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#1C1917] text-white flex items-center justify-center hover:bg-[#DC2626] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <SendIcon />
        </button>
      </div>
      <p className="text-center text-[10px] text-[#C4BFB9] mt-2">
        MiniMax M2 · Press Enter to send · Shift+Enter for newline
      </p>
    </div>
  );
};

// ──────────────────────────────────────────────
// Main Chat Container
// ──────────────────────────────────────────────
export default function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Init session
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "New Chat" }),
        });
        const session = await res.json();
        setSessionId(session.id);

        const msgsRes = await fetch(`/api/messages?sessionId=${session.id}`);
        const msgs = await msgsRes.json();
        if (Array.isArray(msgs) && msgs.length > 0) {
          setMessages(msgs);
        }
      } catch (err) {
        console.error("Init error:", err);
      }
    };
    init();
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      if (!sessionId) return;

      const userMsg: Message = {
        id: `temp-${Date.now()}`,
        role: "user",
        content: text,
        reasoningSteps: [],
        toolCalls: [],
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, role: "user", content: text }),
        });

        const chatRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, { role: "user", content: text }],
            model: "MiniMax-M2",
          }),
        });

        if (!chatRes.ok) {
          const err = await chatRes.json();
          throw new Error(err.error || "Chat failed");
        }

        const aiData = await chatRes.json();
        const cleanText = (aiData.text ?? "").replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "").trim();

        const assistantMsg: Message = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: cleanText,
          reasoningSteps: aiData.reasoningSteps ?? [],
          toolCalls: aiData.toolCalls ?? [],
          model: "MiniMax-M2",
          createdAt: new Date().toISOString(),
        };

        await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            role: "assistant",
            content: cleanText,
            reasoningSteps: assistantMsg.reasoningSteps,
            toolCalls: assistantMsg.toolCalls,
            model: assistantMsg.model,
          }),
        });

        setMessages((prev) => [...prev, assistantMsg]);
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
    },
    [sessionId, messages]
  );

  return (
    <div className="flex flex-col h-screen bg-[#FAFAF9]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 h-14 border-b border-[#E4E0DC] bg-white flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1C1917] to-[#44403C] flex items-center justify-center text-white">
            <SparkleIcon />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[#1C1917] leading-none">agenticOS</h1>
            <p className="text-[10px] text-[#A8A29E]">MiniMax M2 · Chain of Thought</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${loading ? "bg-amber-400 animate-pulse" : "bg-green-500"}`} />
          <span className="text-xs text-[#78716C]">{loading ? "Thinking…" : "Ready"}</span>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1C1917] to-[#44403C] flex items-center justify-center text-white mx-auto mb-4">
              <SparkleIcon />
            </div>
            <p className="text-lg font-semibold text-[#1C1917] mb-1">agenticOS</p>
            <p className="text-sm text-[#78716C] max-w-xs mx-auto">
              I&apos;m powered by <span className="font-medium text-[#1C1917]">MiniMax M2</span> with chain-of-thought reasoning and tool use.
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        {loading && <LoadingDots />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  );
}
