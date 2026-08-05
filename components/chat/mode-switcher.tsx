"use client";

import { usePathname, useRouter } from "next/navigation";
import { MessageSquareIcon, MicIcon, CodeIcon, WorkflowIcon, FileTextIcon, DatabaseIcon, BookOpenIcon } from "lucide-react";

const MODES = [
  { id: "chat", label: "Chat", icon: MessageSquareIcon, path: "/" },
  { id: "voice", label: "Voice", icon: MicIcon, path: "/voice" },
  { id: "code", label: "Code", icon: CodeIcon, path: "/code" },
  { id: "workflow", label: "Workflow", icon: WorkflowIcon, path: "/workflow" },
  { id: "artifacts", label: "Artifacts", icon: FileTextIcon, path: "/artifacts" },
  { id: "knowledge", label: "Knowledge", icon: BookOpenIcon, path: "/knowledge" },
  { id: "memory", label: "Memory", icon: DatabaseIcon, path: "/memory" },
];

export default function ModeSwitcher() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-1 px-2 py-2">
      {MODES.map((mode) => {
        const Icon = mode.icon;
        const active = mode.path === pathname;
        return (
          <button
            key={mode.id}
            onClick={() => router.push(mode.path)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              active
                ? "bg-primary/15 text-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Icon size={15} className={active ? "text-primary" : ""} />
            <span>{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
