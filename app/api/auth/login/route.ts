// POST /api/auth/login

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = signToken({ userId: user.id, email: user.email });

    const res = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
    // Mirror token to cookie so server-rendered pages (e.g. /c/[id]) can
    // authenticate the user. Path=/, 7d expiry matches the JWT expiry.
    res.cookies.set("auth-token", token, {
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      sameSite: "lax",
      // HttpOnly is false so the client can read it for Authorization
      // headers. The token is already short-lived (7d) JWT.
      httpOnly: false,
    });
    return res;
  } catch (err) {
    console.error("[login] Error:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
