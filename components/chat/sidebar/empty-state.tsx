// EmptyState — for "no chats" or "no matches"
// Centered icon + title + subtitle

"use client";

import * as React from "react";

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-10">
      <div className="w-10 h-10 rounded-full bg-foreground/[0.04] flex items-center justify-center mb-2">
        {icon}
      </div>
      <p className="text-xs font-medium text-foreground/80">{title}</p>
      {subtitle && (
        <p className="text-[11px] text-muted-foreground/70 mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}
