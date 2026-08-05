// Public shared chat view — read-only

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, ShareIcon, BoxIcon } from "lucide-react";

interface PageProps {
  params: Promise<{ token: string }>;
}

export const dynamic = "force-dynamic";

export default async function SharedChatPage({ params }: PageProps) {
  const { token } = await params;
  const session = await db.session.findFirst({
    where: { shareToken: token, isShared: true },
    include: {
      user: { select: { name: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
        },
      },
    },
  });

  if (!session) {
    notFound();
  }

  const userName = session.user?.name?.split(" ")[0] || "Someone";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="border-b border-border bg-background/95 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-3 md:px-5 h-12 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeftIcon size={14} />
            <span>agenticOS</span>
          </Link>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-teal/10 border border-teal/20 text-[10px] text-teal">
            <ShareIcon size={11} />
            <span>Shared chat</span>
          </div>
        </div>
      </header>

      {/* Header */}
      <div className="max-w-3xl mx-auto px-3 md:px-5 py-8">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight font-space-grotesk">
          {session.title}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Shared by {userName} · {new Date(session.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Messages */}
      <div className="max-w-3xl mx-auto px-3 md:px-5 pb-16 space-y-6">
        {session.messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <BoxIcon size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No messages in this chat yet</p>
          </div>
        ) : (
          session.messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 px-1">
                {m.role === "user" ? userName : "agenticOS"}
              </div>
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap max-w-[85%] ${
                  m.role === "user"
                    ? "bg-teal/10 border border-teal/20"
                    : "bg-card border border-border"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <BoxIcon size={12} />
          Try agenticOS
        </Link>
      </footer>
    </div>
  );
}
