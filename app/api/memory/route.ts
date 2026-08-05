// GET /api/memory — list all memory (files + entries + daily notes) for the current user

import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { initDefaultMemory } from "@/lib/memory/manager";

export async function GET(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Initialize default files on first access
  try {
    await initDefaultMemory(userId);
  } catch (err) {
    console.error("[memory] init failed:", err);
  }

  const [files, entries, dailyNotes] = await Promise.all([
    db.memoryFile.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    }),
    db.memoryEntry.findMany({
      where: { userId },
      orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
    db.memoryDaily.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 30,
    }),
  ]);

  return NextResponse.json({ files, entries, dailyNotes });
}
