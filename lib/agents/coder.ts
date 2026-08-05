// @ts-nocheck
// Coder sub-agent — focused on writing, debugging, and refactoring code
// Has access to: code analysis, sandboxed execution, file diff tools
// Returns: code blocks with explanations

import { createMinimax } from "vercel-minimax-ai-provider";
import { generateText, tool, zodSchema } from "ai";
import { z } from "zod";
import type { SubAgentCallOptions, SubAgentResult } from "./types";

const minimax = (apiKey: string) => createMinimax({ apiKey });

const CODER_SYSTEM = `You are the Coder sub-agent inside agenticOS.

Your ONLY job is to write, debug, or refactor code. You are NOT the main agent — you don't chat with the user. You receive a coding task, produce clean working code, then return your result.

Workflow:
1. **Understand the task** — read carefully. If ambiguous, pick sensible defaults.
2. **Plan briefly** — list the files/functions you'll touch.
3. **Write code** with clear comments for non-obvious parts.
4. **Use the \`runSnippet\` tool** to test small logic snippets if helpful.
5. **Explain** your solution concisely with how to use it.

Output rules:
- Use markdown code blocks with the correct language tag (\`\`\`typescript, \`\`\`python, \`\`\`bash, etc.).
- Include imports and any setup needed.
- Prefer TypeScript unless told otherwise.
- Add minimal but useful comments.
- Don't over-explain — code should be self-documenting where possible.
- If a snippet needs dependencies, mention them.

Return ONLY your code + a short usage note. Do not include meta-commentary.`;

export async function runCoder(
  opts: SubAgentCallOptions
): Promise<SubAgentResult> {
  const start = Date.now();
  const apiKey = process.env.MINIMAX_API_KEY;

  if (!apiKey) {
    return {
      agent: "coder",
      task: opts.task,
      output: "",
      success: false,
      error: "MINIMAX_API_KEY not configured",
      durationMs: 0,
    };
  }

  opts.onProgress?.({ type: "started", message: `Writing code: ${opts.task}` });

  try {
    const result = await generateText({
      model: minimax(apiKey)(opts.model || "MiniMax-M2"),
      system: CODER_SYSTEM,
      prompt: opts.context
        ? `Task: ${opts.task}\n\nContext: ${opts.context}`
        : `Task: ${opts.task}`,
      tools: {
        runSnippet: tool({
          description: "Run a small code snippet in a sandboxed JS environment.",
          parameters: zodSchema(
            z.object({
              code: z.string().describe("JavaScript code to evaluate"),
            })
          ),
          execute: async ({ code }) => {
            opts.onProgress?.({
              type: "tool-call",
              message: `Running snippet`,
              toolName: "runSnippet",
            });
            try {
              // eslint-disable-next-line no-new-func
              const result = new Function(`"use strict"; ${code}`)();
              opts.onProgress?.({
                type: "tool-result",
                message: `Snippet ran successfully`,
                toolName: "runSnippet",
              });
              return { output: String(result) };
            } catch (err) {
              opts.onProgress?.({
                type: "tool-result",
                message: `Snippet error`,
                toolName: "runSnippet",
              });
              return { error: String(err) };
            }
          },
        }),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const output = result.text || "No code output produced.";
    opts.onProgress?.({ type: "done", message: "Coding complete" });

    // Extract code blocks for artifacts
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const artifacts: Array<{ name: string; content: string; type: "code" | "doc" | "data" }> = [];
    let match;
    let i = 0;
    while ((match = codeBlockRegex.exec(output)) !== null) {
      artifacts.push({
        name: `code-${i++}`,
        content: match[2].trim(),
        type: "code",
      });
    }

    return {
      agent: "coder",
      task: opts.task,
      output,
      artifacts,
      durationMs: Date.now() - start,
      success: true,
    };
  } catch (err) {
    return {
      agent: "coder",
      task: opts.task,
      output: "",
      success: false,
      error: String(err),
      durationMs: Date.now() - start,
    };
  }
}
