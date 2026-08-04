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
  status?: "pending" | "complete" | "error";
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
// Mini Chevron icon
// ──────────────────────────────────────────────
const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
  >
    <path
      d="M3 4.5L6 7.5L9 4.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ──────────────────────────────────────────────
// Reasoning Block
// ──────────────────────────────────────────────
const ReasoningBlock = ({ steps }: { steps: ReasoningStep[] }) => {
  const [open, setOpen] = useState(true);

  if (!steps.length) return null;

  const completedCount = steps.filter((s) => s.status === "complete").length;
  const totalCount = steps.length;

  return (
    <div className="mt-2 mb-3 rounded-xl border border-[#E7E5E4] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-[#FAFAF9] hover:bg-[#F5F4F2] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-[#DC2626] text-sm font-medium">🤖 Chain of Thought</span>
          <span className="text-xs text-[#78716C]">
            {completedCount}/{totalCount} steps
          </span>
        </div>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="px-4 py-3 space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2.5 text-sm">
              <span className="mt-0.5 flex-shrink-0">
                {step.status === "complete" ? (
                  <span className="text-green-500">✓</span>
                ) : step.status === "active" ? (
                  <span className="text-[#DC2626] animate-pulse">▶</span>
                ) : (
                  <span className="text-[#D6D3D1]">○</span>
                )}
              </span>
              <span className={step.status === "pending" ? "text-[#A8A29E]" : "text-[#78716C]"}>
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
    <div className="mt-2 mb-3 rounded-xl border border-[#E7E5E4] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-[#FAFAF9] hover:bg-[#F5F4F2] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-[#1C1917] text-sm font-medium">🔧 Tools Used</span>
          <span className="text-xs text-[#78716C]">{calls.length} tool{calls.length > 1 ? "s" : ""}</span>
        </div>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="px-4 py-3 space-y-2.5">
          {calls.map((call, i) => (
            <div key={i} className="text-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#F5F5F4] text-[#57534E] border border-[#E7E5E4]">
                  {call.name}
                </span>
              </div>
              {call.result != null && (
                <pre className="mt-1 p-2 bg-[#F5F4F2] rounded text-xs text-[#78716C] overflow-x-auto whitespace-pre-wrap font-mono">
                  {String(JSON.stringify(call.result, null, 2)).slice(0, 300)}
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
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
          isUser
            ? "bg-[#1C1917] text-white rounded-br-md"
            : "bg-white border border-[#E7E5E4] text-[#1C1917] rounded-bl-md"
        }`}
      >
        {/* Show reasoning + tools for assistant messages */}
        {!isUser && msg.content !== "" && (
          <>
            <ReasoningBlock steps={msg.reasoningSteps} />
            <ToolCallBlock calls={msg.toolCalls} />
          </>
        )}

        {/* Main text content */}
        <p className={isUser ? "text-white" : "text-[#1C1917]"}>
          {msg.content}
        </p>

        {/* Meta */}
        <div className={`mt-1.5 text-[10px] ${isUser ? "text-white/50" : "text-[#A8A29E]"}`}>
          {msg.model && <span>{msg.model} · </span>}
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// Chat Input
// ──────────────────────────────────────────────
const ChatInput = ({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) => {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    textareaRef.current?.focus();
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [text]);

  return (
    <div className="flex items-end gap-3 px-4 py-3 border-t border-[#E7E5E4] bg-white">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Ask me anything… (Shift+Enter for newline)"
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none text-sm text-[#1C1917] placeholder:text-[#A8A29E] bg-transparent outline-none disabled:opacity-50 py-1 leading-relaxed"
        style={{ minHeight: "40px", maxHeight: "160px" }}
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !text.trim()}
        className="flex-shrink-0 w-9 h-9 rounded-full bg-[#1C1917] text-white flex items-center justify-center hover:bg-[#DC2626] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M1 7L13 1L7 13L6 8L1 7Z"
            fill="currentColor"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
};

// ──────────────────────────────────────────────
// Chat Container (Main)
// ──────────────────────────────────────────────
export default function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load existing session or create new one
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "New Chat" }) });
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
        // Save user message
        await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            role: "user",
            content: text,
          }),
        });

        // Send to AI
        const chatRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            messages: [...messages, { role: "user", content: text }],
            model: "MiniMax-M2",
          }),
        });

        if (!chatRes.ok) {
          const err = await chatRes.json();
          throw new Error(err.error || "Chat failed");
        }

        const aiData = await chatRes.json();

        // Strip reasoning XML tags from the text before display
        const cleanText = aiData.text?.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "").trim() ?? "";

        const assistantMsg: Message = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: cleanText,
          reasoningSteps: aiData.reasoningSteps ?? [],
          toolCalls: aiData.toolCalls ?? [],
          model: "MiniMax-M2",
          createdAt: new Date().toISOString(),
        };

        // Save assistant message
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
          content: `Error: ${err instanceof Error ? err.message : "Something went wrong. Make sure MINIMAX_API_KEY is set."}`,
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
      <header className="flex items-center justify-between px-6 h-16 border-b border-[#E7E5E4] bg-white flex-shrink-0">
        <div>
          <h1 className="font-serif text-lg text-[#1C1917]">agenticOS</h1>
          <p className="text-[10px] uppercase tracking-wider text-[#78716C]">MiniMax · M2</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-[#78716C]">
            {loading ? "Thinking…" : "Ready"}
          </span>
        </div>
      </header>

      {/* Messages */}
      <div ref={messagesRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-20">
            <p className="font-serif text-3xl text-[#1C1917] mb-3">Hello.</p>
            <p className="text-sm text-[#78716C] max-w-sm mx-auto">
              I&apos;m powered by <span className="font-medium text-[#1C1917]">MiniMax M2</span> with
              chain-of-thought reasoning and tool use. Ask me anything.
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-[#E7E5E4] rounded-2xl rounded-bl-md px-5 py-3.5">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A8A29E] animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#A8A29E] animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#A8A29E] animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  );
}
