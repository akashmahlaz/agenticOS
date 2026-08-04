// Sessions API — agenticOS
// Create, list, and manage chat sessions

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/sessions — list all sessions
export async function GET() {
  try {
    const sessions = await db.session.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
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
    const { title, model } = await req.json();

    // Get or create a default user
    let user = await db.user.findFirst();
    if (!user) {
      user = await db.user.create({
        data: { email: "default@agentic.os" },
      });
    }

    const session = await db.session.create({
      data: {
        title: title || "New Chat",
        model: model || "MiniMax-M2",
        userId: user.id,
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    console.error("[sessions] POST error:", err);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
