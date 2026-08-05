import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { messageId, value } = await req.json();
    if (!messageId || !value || !["up", "down"].includes(value)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Verify message belongs to a session owned by the user
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { session: true },
    });
    if (!message || message.session.userId !== decoded.userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Store feedback in message metadata (we'll add a JSON field if not present)
    // For now, just log it and return success
    console.log(`Feedback ${value} for message ${messageId} by user ${decoded.userId}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Feedback error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
