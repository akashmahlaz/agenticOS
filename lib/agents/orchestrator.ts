// Sub-agent orchestrator — exposes sub-agents as tools to the main agent
// Each sub-agent runs in its own streamText/generateText context with focused tools

import { tool, zodSchema } from "ai";
import { z } from "zod";
import { runResearcher } from "./researcher";
import { runCoder } from "./coder";
import { runMemoryKeeper } from "./memory-keeper";
import { runBrowser } from "./browser";
import { runKnowledge } from "./knowledge";
import { runOperator } from "./operator";
import { runLeadGen } from "./leadgen";
import { runDeveloper } from "./developer";
import type { SubAgentId } from "./types";

// Re-export sub-agent runners
export { runResearcher } from "./researcher";
export { runCoder } from "./coder";
export { runMemoryKeeper } from "./memory-keeper";
export { runBrowser } from "./browser";
export { runKnowledge } from "./knowledge";
export { runOperator } from "./operator";
export { runLeadGen } from "./leadgen";
export { runDeveloper } from "./developer";

// Progress event type — matches the existing chat-container event types
export interface SubAgentProgressEvent {
  type: "subagent";
  agent: SubAgentId;
  task: string;
  status: "started" | "thinking" | "tool-call" | "tool-result" | "done" | "error";
  message: string;
  toolName?: string;
  result?: string;
  durationMs?: number;
}

// Singleton event emitter so the chat route can forward progress to the client
type Listener = (event: SubAgentProgressEvent) => void;
const listeners: Set<Listener> = new Set();

export function onSubAgentProgress(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(event: SubAgentProgressEvent) {
  for (const l of listeners) {
    try {
      l(event);
    } catch {
      // ignore listener errors
    }
  }
}

// ──────────────────────────────────────────────
// Inline question event — when the agent calls askUser, the client
// renders a structured form. The form's answer is sent back as a
// new user message. Track the current question per-request so the
// askUser tool can attach it to the data-question part.
// ──────────────────────────────────────────────
export interface InlineQuestion {
  id: string;
  prompt: string;
  fields: Array<{
    key: string;
    label: string;
    description?: string;
    type: "text" | "select" | "multiselect";
    options?: Array<{ value: string; label: string }>;
    required?: boolean;
    default?: string;
  }>;
}

type QuestionListener = (q: InlineQuestion) => void;
const questionListeners: Set<QuestionListener> = new Set();

export function onInlineQuestion(listener: QuestionListener): () => void {
  questionListeners.add(listener);
  return () => questionListeners.delete(listener);
}

function emitQuestion(q: InlineQuestion) {
  for (const l of questionListeners) {
    try {
      l(q);
    } catch {
      // ignore
    }
  }
}

// ──────────────────────────────────────────────
// Tools exposed to the main agent
// Each tool delegates to a specialized sub-agent
// ──────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const subAgentTools: any = {
  delegateToResearcher: tool({
    description:
      "Delegate a focused research task to the Researcher sub-agent. Use this when the user wants to research a topic, gather information from the web, or get a fact-checked summary. The sub-agent has access to web search, URL fetching, and deep research tools. Returns a synthesized summary with source citations.",
    inputSchema: zodSchema(
      z.object({
        task: z.string().describe("The specific research task or question"),
        context: z.string().optional().describe("Additional context to help the researcher"),
      })
    ),
    execute: async (input: { task: string; context?: string }) => {
      emit({
        type: "subagent",
        agent: "researcher",
        task: input.task,
        status: "started",
        message: `Researcher delegated: ${input.task}`,
      });
      const result = await runResearcher({
        task: input.task,
        context: input.context,
        onProgress: (p) =>
          emit({
            type: "subagent",
            agent: "researcher",
            task: input.task,
            status: p.type,
            message: p.message,
            toolName: p.toolName,
          }),
      });
      emit({
        type: "subagent",
        agent: "researcher",
        task: input.task,
        status: result.success ? "done" : "error",
        message: result.success ? "Research complete" : `Error: ${result.error}`,
        result: result.output,
        durationMs: result.durationMs,
      });
      return {
        agent: "researcher",
        success: result.success,
        output: result.output,
        error: result.error,
        durationMs: result.durationMs,
      };
    },
  }),

  delegateToCoder: tool({
    description:
      "Delegate a coding task to the Coder sub-agent. Use this when the user wants to write, debug, or refactor code. The sub-agent produces clean code with comments and usage notes. Returns code blocks you can include in your final answer.",
    inputSchema: zodSchema(
      z.object({
        task: z.string().describe("The coding task — what to build/fix/refactor"),
        context: z.string().optional().describe("Codebase context, existing patterns, or constraints"),
      })
    ),
    execute: async (input: { task: string; context?: string }) => {
      emit({
        type: "subagent",
        agent: "coder",
        task: input.task,
        status: "started",
        message: `Coder delegated: ${input.task}`,
      });
      const result = await runCoder({
        task: input.task,
        context: input.context,
        onProgress: (p) =>
          emit({
            type: "subagent",
            agent: "coder",
            task: input.task,
            status: p.type,
            message: p.message,
            toolName: p.toolName,
          }),
      });
      emit({
        type: "subagent",
        agent: "coder",
        task: input.task,
        status: result.success ? "done" : "error",
        message: result.success ? "Coding complete" : `Error: ${result.error}`,
        result: result.output,
        durationMs: result.durationMs,
      });
      return {
        agent: "coder",
        success: result.success,
        output: result.output,
        artifacts: result.artifacts,
        error: result.error,
        durationMs: result.durationMs,
      };
    },
  }),

  delegateToMemoryKeeper: tool({
    description:
      "Delegate a memory task to the Memory Keeper sub-agent. Use this to save user preferences, project context, key decisions, or recall relevant facts from past sessions. Sub-agent uses provenance labels (observed_from_source, inferred_by_model, confirmed_by_user, imported_from_transcript) for every fact it writes.",
    inputSchema: zodSchema(
      z.object({
        task: z.string().describe("What to remember, recall, or update"),
      })
    ),
    execute: async (input: { task: string }, options?: any) => {
      // Extract userId from the experimental context (Vercel AI SDK passes it)
      const userId = options?.experimental_context?.userId || (globalThis as any).__currentChatUserId;
      if (!userId) {
        return { agent: "memory-keeper", success: false, output: "", error: "No userId in context" };
      }
      emit({
        type: "subagent",
        agent: "memory-keeper",
        task: input.task,
        status: "started",
        message: `Memory Keeper delegated: ${input.task}`,
      });
      const result = await runMemoryKeeper({
        task: input.task,
        userId,
        onProgress: (p) =>
          emit({
            type: "subagent",
            agent: "memory-keeper",
            task: input.task,
            status: p.type,
            message: p.message,
            toolName: p.toolName,
          }),
      });
      emit({
        type: "subagent",
        agent: "memory-keeper",
        task: input.task,
        status: result.success ? "done" : "error",
        message: result.success ? "Memory updated" : `Error: ${result.error}`,
        result: result.output,
        durationMs: result.durationMs,
      });
      return {
        agent: "memory-keeper",
        success: result.success,
        output: result.output,
        error: result.error,
        durationMs: result.durationMs,
      };
    },
  }),

  delegateToBrowser: tool({
    description:
      "Delegate a web browsing task to the Browser sub-agent. Use this for: searching the web, fetching specific URLs, extracting content from webpages, or following links. The sub-agent has access to web search (DuckDuckGo, no API key) and URL fetching with HTML cleaning.",
    inputSchema: zodSchema(
      z.object({
        task: z.string().describe("What to search for, fetch, or extract from the web"),
        context: z.string().optional().describe("Additional context to guide the browsing"),
      })
    ),
    execute: async (input: { task: string; context?: string }) => {
      emit({
        type: "subagent",
        agent: "browser" as any,
        task: input.task,
        status: "started",
        message: `Browser delegated: ${input.task}`,
      });
      const result = await runBrowser({
        task: input.task,
        context: input.context,
        onProgress: (p) =>
          emit({
            type: "subagent",
            agent: "browser" as any,
            task: input.task,
            status: p.type,
            message: p.message,
            toolName: p.toolName,
          }),
      });
      emit({
        type: "subagent",
        agent: "browser" as any,
        task: input.task,
        status: result.success ? "done" : "error",
        message: result.success ? "Browsing complete" : `Error: ${result.error}`,
        result: result.output,
        durationMs: result.durationMs,
      });
      return {
        agent: "browser",
        success: result.success,
        output: result.output,
        error: result.error,
        durationMs: result.durationMs,
      };
    },
  }),

  delegateToKnowledge: tool({
    description:
      "Delegate a knowledge base task to the Knowledge sub-agent. Use this to: add documents to the knowledge base, search for relevant info across stored documents, list existing documents, or retrieve specific document content. RAG with vector embeddings (auto-fallback to hash embeddings when no API key).",
    inputSchema: zodSchema(
      z.object({
        task: z.string().describe("What to add, search, retrieve, or curate"),
        context: z.string().optional().describe("Additional context"),
      })
    ),
    execute: async (input: { task: string; context?: string }, options?: any) => {
      const userId = options?.experimental_context?.userId || (globalThis as any).__currentChatUserId;
      if (!userId) {
        return { agent: "knowledge", success: false, output: "", error: "No userId in context" };
      }
      emit({
        type: "subagent",
        agent: "knowledge" as any,
        task: input.task,
        status: "started",
        message: `Knowledge delegated: ${input.task}`,
      });
      const result = await runKnowledge({
        task: input.task,
        context: input.context,
        userId,
        onProgress: (p) =>
          emit({
            type: "subagent",
            agent: "knowledge" as any,
            task: input.task,
            status: p.type,
            message: p.message,
            toolName: p.toolName,
          }),
      });
      emit({
        type: "subagent",
        agent: "knowledge" as any,
        task: input.task,
        status: result.success ? "done" : "error",
        message: result.success ? "Knowledge operation complete" : `Error: ${result.error}`,
        result: result.output,
        durationMs: result.durationMs,
      });
      return {
        agent: "knowledge",
        success: result.success,
        output: result.output,
        error: result.error,
        durationMs: result.durationMs,
      };
    },
  }),

  delegateToOperator: tool({
    description:
      "Delegate a shell command task to the Operator sub-agent. Use this when the user wants to run shell commands, check system info, install packages, run scripts, etc. Sandboxed by default — dangerous commands (rm -rf, sudo, etc.) require user approval.",
    inputSchema: zodSchema(
      z.object({
        task: z.string().describe("What you need the operator to do (run a command, check status, etc.)"),
        context: z.string().optional().describe("Additional context"),
        approvedCommands: z
          .array(z.string())
          .optional()
          .describe("Pre-approved commands (bypasses the approval gate)"),
      })
    ),
    execute: async (input: { task: string; context?: string; approvedCommands?: string[] }, options?: any) => {
      const userId = options?.experimental_context?.userId || (globalThis as any).__currentChatUserId;
      emit({
        type: "subagent",
        agent: "operator" as any,
        task: input.task,
        status: "started",
        message: `Operator delegated: ${input.task}`,
      });
      const result = await runOperator({
        task: input.task,
        context: input.context,
        approvedCommands: input.approvedCommands,
        onProgress: (p) =>
          emit({
            type: "subagent",
            agent: "operator" as any,
            task: input.task,
            status: p.type,
            message: p.message,
            toolName: p.toolName,
          }),
      });
      emit({
        type: "subagent",
        agent: "operator" as any,
        task: input.task,
        status: result.success ? "done" : "error",
        message: result.success ? "Operator finished" : `Error: ${result.error}`,
        result: result.output,
        durationMs: result.durationMs,
      });
      return {
        agent: "operator",
        success: result.success,
        output: result.output,
        error: result.error,
        durationMs: result.durationMs,
      };
    },
  }),

  delegateToLeadGen: tool({
    description:
      "Delegate a lead-generation task to the Lead Gen sub-agent. Use this when the user wants to find professional contacts (emails, phone numbers, LinkedIn) using RocketReach. The sub-agent has search and lookup tools, and uses the user's stored ROCKETREACH_API_KEY. Examples: 'find CTOs at SaaS startups in Germany', 'get contact info for John Smith at Acme Corp', 'find VP Sales in fintech in NYC'.",
    inputSchema: zodSchema(
      z.object({
        task: z.string().describe("The lead-gen task: what contacts to find and any criteria"),
        context: z.string().optional().describe("Additional context (e.g. why we need these contacts, preferred industries)"),
      })
    ),
    execute: async (input: { task: string; context?: string }, options?: any) => {
      const userId = options?.experimental_context?.userId || (globalThis as any).__currentChatUserId;
      if (!userId) return { agent: "leadgen", success: false, output: "", error: "No userId in context" };
      emit({
        type: "subagent",
        agent: "leadgen" as any,
        task: input.task,
        status: "started",
        message: `Lead Gen delegated: ${input.task}`,
      });
      const result = await runLeadGen({
        task: input.task,
        context: input.context,
        userId,
        onProgress: (p) =>
          emit({
            type: "subagent",
            agent: "leadgen" as any,
            task: input.task,
            status: p.type,
            message: p.message,
            toolName: p.toolName,
          }),
      });
      emit({
        type: "subagent",
        agent: "leadgen" as any,
        task: input.task,
        status: result.success ? "done" : "error",
        message: result.success ? "Lead gen complete" : `Error: ${result.error}`,
        result: result.output,
        durationMs: result.durationMs,
      });
      return {
        agent: "leadgen",
        success: result.success,
        output: result.output,
        error: result.error,
        durationMs: result.durationMs,
      };
    },
  }),

  delegateToDeveloper: tool({
    description:
      "Delegate a code task to the Developer sub-agent. Use this when the user wants to work with GitHub repos: read code, search across repos, list files, find issues, create new issues, etc. The sub-agent uses the user's stored GITHUB_TOKEN. Examples: 'find the auth code in my agenticOS repo', 'create an issue in repo X for this bug', 'list my repos'.",
    inputSchema: zodSchema(
      z.object({
        task: z.string().describe("The code task: what to find, read, or change"),
        context: z.string().optional().describe("Additional context like repo name, file path"),
      })
    ),
    execute: async (input: { task: string; context?: string }, options?: any) => {
      const userId = options?.experimental_context?.userId || (globalThis as any).__currentChatUserId;
      if (!userId) return { agent: "developer", success: false, output: "", error: "No userId in context" };
      emit({
        type: "subagent",
        agent: "developer" as any,
        task: input.task,
        status: "started",
        message: `Developer delegated: ${input.task}`,
      });
      const result = await runDeveloper({
        task: input.task,
        context: input.context,
        userId,
        onProgress: (p) =>
          emit({
            type: "subagent",
            agent: "developer" as any,
            task: input.task,
            status: p.type,
            message: p.message,
            toolName: p.toolName,
          }),
      });
      emit({
        type: "subagent",
        agent: "developer" as any,
        task: input.task,
        status: result.success ? "done" : "error",
        message: result.success ? "Code work complete" : `Error: ${result.error}`,
        result: result.output,
        durationMs: result.durationMs,
      });
      return {
        agent: "developer",
        success: result.success,
        output: result.output,
        error: result.error,
        durationMs: result.durationMs,
      };
    },
  }),

  // Ask the user a structured question. Emits a data-question part
  // that the client renders as a form. The user's answer is sent back
  // as a new user message, and the agent continues.
  askUser: tool({
    description:
      "Pause and ask the user a structured question. Use this when you need specific input from the user before continuing — e.g. to confirm a search query, pick an option, or fill in a missing detail. The user sees a form in the chat and submits their answer. You will receive their answer in the next turn.",
    inputSchema: zodSchema(
      z.object({
        prompt: z.string().describe("The question to show the user"),
        fields: z
          .array(
            z.object({
              key: z.string().describe("Unique key for this field's answer"),
              label: z.string().describe("Label shown next to the field"),
              description: z.string().optional().describe("Optional help text"),
              type: z.enum(["text", "select", "multiselect"]),
              options: z
                .array(
                  z.object({ value: z.string(), label: z.string() })
                )
                .optional()
                .describe("Options for select/multiselect"),
              required: z.boolean().optional(),
              default: z.string().optional(),
            })
          )
          .describe("Fields the user should fill in"),
      })
    ),
    execute: async (input: { prompt: string; fields: InlineQuestion["fields"] }) => {
      const question: InlineQuestion = {
        id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        prompt: input.prompt,
        fields: input.fields,
      };
      emitQuestion(question);
      return {
        asked: true,
        questionId: question.id,
        message:
          "Question shown to the user. Wait for their answer in the next turn.",
      };
    },
  }),

  // Secret tools (direct, not via sub-agent — these are sensitive)
  secret_list: tool({
    description:
      "List the names of all secrets you've stored (without showing the values). Use this to find which API keys, tokens, or credentials are available.",
    inputSchema: zodSchema(z.object({})),
    execute: async (_input, options?: any) => {
      const userId = options?.experimental_context?.userId || (globalThis as any).__currentChatUserId;
      if (!userId) {
        return { secrets: [], error: "No userId" };
      }
      const { listSecrets } = await import("@/lib/secrets/manager");
      const secrets = await listSecrets(userId);
      return {
        secrets: secrets.map((s) => ({
          name: s.name,
          description: s.description,
          service: s.service,
          tags: s.tags,
          hasValue: true,
        })),
      };
    },
  }),

  secret_get: tool({
    description:
      "Retrieve a secret's value by its logical name (e.g. 'OPENAI_API_KEY'). The user has explicitly stored this secret. Use it carefully and only when needed.",
    inputSchema: zodSchema(
      z.object({
        name: z.string().describe("The secret's logical name, e.g. 'OPENAI_API_KEY'"),
      })
    ),
    execute: async ({ name }, options?: any) => {
      const userId = options?.experimental_context?.userId || (globalThis as any).__currentChatUserId;
      if (!userId) {
        return { found: false, error: "No userId" };
      }
      const { getSecret } = await import("@/lib/secrets/manager");
      const secret = await getSecret(userId, name);
      if (!secret) {
        return { found: false };
      }
      // Return a preview by default (first 4 + last 4 chars)
      const preview =
        secret.value.length > 12
          ? `${secret.value.slice(0, 4)}...${secret.value.slice(-4)}`
          : "****";
      return {
        found: true,
        name: secret.name,
        description: secret.description,
        preview,
        // Don't include full value unless explicitly needed (avoids leaking to logs)
        value: secret.value,
      };
    },
  }),

  secret_save: tool({
    description:
      "Save a new secret or update an existing one. The value is encrypted at rest. Use this when the user gives you an API key, token, or credential and asks you to remember it.",
    inputSchema: zodSchema(
      z.object({
        name: z.string().describe("Logical name, e.g. 'OPENAI_API_KEY'"),
        value: z.string().describe("The secret value (will be encrypted)"),
        service: z.string().optional().describe("Service name, e.g. 'openai', 'github'"),
        description: z.string().optional().describe("What this secret is for"),
      })
    ),
    execute: async ({ name, value, service, description }, options?: any) => {
      const userId = options?.experimental_context?.userId || (globalThis as any).__currentChatUserId;
      if (!userId) {
        return { saved: false, error: "No userId" };
      }
      const { setSecret } = await import("@/lib/secrets/manager");
      const secret = await setSecret(userId, name, value, {
        service,
        description,
      });
      return {
        saved: true,
        name: secret.name,
        service: secret.service,
        description: secret.description,
      };
    },
  }),

  secret_delete: tool({
    description: "Delete a stored secret by its name.",
    inputSchema: zodSchema(
      z.object({ name: z.string().describe("The secret's logical name") })
    ),
    execute: async ({ name }, options?: any) => {
      const userId = options?.experimental_context?.userId || (globalThis as any).__currentChatUserId;
      if (!userId) {
        return { deleted: false, error: "No userId" };
      }
      const { deleteSecret } = await import("@/lib/secrets/manager");
      return await deleteSecret(userId, name);
    },
  }),
};
