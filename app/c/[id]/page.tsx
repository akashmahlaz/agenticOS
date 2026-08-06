// Path-based chat route — /c/[id]
// Server component that loads the session from DB and passes initial
// messages to the client ChatView. This is the proper pattern: the
// streaming page already has data on first paint, no loading state.

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";
import ChatView from "@/components/chat/chat-view";
import AppShell from "@/components/chat/app-shell";
import type { AgentOSUIMessage } from "@/components/chat/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: PageProps) {
  const { id } = await params;
  const headerList = await headers();
  const cookieHeader = headerList.get("cookie") ?? "";

  const userId = await getUserIdFromCookie(cookieHeader);
  if (!userId) {
    // Auth gate — redirect to login
    redirect("/login");
  }

  // Load the session + its messages from DB
  const session = await db.session.findFirst({
    where: { id, userId, isTemporary: false },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!session) {
    // Session doesn't exist or doesn't belong to this user → home
    redirect("/");
  }

  // Convert DB messages to AgentOSUIMessage format
  const initialMessages: AgentOSUIMessage[] = session.messages.map(
    (m: { id: string; role: string; content: string }) => {
      const role: "user" | "assistant" | "system" =
        m.role === "assistant" || m.role === "system" ? m.role : "user";
      return {
        id: m.id,
        role,
        parts: [{ type: "text" as const, text: m.content }],
      };
    }
  );

  return (
    <AppShell activeSessionId={id} isTempMode={false}>
      <ChatView
        initialSessionId={id}
        initialMessages={initialMessages}
        initialModel={session.model}
        isTempMode={false}
        onMenuClick={() => {}}
        onStartTemp={() => {}}
        onExitTemp={() => {}}
      />
    </AppShell>
  );
}

/**
 * Get the user id from a cookie header (server-side, no Request object).
 * Mirrors the logic in lib/auth.ts getUserIdFromRequest.
 */
async function getUserIdFromCookie(cookieHeader: string): Promise<string | null> {
  // Parse the token from cookies
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, v] = c.trim().split("=");
      return [k, v];
    })
  );
  const token = cookies["auth-token"];
  if (!token) return null;

  // Verify the JWT
  try {
    const jwt = await import("jsonwebtoken");
    const secret = process.env.JWT_SECRET || "agentic-os-secret-change-in-production";
    const decoded = jwt.default.verify(token, secret) as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
}
