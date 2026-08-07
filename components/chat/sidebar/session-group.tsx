// SessionGroup — date group label (Today, Yesterday, Last 7 days, etc.)
// Bold uppercase label + thin divider line

"use client";

import * as React from "react";

export interface SessionGroupProps {
  label: string;
  count?: number;
  children: React.ReactNode;
}

export default function SessionGroup({ label, count, children }: SessionGroupProps) {
  return (
    <div>
      <div className="flex items-center gap-2 px-3 pt-3 pb-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold">
          {label}
        </span>
        {typeof count === "number" && (
          <span className="text-[10px] text-muted-foreground/50 font-mono tabular-nums">
            {count}
          </span>
        )}
        <div className="flex-1 h-px bg-foreground/5" />
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
