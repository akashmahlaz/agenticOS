// JWT auth utilities for agenticOS

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "agentic-os-secret-change-in-production";

export interface JWTPayload {
  userId: string;
  email: string;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function getUserIdFromRequest(request: Request): string | null {
  // 1. Try Authorization header (used by client fetch with Bearer token)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload?.userId) return payload.userId;
  }
  // 2. Try cookie (used by client SSR + automatic browser cookie)
  const cookieHeader = request.headers.get("cookie") ?? "";
  if (cookieHeader) {
    const match = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("auth-token="));
    if (match) {
      const token = decodeURIComponent(match.slice("auth-token=".length));
      const payload = verifyToken(token);
      if (payload?.userId) return payload.userId;
    }
  }
  return null;
}
