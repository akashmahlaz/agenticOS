// BrandHeader — top of sidebar
// Shows: Gemini-style sparkle logo + "agenticOS" + current model + close (mobile)
// Matches the chat page background (bg-background)

"use client";

import { useEffect, useState } from "react";
import { CloseIcon, SparkleIcon } from "./icons";
import { getStoredModel, getModel } from "@/lib/models";

export interface BrandHeaderProps {
  onClose?: () => void;
}

export default function BrandHeader({ onClose }: BrandHeaderProps) {
  // Read current model from localStorage (single source of truth)
  const [modelName, setModelName] = useState<string>("MiniMax M3");

  useEffect(() => {
    const id = getStoredModel();
    setModelName(getModel(id).name);
    // Re-read when model changes (storage event from other tab)
    const handler = () => setModelName(getModel(getStoredModel()).name);
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return (
    <div className="flex items-center justify-between px-3 h-14 flex-shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Logo — same Gemini sparkle as chat empty state */}
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-teal">
            <SparkleIcon size={18} />
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold font-heading tracking-tight text-foreground truncate">
            agenticOS
          </div>
          <div className="text-[10px] text-muted-foreground truncate font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-teal inline-block" />
            {modelName} ready
          </div>
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="md:hidden p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          aria-label="Close sidebar"
        >
          <CloseIcon size={16} />
        </button>
      )}
    </div>
  );
}
