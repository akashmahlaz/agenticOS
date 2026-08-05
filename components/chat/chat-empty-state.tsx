// ChatEmptyState — welcome screen for new chats
// Animated conic gradient + greeting + 4 suggestion chips

"use client";

import { SparklesIcon, Code2Icon, SearchIcon, BookOpenIcon } from "lucide-react";

const SUGGESTIONS = [
  {
    icon: SearchIcon,
    title: "Research",
    description: "Look up the latest on any topic",
    prompt: "Research the latest developments in AI agents",
  },
  {
    icon: Code2Icon,
    title: "Code",
    description: "Write, debug, or refactor code",
    prompt: "Write a TypeScript function that flattens a nested array",
  },
  {
    icon: BookOpenIcon,
    title: "Learn",
    description: "Explain a concept or skill",
    prompt: "Explain how vector embeddings work for semantic search",
  },
  {
    icon: SparklesIcon,
    title: "Create",
    description: "Brainstorm, draft, or design",
    prompt: "Help me draft a product launch announcement",
  },
];

export interface ChatEmptyStateProps {
  userName?: string;
  onPick: (prompt: string) => void;
}

export default function ChatEmptyState({ userName, onPick }: ChatEmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 pb-12">
      {/* Conic gradient star */}
      <div className="relative mb-6">
        <div
          className="w-14 h-14 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, #14b8a6, #f97316, #14b8a6, #14b8a6)",
            animation: "spin 8s linear infinite",
          }}
        />
        <div className="absolute inset-1 rounded-full bg-background flex items-center justify-center">
          <SparklesIcon size={20} className="text-primary" />
        </div>
      </div>

      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
        {userName ? `Hi, ${userName}.` : "Hi there."}
      </h1>
      <p className="text-sm text-muted-foreground mt-1.5 mb-8 text-center max-w-md">
        What can I help you build, learn, or explore today?
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
        {SUGGESTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.title}
              onClick={() => onPick(s.prompt)}
              className="group flex items-start gap-3 p-3.5 rounded-xl border bg-card hover:bg-accent/50 text-left transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                <Icon size={16} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {s.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
