// SettingsMenu — slide-in panel (Gemini-style "Settings & Help" consolidated)
// Theme switcher (light / dark / system) + app info

"use client";

import { useTheme } from "@/components/theme-provider";
import { CheckIcon, SunIcon, MoonIcon, SystemIcon, ChevronRightIcon } from "./icons";

export interface SettingsMenuProps {
  onClose: () => void;
}

export default function SettingsMenu({ onClose }: SettingsMenuProps) {
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { value: "light" as const, label: "Light", icon: <SunIcon size={14} /> },
    { value: "dark" as const, label: "Dark", icon: <MoonIcon size={14} /> },
    { value: "system" as const, label: "System", icon: <SystemIcon size={14} /> },
  ];

  return (
    <div className="absolute inset-0 bg-background z-10 flex flex-col animate-slide-in-left">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-foreground/5 flex-shrink-0">
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground"
          aria-label="Back"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 4L6 8L10 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <h2 className="text-sm font-semibold font-heading">Settings</h2>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Appearance */}
        <div>
          <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
            Appearance
          </h3>
          <div className="space-y-1.5">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                  theme === opt.value
                    ? "bg-teal/10 border-teal/30"
                    : "bg-foreground/[0.02] border-foreground/10 hover:bg-foreground/5"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    theme === opt.value
                      ? "bg-teal text-white"
                      : "bg-foreground/5 text-muted-foreground"
                  }`}
                >
                  {opt.icon}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">
                    {opt.label}
                    {opt.value === "system" && (
                      <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">
                        (default)
                      </span>
                    )}
                  </div>
                </div>
                {theme === opt.value && (
                  <div className="w-5 h-5 rounded-full bg-teal flex items-center justify-center">
                    <CheckIcon size={11} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* About */}
        <div>
          <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
            About
          </h3>
          <div className="bg-foreground/[0.02] rounded-xl p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="text-foreground font-mono">v1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Framework</span>
              <span className="text-foreground">Next.js 16</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">UI</span>
              <span className="text-foreground">Vercel AI Elements</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
