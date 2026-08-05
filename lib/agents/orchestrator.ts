// @ts-nocheck
// Sub-agent orchestrator — exposes sub-agents as tools to the main agent
// Each sub-agent runs in its own streamText/generateText context with focused tools

import { tool, zodSchema } from "ai";
import { z } from "zod";
import { runResearcher } from "./researcher";
import { runCoder } from "./coder";
import { runMemoryKeeper } from "./memory-keeper";
import type { SubAgentId } from "./types";

// Re-export sub-agent runners
export { runResearcher } from "./researcher";
export { runCoder } from "./coder";
export { runMemoryKeeper } from "./memory-keeper";

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
// Tools exposed to the main agent
// Each tool delegates to a specialized sub-agent
// ──────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const subAgentTools: any = {
  delegateToResearcher: tool({
    description:
      "Delegate a focused research task to the Researcher sub-agent. Use this when the user wants to research a topic, gather information from the web, or get a fact-checked summary. The sub-agent has access to web search, URL fetching, and deep research tools. Returns a synthesized summary with source citations.",
    parameters: zodSchema(
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
    parameters: zodSchema(
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
    parameters: zodSchema(
      z.object({
        task: z.string().describe("What to remember, recall, or update"),
      })
    ),
    execute: async (input: { task: string }) => {
      emit({
        type: "subagent",
        agent: "memory-keeper",
        task: input.task,
        status: "started",
        message: `Memory Keeper delegated: ${input.task}`,
      });
      const result = await runMemoryKeeper({
        task: input.task,
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
};
