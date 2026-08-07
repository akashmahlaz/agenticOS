// /chat/[id] — URL-based chat route
// Per AI SDK official docs (https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence):
//   1. User navigates to /chat/[id]
//   2. Server component loads messages from DB
//   3. Passes them to client useChat as `initialMessages`
//
// This gives us:
//   - Shareable URLs (e.g. /chat/abc123)
//   - Page refresh keeps the same chat
//   - Browser back/forward works naturally
//   - Server-side rendering of the chat shell

import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";
import { headers } from "next/headers";
import ChatView from "./chat-view";
import { dbMessageToUi, type DbMessage } from "@/lib/load-messages";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Build a Request-like object so we can reuse getUserIdFromRequest
  // which already handles both auth-token header and cookie
  const hdrs = await headers();
  const cookieHeader = hdrs.get("cookie") ?? "";
  const authHeader = hdrs.get("authorization") ?? "";
  const req = new Request(`http://internal/chat/${id}`, {
    headers: { cookie: cookieHeader, authorization: authHeader },
  });
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    // Not authenticated — redirect to login
    redirect(`/login?next=/chat/${id}`);
  }

  // Verify session exists and belongs to user
  const session = await db.session.findFirst({
    where: { id, userId },
  });
  if (!session) {
    notFound();
  }

  // Load messages from DB
  const dbMessages: DbMessage[] = await db.message.findMany({
    where: { sessionId: id },
    orderBy: { createdAt: "asc" },
  });

  // Convert to UIMessage[]
  const initialMessages = dbMessages.map(dbMessageToUi);

  // Pass to client component
  return (
    <ChatView
      sessionId={id}
      initialMessages={initialMessages}
      sessionTitle={session.title}
      isShared={!!session.isShared}
    />
  );
}
