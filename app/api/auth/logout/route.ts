// POST /api/auth/logout — Clear the auth-token cookie
// Stateless: the server doesn't need to track sessions, just clear the cookie.

import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("auth-token", "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
  return res;
}
