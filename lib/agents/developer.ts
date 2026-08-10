// Developer sub-agent — works on code via GitHub
// Uses the user's stored GITHUB_TOKEN secret.
// Can list repos, read files, search code, create issues, etc.

import { generateText, tool, zodSchema, stepCountIs } from "ai";
import { z } from "zod";
import { createMinimax } from "vercel-minimax-ai-provider";
import { createGitHub } from "@/lib/integrations/github";
import { resolveKeyWithSource } from "@/lib/integrations/keys";
import type { SubAgentCallOptions, SubAgentResult } from "./types";

const minimax = (apiKey: string) => createMinimax({ apiKey });

const DEVELOPER_SYSTEM = `You are the Developer sub-agent inside agenticOS.

Your ONLY job is to do code work via GitHub. You are NOT the main agent. You receive a code task (e.g. "find the auth code in repo X", "create an issue in repo Y for this bug"), execute it, and return a clear summary.

Available tools (all use the user's stored GITHUB_TOKEN secret):
- **fetchApiKey()** — load the GitHub token from secrets
- **listRepos()** — list the user's repos
- **getRepo(owner, repo)** — get details on a specific repo
- **listFiles(owner, repo, path?)** — list files in a repo (recursive dirs)
- **getFile(owner, repo, path)** — read a single file's content
- **searchCode(query)** — search across the user's repos
- **listIssues(owner, repo, state?)** — list open/closed issues
- **createIssue(owner, repo, title, body)** — create a new issue
- **searchUsers(query)** — find GitHub users

Workflow:
1. **Fetch the API key** with \`fetchApiKey\`. If not found, tell the user to add GITHUB_TOKEN via /secrets.
2. **Explore the codebase** as needed (listFiles, getFile, searchCode).
3. **Complete the task** — read code, summarize it, find bugs, create issues/PRs as requested.
4. **Format the result** clearly.

Output rules:
- Be specific. Include file paths, line numbers, and code snippets when relevant.
- When creating an issue, write a clear title and a well-structured body.
- For "find X in repo Y" — show the exact file and code, not just a description.
- If you can't find something, say so explicitly and suggest where to look.
- Never modify code directly without explicit user request (create issues for changes instead).

Return ONLY your result. Do not include meta-commentary.`;

export async function runDeveloper(
  opts: SubAgentCallOptions & { userId?: string }
): Promise<SubAgentResult> {
  const start = Date.now();
  const apiKey = process.env.MINIMAX_API_KEY;
  const userId = opts.userId || (opts as any).context?.userId;

  if (!apiKey) {
    return { agent: "developer", task: opts.task, output: "", success: false, error: "MINIMAX_API_KEY not configured", durationMs: 0 };
  }
  if (!userId) {
    return { agent: "developer", task: opts.task, output: "", success: false, error: "userId required", durationMs: 0 };
  }

  opts.onProgress?.({ type: "started", message: `Dev: ${opts.task}` });

  try {
    const result = await generateText({
      model: minimax(apiKey)(opts.model || "MiniMax-M2"),
      system: DEVELOPER_SYSTEM,
      prompt: opts.context
        ? `Task: ${opts.task}\n\nContext: ${opts.context}`
        : `Task: ${opts.task}`,
      stopWhen: stepCountIs(15), // Allow up to 15 tool-call steps
      tools: {
        fetchApiKey: tool({
          description: "Fetch the user's stored GITHUB_TOKEN secret.",
          inputSchema: zodSchema(z.object({})),
          execute: async () => {
            const key = await resolveKeyWithSource(userId, "GITHUB_TOKEN");
            if (!key) {
              return { found: false, message: "No GITHUB_TOKEN configured. Add it via /secrets (per-user) or as a Vercel env var (server-wide)." };
            }
            return { found: true, key: key.value, source: key.source };
          },
        }),

        listRepos: tool({
          description: "List the authenticated user's GitHub repositories.",
          inputSchema: zodSchema(z.object({})),
          execute: async () => {
            const key = await resolveKeyWithSource(userId, "GITHUB_TOKEN");
            if (!key) return { error: "No GITHUB_TOKEN configured" };
            const gh = createGitHub(key.value);
            try {
              return await gh.listRepos();
            } catch (err) {
              return { error: (err as Error).message };
            }
          },
        }),

        getRepo: tool({
          description: "Get details about a GitHub repository.",
          inputSchema: zodSchema(
            z.object({
              owner: z.string().describe("Repo owner (user or org)"),
              repo: z.string().describe("Repo name"),
            })
          ),
          execute: async ({ owner, repo }) => {
            const key = await resolveKeyWithSource(userId, "GITHUB_TOKEN");
            if (!key) return { error: "No GITHUB_TOKEN configured" };
            const gh = createGitHub(key.value);
            try {
              return await gh.getRepo(owner, repo);
            } catch (err) {
              return { error: (err as Error).message };
            }
          },
        }),

        listFiles: tool({
          description: "List files in a GitHub repository at a given path (use '' for root).",
          inputSchema: zodSchema(
            z.object({
              owner: z.string(),
              repo: z.string(),
              path: z.string().optional().describe("Directory path, or empty string for root"),
            })
          ),
          execute: async ({ owner, repo, path }) => {
            const key = await resolveKeyWithSource(userId, "GITHUB_TOKEN");
            if (!key) return { error: "No GITHUB_TOKEN configured" };
            const gh = createGitHub(key.value);
            try {
              return await gh.listFiles(owner, repo, path);
            } catch (err) {
              return { error: (err as Error).message };
            }
          },
        }),

        getFile: tool({
          description: "Read a file's content from a GitHub repository.",
          inputSchema: zodSchema(
            z.object({
              owner: z.string(),
              repo: z.string(),
              path: z.string().describe("File path within the repo"),
            })
          ),
          execute: async ({ owner, repo, path }) => {
            const key = await resolveKeyWithSource(userId, "GITHUB_TOKEN");
            if (!key) return { error: "No GITHUB_TOKEN configured" };
            const gh = createGitHub(key.value);
            try {
              const file = await gh.getFile(owner, repo, path);
              // Decode base64 content for easier reading
              if (file.encoding === "base64" && file.content) {
                return {
                  ...file,
                  content: Buffer.from(file.content, "base64").toString("utf-8"),
                };
              }
              return file;
            } catch (err) {
              return { error: (err as Error).message };
            }
          },
        }),

        searchCode: tool({
          description: "Search for code across the user's GitHub repos.",
          inputSchema: zodSchema(
            z.object({
              query: z.string().describe("Search query (supports GitHub code search syntax)"),
            })
          ),
          execute: async ({ query }) => {
            const key = await resolveKeyWithSource(userId, "GITHUB_TOKEN");
            if (!key) return { error: "No GITHUB_TOKEN configured" };
            const gh = createGitHub(key.value);
            try {
              return await gh.searchCode(query);
            } catch (err) {
              return { error: (err as Error).message };
            }
          },
        }),

        listIssues: tool({
          description: "List issues in a GitHub repository.",
          inputSchema: zodSchema(
            z.object({
              owner: z.string(),
              repo: z.string(),
              state: z.enum(["open", "closed", "all"]).optional(),
            })
          ),
          execute: async ({ owner, repo, state }) => {
            const key = await resolveKeyWithSource(userId, "GITHUB_TOKEN");
            if (!key) return { error: "No GITHUB_TOKEN configured" };
            const gh = createGitHub(key.value);
            try {
              return await gh.listIssues(owner, repo, state);
            } catch (err) {
              return { error: (err as Error).message };
            }
          },
        }),

        createIssue: tool({
          description: "Create a new issue in a GitHub repository.",
          inputSchema: zodSchema(
            z.object({
              owner: z.string(),
              repo: z.string(),
              title: z.string(),
              body: z.string(),
            })
          ),
          execute: async ({ owner, repo, title, body }) => {
            const key = await resolveKeyWithSource(userId, "GITHUB_TOKEN");
            if (!key) return { error: "No GITHUB_TOKEN configured" };
            const gh = createGitHub(key.value);
            try {
              return await gh.createIssue(owner, repo, title, body);
            } catch (err) {
              return { error: (err as Error).message };
            }
          },
        }),

        searchUsers: tool({
          description: "Search for GitHub users by name, login, or email.",
          inputSchema: zodSchema(
            z.object({ query: z.string() })
          ),
          execute: async ({ query }) => {
            const key = await resolveKeyWithSource(userId, "GITHUB_TOKEN");
            if (!key) return { error: "No GITHUB_TOKEN configured" };
            const gh = createGitHub(key.value);
            try {
              return await gh.searchUsers(query);
            } catch (err) {
              return { error: (err as Error).message };
            }
          },
        }),
      },
    });

    opts.onProgress?.({
      type: "done",
      message: "Code work complete",
      result: result.text,
    });

    return {
      agent: "developer",
      task: opts.task,
      output: result.text,
      success: true,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      agent: "developer",
      task: opts.task,
      output: "",
      success: false,
      error: (err as Error).message,
      durationMs: Date.now() - start,
    };
  }
}
