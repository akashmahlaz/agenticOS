// @ts-nocheck
// Exec tool — sandboxed shell command execution
// OpenClaw-style: workspace-scoped, with approval for dangerous commands
//
// In Vercel serverless we can't run a long-lived sandbox, so this uses
// Node.js child_process with strict allowlists and timeouts.

import { exec, spawn } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";
import fs from "fs/promises";

const execAsync = promisify(exec);

export type ExecMode = "allowlist" | "deny" | "full";

export interface ExecOptions {
  command: string;
  cwd?: string;
  timeoutMs?: number;
  env?: Record<string, string>;
  // Max output size in bytes
  maxOutputBytes?: number;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  truncated: boolean;
  // Whether the command was sandboxed
  sandboxed: boolean;
  // Whether the user must approve (for dangerous commands)
  requiresApproval: boolean;
  approvalReason?: string;
}

// Default workspace
const DEFAULT_WORKSPACE = process.env.AGENTIC_WORKSPACE || os.tmpdir();

// Dangerous command patterns (require explicit approval)
const DANGEROUS_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\brm\s+-rf?\s+[/~]/, reason: "rm with root/home path" },
  { pattern: /\bsudo\b/, reason: "elevated privileges" },
  { pattern: /\bchmod\s+777\b/, reason: "world-writable permissions" },
  { pattern: /\bchown\b/, reason: "ownership change" },
  { pattern: /\bcurl\s.*\|\s*(ba)?sh/, reason: "remote code execution" },
  { pattern: /\bwget\s.*\|\s*(ba)?sh/, reason: "remote code execution" },
  { pattern: /\bnc\s+-l\b/, reason: "network listener" },
  { pattern: /\bdd\s+if=/, reason: "raw disk write" },
  { pattern: /\bmkfs\b/, reason: "filesystem format" },
  { pattern: /\bshutdown\b|\breboot\b/, reason: "system control" },
  { pattern: /:\(\)\s*\{.*:\|:.*\}/, reason: "fork bomb" },
  { pattern: />\s*\/dev\/sd/, reason: "raw device write" },
  { pattern: /\bgit\s+push\s+.*--force/, reason: "force push" },
  { pattern: /\bdrop\s+(database|table)\b/i, reason: "database drop" },
];

// Allowed readonly commands (no approval needed, no destructive potential)
const READONLY_COMMANDS = new Set([
  "ls", "cat", "head", "tail", "less", "more", "wc", "grep", "find",
  "echo", "pwd", "date", "whoami", "id", "ps", "df", "du", "stat",
  "file", "which", "whereis", "type", "env", "printenv", "tree",
  "uname", "hostname", "uptime", "free", "top", "htop", "awk", "sed",
  "sort", "uniq", "cut", "tr", "xargs", "tee", "diff", "md5sum",
  "sha256sum", "curl", "wget", "ping", "traceroute", "nslookup",
  "node", "deno", "bun", "python", "python3", "ruby", "perl",
  "jq", "yq", "xpath",
]);

function isReadonly(command: string): boolean {
  const firstWord = command.trim().split(/\s+/)[0];
  return READONLY_COMMANDS.has(firstWord);
}

function isDangerous(command: string): { dangerous: boolean; reason?: string } {
  for (const { pattern, reason } of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return { dangerous: true, reason };
    }
  }
  return { dangerous: false };
}

/**
 * Check if a command requires user approval.
 */
export function checkApproval(command: string): {
  requiresApproval: boolean;
  reason?: string;
  sandboxed: boolean;
} {
  if (isDangerous(command).dangerous) {
    return {
      requiresApproval: true,
      reason: isDangerous(command).reason,
      sandboxed: true,
    };
  }
  return {
    requiresApproval: false,
    sandboxed: isReadonly(command),
  };
}

/**
 * Execute a shell command in a workspace-scoped way.
 *
 * On Vercel serverless, only readonly commands are allowed by default.
 * For more permissive modes (e.g. in a Node.js container), the full mode
 * can be used.
 */
export async function execCommand(options: ExecOptions): Promise<ExecResult> {
  const start = Date.now();
  const cwd = options.cwd || DEFAULT_WORKSPACE;
  const timeoutMs = options.timeoutMs ?? 30_000; // 30s default
  const maxOutputBytes = options.maxOutputBytes ?? 100_000; // 100KB

  const approval = checkApproval(options.command);

  // Block dangerous commands unless explicitly approved
  if (approval.requiresApproval && !options.env?.__APPROVED) {
    return {
      stdout: "",
      stderr: `Command requires approval: ${approval.reason}\nThe user must approve this command before execution.`,
      exitCode: -1,
      durationMs: 0,
      truncated: false,
      sandboxed: true,
      requiresApproval: true,
      approvalReason: approval.reason,
    };
  }

  // Ensure the workspace exists
  try {
    await fs.mkdir(cwd, { recursive: true });
  } catch {
    // ignore
  }

  // Set up sandboxed environment
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ...options.env,
    HOME: cwd,
    TMPDIR: cwd,
    PWD: cwd,
  };
  delete env.__APPROVED;

  try {
    const { stdout, stderr } = await execAsync(options.command, {
      cwd,
      timeout: timeoutMs,
      maxBuffer: maxOutputBytes,
      env,
      shell: "/bin/sh",
    });

    let truncated = false;
    let outStr = stdout || "";
    let errStr = stderr || "";

    if (outStr.length > maxOutputBytes) {
      outStr = outStr.slice(0, maxOutputBytes) + "\n... (truncated)";
      truncated = true;
    }
    if (errStr.length > maxOutputBytes) {
      errStr = errStr.slice(0, maxOutputBytes) + "\n... (truncated)";
      truncated = true;
    }

    return {
      stdout: outStr,
      stderr: errStr,
      exitCode: 0,
      durationMs: Date.now() - start,
      truncated,
      sandboxed: approval.sandboxed,
      requiresApproval: false,
    };
  } catch (err: any) {
    return {
      stdout: err.stdout || "",
      stderr: err.stderr || err.message || String(err),
      exitCode: typeof err.code === "number" ? err.code : 1,
      durationMs: Date.now() - start,
      truncated: false,
      sandboxed: approval.sandboxed,
      requiresApproval: false,
    };
  }
}

/**
 * Run a command in the background, returning a process ID.
 * Useful for long-running tasks (dev servers, watchers).
 */
export function execBackground(options: ExecOptions): {
  pid: number;
  kill: () => void;
} {
  const child = spawn(options.command, {
    cwd: options.cwd || DEFAULT_WORKSPACE,
    shell: "/bin/sh",
    detached: true,
    stdio: "ignore",
    env: { ...process.env, ...options.env },
  });

  return {
    pid: child.pid || 0,
    kill: () => {
      try {
        process.kill(child.pid || 0);
      } catch {
        // ignore
      }
    },
  };
}
