// Operator sub-agent — focused on running shell commands
// Sandboxed by default, requires approval for dangerous commands
// OpenClaw-style exec tool

import { createMinimax } from "vercel-minimax-ai-provider";
import { generateText, tool, zodSchema } from "ai";
import { z } from "zod";
import type { SubAgentCallOptions, SubAgentResult } from "./types";
import { execCommand, checkApproval } from "@/lib/exec/sandbox";

const minimax = (apiKey: string) => createMinimax({ apiKey });

const OPERATOR_SYSTEM = `You are the Operator sub-agent inside agenticOS.

Your ONLY job is to run shell commands and report results. You are NOT the main agent. You receive a task that needs a command to be run, you run it, then return a concise result.

Tools you have:
- \`run_command(command, cwd?, timeoutMs?)\` — execute a shell command
- \`check_command(command)\` — check if a command needs approval (dry-run)

Workflow:
1. **Check approval** for the command first if you're not sure.
2. **Run the command** with \`run_command\`.
3. **Parse the output** and synthesize a useful answer.
4. **Suggest follow-ups** if relevant.

Output rules:
- Lead with the most important finding from the output.
- Quote key parts of stdout/stderr verbatim when relevant.
- If the command failed, explain why and suggest a fix.
- If approval is required, surface that clearly to the user.
- Don't run the same command twice.

Return ONLY the result of the command execution. Do not include meta-commentary.`;

export async function runOperator(
  opts: SubAgentCallOptions & { approvedCommands?: string[] }
): Promise<SubAgentResult> {
  const start = Date.now();
  const apiKey = process.env.MINIMAX_API_KEY;

  if (!apiKey) {
    return {
      agent: "researcher",
      task: opts.task,
      output: "",
      success: false,
      error: "MINIMAX_API_KEY not configured",
      durationMs: 0,
    };
  }

  opts.onProgress?.({ type: "started", message: `Operator: ${opts.task}` });

  try {
    const result = await generateText({
      model: minimax(apiKey)(opts.model || "MiniMax-M2"),
      system: OPERATOR_SYSTEM,
      prompt: opts.context
        ? `Task: ${opts.task}\n\nContext: ${opts.context}`
        : `Task: ${opts.task}`,
      tools: {
        run_command: tool({
          description: "Execute a shell command and return its output.",
          inputSchema: zodSchema(
            z.object({
              command: z.string().describe("The shell command to run"),
              cwd: z.string().optional().describe("Working directory (optional)"),
              timeoutMs: z.number().optional().describe("Timeout in ms (default 30000)"),
            })
          ),
          execute: async ({ command, cwd, timeoutMs }) => {
            opts.onProgress?.({
              type: "tool-call",
              message: `Running: ${command.slice(0, 80)}`,
              toolName: "run_command",
            });

            // Check if user has pre-approved this command
            const isApproved = opts.approvedCommands?.some(
              (approved) => approved === command || command.startsWith(approved)
            );

            const result = await execCommand({
              command,
              cwd,
              timeoutMs,
              env: isApproved ? { __APPROVED: "1" } : undefined,
            });

            opts.onProgress?.({
              type: "tool-result",
              message: result.requiresApproval
                ? `Needs approval: ${result.approvalReason}`
                : `Exit ${result.exitCode} in ${result.durationMs}ms`,
              toolName: "run_command",
            });

            return {
              exitCode: result.exitCode,
              durationMs: result.durationMs,
              truncated: result.truncated,
              requiresApproval: result.requiresApproval,
              approvalReason: result.approvalReason,
              stdout: result.stdout,
              stderr: result.stderr,
            };
          },
        }),

        check_command: tool({
          description: "Check whether a command would require user approval (dry run).",
          inputSchema: zodSchema(
            z.object({ command: z.string().describe("The shell command to check") })
          ),
          execute: async ({ command }) => {
            const approval = checkApproval(command);
            opts.onProgress?.({
              type: "tool-call",
              message: `Checking: ${command.slice(0, 80)}`,
              toolName: "check_command",
            });
            opts.onProgress?.({
              type: "tool-result",
              message: approval.requiresApproval
                ? `Requires approval: ${approval.reason}`
                : "OK to run",
              toolName: "check_command",
            });
            return approval;
          },
        }),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const output = result.text || "No operator output produced.";
    opts.onProgress?.({ type: "done", message: "Operator finished" });

    return {
      agent: "researcher",
      task: opts.task,
      output,
      durationMs: Date.now() - start,
      success: true,
    };
  } catch (err) {
    return {
      agent: "researcher",
      task: opts.task,
      output: "",
      success: false,
      error: String(err),
      durationMs: Date.now() - start,
    };
  }
}
