// /api/exec — execute a shell command (with approval gate)
// POST: { command, cwd?, timeoutMs?, approved? }

import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth";
import { execCommand, checkApproval } from "@/lib/exec/sandbox";

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { command, cwd, timeoutMs, approved } = body;

  if (!command || typeof command !== "string") {
    return NextResponse.json({ error: "Command required" }, { status: 400 });
  }

  // Check approval first
  const approval = checkApproval(command);

  if (approval.requiresApproval && !approved) {
    return NextResponse.json(
      {
        requiresApproval: true,
        reason: approval.reason,
        sandboxed: approval.sandboxed,
      },
      { status: 200 } // Not an error — caller decides
    );
  }

  try {
    const result = await execCommand({
      command,
      cwd,
      timeoutMs,
      env: approved ? { __APPROVED: "1" } : undefined,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
