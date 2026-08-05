// @ts-nocheck
// PUT /api/memory/file — update a memory file's content
// Body: { path: string, content: string }

import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth";
import { writeMemoryFile } from "@/lib/memory/manager";

export async function PUT(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { path, content } = body;

  if (!path || typeof content !== "string") {
    return NextResponse.json({ error: "Missing path or content" }, { status: 400 });
  }

  // Validate path is one of the known memory file types
  const allowed = ["USER.md", "MEMORY.md", "IDENTITY.md", "SOUL.md"];
  if (!allowed.includes(path)) {
    return NextResponse.json(
      { error: `Path must be one of: ${allowed.join(", ")}` },
      { status: 400 }
    );
  }

  if (content.length > 100_000) {
    return NextResponse.json({ error: "Content too long (max 100KB)" }, { status: 400 });
  }

  try {
    const file = await writeMemoryFile(userId, path, content, undefined, "user");
    return NextResponse.json({ file });
  } catch (err) {
    console.error("[memory/file] PUT failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
