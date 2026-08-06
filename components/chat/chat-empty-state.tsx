// ChatEmptyState — welcome screen with greeting + suggestion chips

"use client";

import { BookOpenIcon, CodeIcon, SearchIcon, SparklesIcon } from "lucide-react";

const SUGGESTIONS = [
  { icon: SearchIcon, title: "Research", description: "Look up the latest on any topic", prompt: "Research the latest developments in AI agents" },
  { icon: CodeIcon, title: "Code", description: "Write, debug, or refactor code", prompt: "Write a TypeScript function that flattens a nested array" },
  { icon: BookOpenIcon, title: "Learn", description: "Explain a concept or skill", prompt: "Explain how vector embeddings work for semantic search" },
  { icon: SparklesIcon, title: "Create", description: "Brainstorm, draft, or design", prompt: "Help me draft a PRD for a new feature" },
];

export interface ChatEmptyStateProps {
  isTempMode: boolean;
  userName?: string;
  onSuggestion: (prompt: string) => void;
}

export default function ChatEmptyState(props: ChatEmptyStateProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-4 pb-32">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal/20 to-coral/20 flex items-center justify-center mb-3">
        <SparklesIcon size={22} className="text-teal" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-1">
        {props.isTempMode ? "Temporary chat" : `Hi ${props.userName || "there"}`}
      </h2>
      <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
        {props.isTempMode
          ? "This conversation won't be saved. Start typing to begin."
          : "What can I help you build today?"}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.title}
            onClick={() => props.onSuggestion(s.prompt)}
            className="flex items-start gap-3 p-3 rounded-xl border border-border bg-background hover:bg-muted/50 hover:border-foreground/20 transition-all text-left"
          >
            <s.icon size={18} className="text-teal mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground">{s.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
