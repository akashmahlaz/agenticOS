// Sub-agent types — shared across all specialized agents
// Each sub-agent is a focused AI task that the main agent can delegate to

export type SubAgentId =
  | "researcher"
  | "coder"
  | "memory-keeper"
  | "writer"
  | "analyst";

export interface SubAgentResult {
  agent: SubAgentId;
  task: string;
  output: string;
  sources?: Array<{ title?: string; url?: string; snippet?: string }>;
  artifacts?: Array<{ name: string; content: string; type: "code" | "doc" | "data" }>;
  durationMs: number;
  success: boolean;
  error?: string;
}

export interface SubAgentCallOptions {
  task: string;
  context?: string;
  onProgress?: (event: {
    type: "started" | "thinking" | "tool-call" | "tool-result" | "done";
    message: string;
    toolName?: string;
  }) => void;
  model?: string;
  maxSteps?: number;
}
