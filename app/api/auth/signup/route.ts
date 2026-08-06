// POST /api/auth/signup — Create account

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { initUserProfile } from "@/lib/personalization/manager";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check existing user
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        email,
        name: name || email.split("@")[0],
        password: hashedPassword,
      },
    });

    // Initialize personalization from day one (USER.md, SOUL.md, IDENTITY.md)
    try {
      await initUserProfile(user.id, {
        name: user.name || undefined,
      });
    } catch (err) {
      console.error("[signup] initUserProfile failed:", err);
    }

    const token = signToken({ userId: user.id, email: user.email });

    const res = NextResponse.json(
      {
        user: { id: user.id, email: user.email, name: user.name },
        token,
      },
      { status: 201 }
    );
    // Mirror token to cookie so server-rendered pages can auth.
    res.cookies.set("auth-token", token, {
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      sameSite: "lax",
      httpOnly: false,
    });
    return res;
  } catch (err) {
    console.error("[signup] Error:", err);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
