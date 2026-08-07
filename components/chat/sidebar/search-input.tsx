// SearchInput — Gemini-style "Search for chats"
// Rounded input with search icon, clear button when text present

"use client";

import { useState } from "react";
import { CloseIcon, SearchIcon } from "./icons";

export interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function SearchInput({
  value,
  onChange,
  placeholder = "Search chats",
}: SearchInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="px-3 pb-2 flex-shrink-0">
      <div
        className={`relative flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-colors ${
          focused
            ? "border-foreground/30 bg-foreground/5"
            : "border-foreground/10 bg-foreground/[0.02]"
        }`}
      >
        <SearchIcon
          size={13}
          className={focused ? "text-foreground" : "text-muted-foreground"}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-0 outline-none text-[13px] text-foreground placeholder:text-muted-foreground/70 min-w-0"
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className="text-muted-foreground hover:text-foreground p-0.5"
            aria-label="Clear search"
          >
            <CloseIcon size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
