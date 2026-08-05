// Chat types — shared across all chat components
// These extend the AI SDK's UIMessage with our custom data parts.

import type { UIMessage } from "ai";

// ─── Custom data parts (emitted by /api/chat) ─────────────────────────

export interface SubAgentDataPart {
  agent: string;
  task: string;
  status: "started" | "thinking" | "tool-call" | "tool-result" | "done" | "error";
  message: string;
  toolName?: string;
  result?: string;
  durationMs?: number;
}

export interface SessionDataPart {
  sessionId: string;
}

export interface SourceDataPart {
  title?: string;
  url?: string;
  snippet?: string;
}

export interface MemoryDataPart {
  event: "auto-captured";
  count: number;
}

export interface LearningDataPart {
  event: "captured";
  count: number;
  detected: Array<{
    type: string;
    text: string;
    trigger: string;
    confidence: number;
  }>;
}

export interface FinishDataPart {
  finishReason: string;
  usage: {
    input: number;
    output: number;
    total: number;
  } | null;
}

export interface ErrorDataPart {
  message: string;
}

// Extend the AI SDK's UIMessage with our custom data types
export type AgentOSUIMessage = UIMessage<
  unknown,
  {
    session: SessionDataPart;
    subagent: SubAgentDataPart;
    sources: SourceDataPart[];
    memory: MemoryDataPart;
    learning: LearningDataPart;
    finish: FinishDataPart;
    error: ErrorDataPart;
  }
>;

// ─── Session / chat metadata ───────────────────────────────────────────

export interface ChatSession {
  id: string;
  title: string;
  isTemporary: boolean;
  isShared: boolean;
  shareToken: string | null;
  model: string;
  createdAt: string;
  updatedAt: string;
}

export type ChatMode = "chat" | "voice" | "code" | "workflow" | "artifacts" | "knowledge" | "memory" | "secrets" | "personalization";
