// Sub-agent types — shared across all specialized agents
// Each sub-agent is a focused AI task that the main agent can delegate to

export type SubAgentId =
  | "researcher"
  | "coder"
  | "memory-keeper"
  | "writer"
  | "analyst"
  | "browser"
  | "knowledge"
  | "operator"
  | "personalization"
  | "leadgen"
  | "developer"
  | "business-strategist";

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
    type: "started" | "thinking" | "tool-call" | "tool-result" | "done" | "error";
    message: string;
    toolName?: string;
    result?: string;
  }) => void;
  model?: string;
  maxSteps?: number;
}
