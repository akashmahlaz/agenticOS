// Messages API — agenticOS

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

// GET /api/messages?sessionId=xxx
export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

    // Verify session belongs to user
    const session = await db.session.findFirst({ where: { id: sessionId, userId } });
    if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const messages = await db.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(messages);
  } catch (err) {
    console.error("[messages] GET error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST /api/messages — save a message
export async function POST(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sessionId, role, content, reasoningSteps, toolCalls, citations, model, agent } =
      await req.json();

    if (!sessionId || !role || !content) {
      return NextResponse.json(
        { error: "sessionId, role, content required" },
        { status: 400 }
      );
    }

    // Verify session belongs to user
    const session = await db.session.findFirst({ where: { id: sessionId, userId } });
    if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const message = await db.message.create({
      data: {
        sessionId,
        role,
        content,
        reasoningSteps: reasoningSteps ?? [],
        toolCalls: toolCalls ?? [],
        citations: citations ?? [],
        model,
        agent,
      },
    });

    // Update session's updatedAt and title if first message
    const msgCount = await db.message.count({ where: { sessionId } });
    const updateData: { updatedAt: Date; title?: string } = { updatedAt: new Date() };
    if (msgCount === 1 && role === "user") {
      updateData.title = content.slice(0, 50) + (content.length > 50 ? "…" : "");
    }
    await db.session.update({ where: { id: sessionId }, data: updateData });

    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    console.error("[messages] POST error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
