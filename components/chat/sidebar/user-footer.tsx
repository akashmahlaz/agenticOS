// UserFooter — bottom of sidebar
// Shows user avatar + name + email + a settings/logout menu trigger
// Matches chat page background

"use client";

import { useAuth } from "@/components/auth-wrapper";
import { SettingsIcon, LogoutIcon } from "./icons";

export interface UserFooterProps {
  onOpenSettings: () => void;
}

function getInitials(name?: string | null) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function UserFooter({ onOpenSettings }: UserFooterProps) {
  const { user, logout } = useAuth();
  const initials = getInitials(user?.name);
  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const email = user?.email || "";

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="px-2 py-2 flex-shrink-0 border-t border-foreground/5">
      <div className="group flex items-center gap-2.5 p-2 rounded-xl hover:bg-foreground/5 transition-colors">
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal via-primary to-coral flex items-center justify-center text-white text-[13px] font-semibold">
            {initials}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-background" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-foreground truncate">
            {displayName}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">{email}</div>
        </div>
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
          aria-label="Open settings"
          title="Settings"
        >
          <SettingsIcon size={15} />
        </button>
        <button
          onClick={handleLogout}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          aria-label="Log out"
          title="Log out"
        >
          <LogoutIcon size={15} />
        </button>
      </div>
    </div>
  );
}
