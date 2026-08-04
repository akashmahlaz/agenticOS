// Messages API — agenticOS
// Get and save messages for a session

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/messages?sessionId=xxx
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const messages = await db.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(messages);
  } catch (err) {
    console.error("[messages] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

// POST /api/messages — save a message
export async function POST(req: Request) {
  try {
    const { sessionId, role, content, reasoningSteps, toolCalls, citations, model } =
      await req.json();

    if (!sessionId || !role || !content) {
      return NextResponse.json(
        { error: "sessionId, role, content required" },
        { status: 400 }
      );
    }

    const message = await db.message.create({
      data: {
        sessionId,
        role,
        content,
        reasoningSteps: reasoningSteps ?? [],
        toolCalls: toolCalls ?? [],
        citations: citations ?? [],
        model,
      },
    });

    // Update session's updatedAt
    await db.session.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    console.error("[messages] POST error:", err);
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }
}
