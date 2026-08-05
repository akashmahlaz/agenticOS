// Session by ID — GET, PATCH, DELETE

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";
import { randomBytes } from "crypto";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/sessions/[id] — get session with messages
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const session = await db.session.findFirst({
      where: { id, userId },
      include: {
        messages: { orderBy: { createdAt: "asc" }, select: {
          id: true, role: true, content: true, reasoningSteps: true,
          toolCalls: true, citations: true, model: true, agent: true, createdAt: true,
        }},
      },
    });

    if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(session);
  } catch (err) {
    console.error("[session] GET error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// PATCH /api/sessions/[id] — update title, share, etc.
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const session = await db.session.findFirst({ where: { id, userId } });
    if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updateData: Record<string, unknown> = {};
    if (typeof body.title === "string") updateData.title = body.title;
    if (typeof body.model === "string") updateData.model = body.model;
    if (typeof body.isShared === "boolean") {
      updateData.isShared = body.isShared;
      if (body.isShared && !session.shareToken) {
        // Generate a unique share token
        updateData.shareToken = randomBytes(8).toString("hex");
      }
      if (!body.isShared) {
        updateData.shareToken = null;
      }
    }

    const updated = await db.session.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[session] PATCH error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE /api/sessions/[id]
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const session = await db.session.findFirst({ where: { id, userId } });
    if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.session.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[session] DELETE error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
