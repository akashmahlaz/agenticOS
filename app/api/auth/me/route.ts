// GET /api/auth/me — Get current user

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    if (!user) {
      return NextResponse.json({ user: null }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (err) {
    console.error("[me] Error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
