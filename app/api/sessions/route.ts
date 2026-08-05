// Sessions API — agenticOS

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

// GET /api/sessions — list all sessions for the user (excludes temporary + non-shared)
export async function GET() {
  try {
    const sessions = await db.session.findMany({
      where: { isTemporary: false },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        model: true,
        isTemporary: true,
        isShared: true,
        shareToken: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });
    return NextResponse.json(sessions);
  } catch (err) {
    console.error("[sessions] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

// POST /api/sessions — create a new session
export async function POST(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, model, isTemporary } = await req.json();

    const session = await db.session.create({
      data: {
        title: title || "New Chat",
        model: model || "MiniMax-M2",
        isTemporary: !!isTemporary,
        userId,
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    console.error("[sessions] POST error:", err);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
