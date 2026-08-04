// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/(app)/layout";

// ──────────────────────────────────────────────
// AI Elements
// ──────────────────────────────────────────────
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
  ChainOfThoughtContent,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
} from "@/components/ai-elements/chain-of-thought";
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Sources, SourcesTrigger, SourcesContent } from "@/components/ai-elements/sources";
import { PromptInput, PromptInputBody, PromptInputTextarea, PromptInputFooter, PromptInputSubmit, PromptInputTools, PromptInputButton, PromptInputHeader, PromptInputActionMenu, PromptInputActionMenuTrigger, PromptInputActionMenuContent, PromptInputActionMenuItem, PromptInputActionAddAttachments, type PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Context, ContextContent, ContextTrigger } from "@/components/ai-elements/context";
import { Plan, PlanHeader, PlanTitle, PlanDescription, PlanContent, PlanFooter, PlanTrigger } from "@/components/ai-elements/plan";
import { Task, TaskTrigger, TaskContent, TaskItem, TaskItemFile, TaskItemText } from "@/components/ai-elements/task";
import { Queue, QueueTrigger, QueueContent, QueueItem, QueueItemIndicator, QueueItemContent, QueueItemLabel, QueueSection, QueueSectionTrigger, QueueSectionContent, QueueList } from "@/components/ai-elements/queue";
import { ModelSelector, ModelSelectorTrigger, ModelSelectorContent, ModelSelectorInput, ModelSelectorList, ModelSelectorEmpty, ModelSelectorGroup, ModelSelectorItem, ModelSelectorLogo, ModelSelectorName, ModelSelectorShortcut } from "@/components/ai-elements/model-selector";
import { OpenInChat } from "@/components/ai-elements/open-in-chat";
import { Image } from "@/components/ai-elements/image";
import { InlineCitation, InlineCitationCard, InlineCitationCardBody, InlineCitationCardTrigger, InlineCitationCardItem, InlineCitationCardSource, InlineCitationCardTitle, InlineCitationCardDescription, InlineCitationText } from "@/components/ai-elements/inline-citation";
import { CodeBlock, CodeBlockHeader, CodeBlockTitle, CodeBlockContent } from "@/components/ai-elements/code-block";
import { Snippet } from "@/components/ai-elements/snippet";
import { Confirmation, ConfirmationTrigger, ConfirmationContent, ConfirmationRequest, ConfirmationAccepted, ConfirmationRejected, ConfirmationActions, ConfirmationAction } from "@/components/ai-elements/confirmation";
import { Checkpoint, CheckpointIcon, CheckpointTrigger } from "@/components/ai-elements/checkpoint";
import { Attachments, Attachment, AttachmentsTrigger, AttachmentsContent } from "@/components/ai-elements/attachments";
import { Artifact, ArtifactHeader, ArtifactTitle, ArtifactDescription, ArtifactContent, ArtifactActions } from "@/components/ai-elements/artifact";
import { MicSelector, MicSelectorTrigger, MicSelectorContent, MicSelectorInput, MicSelectorList, MicSelectorEmpty, MicSelectorGroup, MicSelectorItem, MicSelectorLabel, MicSelectorSeparator, MicSelectorShortcut } from "@/components/ai-elements/mic-selector";
import { VoiceSelector, VoiceSelectorTrigger, VoiceSelectorContent, VoiceSelectorInput, VoiceSelectorList, VoiceSelectorEmpty, VoiceSelectorGroup, VoiceSelectorItem, VoiceSelectorLabel, VoiceSelectorSeparator, VoiceSelectorShortcut } from "@/components/ai-elements/voice-selector";
import { Persona, PersonaAvatar, PersonaName, PersonaDescription, PersonaAvatarFallback, PersonaAvatarImage } from "@/components/ai-elements/persona";
import { AudioPlayer, AudioPlayerElement, AudioPlayerControl, AudioPlayerTime, AudioPlayerTimeDisplay, AudioPlayerDurationDisplay, AudioPlayerSeek, AudioPlayerVolume, AudioPlayerVolumeSlider, AudioPlayerPlaybackRate, AudioPlayerMute } from "@/components/ai-elements/audio-player";
import { Transcription, TranscriptionSegment, TranscriptionWord, TranscriptionTimestamp, TranscriptionLine, TranscriptionEmpty } from "@/components/ai-elements/transcription";
import { SpeechInput, SpeechInputForm, SpeechInputValue, SpeechInputSubmit, SpeechInputStart, SpeechInputStop, SpeechInputRecording, SpeechInputControls, SpeechInputControl, SpeechInputLabel, SpeechInputMuted, SpeechInputActive, SpeechInputPlaceholder, SpeechInputHint } from "@/components/ai-elements/speech-input";

// Icons
import {
  BrainIcon,
  CheckCircleIcon,
  CheckIcon,
  CircleIcon,
  ClockIcon,
  GlobeIcon,
  WrenchIcon,
  CalculatorIcon,
  DatabaseIcon,
  SearchIcon,
  MenuIcon,
  PlusIcon,
  SendIcon,
  MicIcon,
  PaperclipIcon,
  SparklesIcon,
  ImageIcon,
  CodeIcon,
  StopCircleIcon,
} from "lucide-react";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
interface ReasoningStep {
  title: string;
  description?: string;
  status: "pending" | "active" | "complete";
  icon?: string;
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
// Helper: map step icon string to lucide icon
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
    case "code":
      return CodeIcon;
    default:
      return BrainIcon;
  }
}

// ──────────────────────────────────────────────
// ChainOfThought block (proper AI Elements)
// ──────────────────────────────────────────────
function ChainOfThoughtBlock({ steps, isStreaming }: { steps: ReasoningStep[]; isStreaming: boolean }) {
  if (!steps.length) return null;
  const done = steps.filter((s) => s.status === "complete").length;
  const activeStep = steps.find((s) => s.status === "active");

  return (
    <ChainOfThought defaultOpen={isStreaming || done > 0}>
      <ChainOfThoughtHeader>
        <span className="inline-flex items-center gap-2">
          <BrainIcon className="size-3.5 text-primary" />
          <span className="text-xs font-medium">Chain of Thought</span>
          <span className="text-[10px] text-muted-foreground/60">
            {done}/{steps.length}
          </span>
          {isStreaming && activeStep && (
            <span className="inline-flex items-center gap-1 text-[10px] text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
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
// ToolCallBlock
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
// SourcesBlock
// ──────────────────────────────────────────────
function SourcesBlock({ sources }: { sources?: SourceItem[] }) {
  if (!sources?.length) return null;
  return (
    <Sources>
      <SourcesTrigger count={sources.length}>
        <span className="text-[10px]">📚 {sources.length} source{sources.length > 1 ? "s" : ""}</span>
      </SourcesTrigger>
      <SourcesContent>
        <ul className="space-y-1.5">
          {sources.map((s, i) => (
            <li key={i} className="text-xs">
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
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
// MessageBubble — full markdown via MessageResponse
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

        {msg.content ? (
          isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
          ) : (
            <MessageResponse className="prose-streamdown">
              {msg.content}
            </MessageResponse>
          )
        ) : isStreaming ? (
          <Shimmer duration={1}>Thinking…</Shimmer>
        ) : null}
      </MessageContent>
    </Message>
  );
}

// ──────────────────────────────────────────────
// Empty state — Gemini Neural Expressive style
// Minimal: animated logo + greeting + 4 suggestion chips
// ──────────────────────────────────────────────
const PROMPT_SUGGESTIONS = [
  { icon: SearchIcon, text: "Research a topic", color: "text-teal" },
  { icon: CodeIcon, text: "Write and debug code", color: "text-coral" },
  { icon: BrainIcon, text: "Explain a concept", color: "text-primary" },
  { icon: SparklesIcon, text: "Plan a project", color: "text-success" },
];

function EmptyState({ onSuggestion, userName }: { onSuggestion: (text: string) => void; userName?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 -mt-8">
      {/* Animated gradient logo — Gemini-style */}
      <div className="relative mb-6">
        <div
          className="w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/20"
          style={{
            background:
              "conic-gradient(from 180deg at 50% 50%, #4796E4 0deg, #847ACE 90deg, #C3677F 180deg, #4796E4 360deg)",
          }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path
              d="M16 2L20 12L30 16L20 20L16 30L12 20L2 16L12 12L16 2Z"
              fill="white"
              opacity="0.95"
            />
          </svg>
        </div>
        {/* Subtle glow */}
        <div
          className="absolute inset-0 rounded-3xl blur-2xl opacity-30 -z-10"
          style={{
            background:
              "conic-gradient(from 180deg at 50% 50%, #4796E4 0deg, #847ACE 90deg, #C3677F 180deg)",
          }}
        />
      </div>

      {/* Greeting */}
      <h1 className="text-3xl md:text-4xl font-medium tracking-tight font-space-grotesk text-center mb-1">
        Hi, {userName || "there"}.
      </h1>
      <p className="text-base md:text-lg text-muted-foreground/70 text-center font-light mb-10">
        Where should we begin?
      </p>

      {/* Suggestion chips */}
      <div className="flex flex-wrap justify-center gap-2 max-w-md w-full">
        {PROMPT_SUGGESTIONS.map((s) => (
          <button
            key={s.text}
            onClick={() => onSuggestion(s.text)}
            className="group flex items-center gap-2 px-4 py-2.5 rounded-full border border-border/60 bg-card/60 backdrop-blur-sm hover:bg-card hover:border-foreground/20 transition-all text-sm"
          >
            <s.icon size={14} className={s.color} />
            <span className="text-foreground/80 group-hover:text-foreground">{s.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Chat Container
// ──────────────────────────────────────────────
interface ChatContainerProps {
  initialSessionId?: string | null;
  onSessionCreated?: (id: string) => void;
  onMenuClick?: () => void;
}

export default function ChatContainer({ initialSessionId, onSessionCreated, onMenuClick }: ChatContainerProps) {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [model, setModel] = useState("MiniMax-M2");
  const [refreshKey, setRefreshKey] = useState(0);
  const [inputText, setInputText] = useState("");
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputText(e.target.value);
    },
    []
  );

  // Create a new session
  const createSession = useCallback(async (): Promise<string> => {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: "New Chat" }),
    });
    const data = await res.json();
    setSessionId(data.id);
    onSessionCreated?.(data.id);
    setMessages([]);
    setRefreshKey((k) => k + 1);
    return data.id;
  }, [token, onSessionCreated]);

  // Load session messages
  const loadSession = useCallback(
    async (id: string) => {
      setLoading(true);
      setSessionId(id);
      setMessages([]);
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
                : m.citations ? JSON.parse(String(m.citations)) : [],
            }))
          );
        }
      } catch (err) {
        console.error("Load session error:", err);
      }
      setLoading(false);
    },
    [token]
  );

  // Load initial session
  useEffect(() => {
    if (initialSessionId) loadSession(initialSessionId);
    else {
      setSessionId(null);
      setMessages([]);
    }
  }, [initialSessionId, loadSession]);

  // Listen to session refresh events
  useEffect(() => {
    const handler = () => setRefreshKey((k) => k + 1);
    window.addEventListener("agenticos-refresh-sessions", handler);
    return () => window.removeEventListener("agenticos-refresh-sessions", handler);
  }, []);

  // Detect step icon
  const detectStepIcon = (text: string): string => {
    const lower = text.toLowerCase();
    if (lower.includes("search") || lower.includes("look up") || lower.includes("find ")) return "search";
    if (lower.includes("calculat") || lower.includes("math") || lower.includes("compute")) return "calc";
    if (lower.includes("fetch") || lower.includes("read") || lower.includes("browse")) return "fetch";
    if (lower.includes("databas") || lower.includes("query") || lower.includes("sql")) return "database";
    if (lower.includes("code") || lower.includes("function") || lower.includes("implement")) return "code";
    if (lower.includes("tool") || lower.includes("call") || lower.includes("execute")) return "tool";
    return "brain";
  };

  // Send message
  const handleSendMessage = useCallback(
    async (text: string) => {
      let currentSessionId = sessionId;
      if (!currentSessionId) currentSessionId = await createSession();

      const userMsg: MessageData = {
        id: `temp-${Date.now()}`,
        role: "user",
        content: text,
        reasoningSteps: [],
        toolCalls: [],
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setIsStreaming(true);

      try {
        await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ sessionId: currentSessionId, role: "user", content: text }),
        });

        const chatRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            sessionId: currentSessionId,
            messages: [...messages, { role: "user", content: text }],
            model,
          }),
        });

        if (!chatRes.ok) {
          const err = await chatRes.json();
          throw new Error(err.error || "Chat failed");
        }

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
          model,
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
                const splitLines = reasoningBuffer.split(/\n+/).filter(Boolean).slice(-15);
                reasoningSteps = splitLines.map((s, i, arr) => ({
                  title: s.trim().slice(0, 120),
                  status: i === arr.length - 1 ? "active" : "complete",
                  icon: detectStepIcon(s),
                }));
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...updated[updated.length - 1], reasoningSteps };
                  return updated;
                });
              } else if (data.type === "tool-call") {
                toolCalls.push({ name: data.toolName, state: "input-available", args: data.args });
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
            } catch {}
          }
        }

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

        await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            sessionId: currentSessionId,
            role: "assistant",
            content: cleanText,
            reasoningSteps: finalSteps,
            toolCalls,
            citations,
            model,
          }),
        });

        // Trigger sidebar refresh
        window.dispatchEvent(new Event("agenticos-refresh-sessions"));
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
    },
    [sessionId, token, messages, model, createSession]
  );

  // Form submit
  const handleSubmit = useCallback(
    async (message: { text: string; files?: unknown[] }) => {
      const text = (message?.text || inputText).trim();
      if (!text || loading) return;
      setInputText("");
      await handleSendMessage(text);
    },
    [loading, handleSendMessage, inputText]
  );

  // Simple send from mobile button (uses inputText state directly)
  const handleQuickSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || loading) return;
    setInputText("");
    await handleSendMessage(text);
  }, [inputText, loading, handleSendMessage]);

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Top bar — Gemini-style */}
      <header className="flex items-center justify-between px-3 md:px-5 h-12 border-b border-border flex-shrink-0 bg-background/95 backdrop-blur-md z-20">
        <div className="flex items-center gap-2 min-w-0">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="p-2 rounded-lg hover:bg-secondary text-foreground transition-colors"
              aria-label="Open menu"
            >
              <MenuIcon size={18} />
            </button>
          )}
          <ModelSelector open={modelSelectorOpen} onOpenChange={setModelSelectorOpen}>
            <ModelSelectorTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-muted text-foreground text-[15px] font-medium transition-colors">
                <SparklesIcon size={15} className="text-teal" />
                <span className="truncate">{model === "MiniMax-M2-Reasoning" ? "M2 Reasoning" : "agenticOS"}</span>
                <svg width="11" height="11" viewBox="0 0 10 10" fill="none" className="opacity-50 flex-shrink-0">
                  <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </ModelSelectorTrigger>
            <ModelSelectorContent>
              <ModelSelectorInput placeholder="Search models..." />
              <ModelSelectorList>
                <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                <ModelSelectorGroup heading="Available">
                  <ModelSelectorItem value="MiniMax-M2" onSelect={() => { setModel("MiniMax-M2"); setModelSelectorOpen(false); }}>
                    <ModelSelectorName>MiniMax M2</ModelSelectorName>
                  </ModelSelectorItem>
                  <ModelSelectorItem value="MiniMax-M2-Reasoning" onSelect={() => { setModel("MiniMax-M2-Reasoning"); setModelSelectorOpen(false); }}>
                    <ModelSelectorName>MiniMax M2 Reasoning</ModelSelectorName>
                  </ModelSelectorItem>
                </ModelSelectorGroup>
              </ModelSelectorList>
            </ModelSelectorContent>
          </ModelSelector>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary/50">
            <span className={`w-1.5 h-1.5 rounded-full ${isStreaming ? "bg-amber-400 animate-pulse" : "bg-success"}`} />
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              {isStreaming ? "Processing" : "Ready"}
            </span>
          </div>
        </div>
      </header>

      {/* Conversation — scrollable only this area, input is fixed to viewport on mobile */}
      <div className="flex-1 overflow-y-auto relative pb-32 md:pb-4">
        {messages.length === 0 && !loading ? (
          <EmptyState onSuggestion={handleSendMessage} userName={user?.name?.split(" ")[0]} />
        ) : (
          <Conversation className="h-full">
            <ConversationContent className="p-3 md:p-5 space-y-5 max-w-3xl mx-auto w-full">
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

      {/* Gemini-style floating input pill — fixed to viewport bottom on mobile, normal flex on desktop */}
      <div
        className="fixed md:relative bottom-0 left-0 right-0 md:bottom-auto md:left-auto md:right-auto z-30 px-3 md:px-5 flex-shrink-0"
        style={{ paddingBottom: "max(0.6rem, env(safe-area-inset-bottom))" }}
      >
        <div className="max-w-3xl mx-auto">
          {/* Subtle gradient fade above the input for separation */}
          <div className="h-4 -mt-4 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          <PromptInput
            onSubmit={handleSubmit as (m: PromptInputMessage) => void}
            disabled={loading}
            className="relative border border-border/60 bg-card/95 backdrop-blur-xl shadow-[0_2px_24px_-8px_rgba(0,0,0,0.12)] dark:shadow-[0_2px_24px_-8px_rgba(0,0,0,0.5)] rounded-[28px] focus-within:border-foreground/20 focus-within:shadow-[0_4px_28px_-8px_rgba(0,0,0,0.18)] dark:focus-within:shadow-[0_4px_28px_-8px_rgba(0,0,0,0.6)] transition-all"
          >
            <PromptInputHeader />
            <PromptInputBody>
              <PromptInputTextarea
                value={inputText}
                onChange={handleTextChange}
                placeholder="Ask anything…"
                disabled={loading}
                className="min-h-12 max-h-40 text-[15px] leading-relaxed placeholder:text-muted-foreground/60 resize-none border-0 bg-transparent px-4 py-3"
                rows={1}
              />
            </PromptInputBody>
            <PromptInputFooter className="px-2 pb-2 pt-0">
              <PromptInputTools className="gap-0.5">
                {/* Single + menu groups everything */}
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger className="h-9 w-9 rounded-full hover:bg-muted text-foreground/80 hover:text-foreground" />
                  <PromptInputActionMenuContent
                    align="start"
                    side="top"
                    className="w-56"
                  >
                    <PromptInputActionMenuItem
                      onClick={() => setUseWebSearch((v) => !v)}
                    >
                      <GlobeIcon size={14} className="mr-2" />
                      {useWebSearch ? "✓ Web search" : "Web search"}
                    </PromptInputActionMenuItem>
                    <PromptInputActionAddAttachments />
                    <div className="border-t border-border my-1" />
                    <div className="px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                      Model
                    </div>
                    <PromptInputActionMenuItem
                      onClick={() => setModel("MiniMax-M2")}
                    >
                      <SparklesIcon size={14} className="mr-2 text-teal" />
                      MiniMax M2
                      {model === "MiniMax-M2" && (
                        <CheckIcon size={12} className="ml-auto text-teal" />
                      )}
                    </PromptInputActionMenuItem>
                    <PromptInputActionMenuItem
                      onClick={() => setModel("MiniMax-M2-Reasoning")}
                    >
                      <BrainIcon size={14} className="mr-2 text-coral" />
                      MiniMax M2 Reasoning
                      {model === "MiniMax-M2-Reasoning" && (
                        <CheckIcon size={12} className="ml-auto text-coral" />
                      )}
                    </PromptInputActionMenuItem>
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>

                {useWebSearch && (
                  <span className="h-7 px-2.5 rounded-full bg-teal/10 border border-teal/20 text-[10px] font-medium text-teal flex items-center gap-1 ml-0.5">
                    <GlobeIcon size={11} />
                    Search
                    <button
                      onClick={() => setUseWebSearch(false)}
                      className="ml-1 hover:text-teal/70"
                    >
                      ×
                    </button>
                  </span>
                )}
              </PromptInputTools>

              {/* Big prominent send button like Gemini/ChatGPT */}
              <PromptInputSubmit
                disabled={!inputText.trim() || loading}
                status={loading ? "streaming" : "ready"}
                className="h-10 w-10 rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:bg-muted disabled:text-muted-foreground shadow-sm transition-all"
              />
            </PromptInputFooter>
          </PromptInput>

          {/* Disclaimer — subtle, Gemini-style */}
          <p className="text-center text-[10px] text-muted-foreground/60 mt-2 px-2">
            agenticOS can make mistakes. Verify important info.
          </p>
        </div>
      </div>
    </div>
  );
}
