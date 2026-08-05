// SubAgentActivity — shows the sub-agent delegation activity
// Used inside ChatMessage, above the final response

"use client";

import {
  CodeIcon,
  DatabaseIcon,
  PenIcon,
  BarChart3Icon,
  CheckIcon,
  XIcon,
  SearchIcon,
  GlobeIcon,
  WrenchIcon,
  BookOpenIcon,
  CompassIcon,
  TerminalIcon,
} from "lucide-react";

export interface SubAgentEvent {
  agent: "researcher" | "coder" | "memory-keeper" | "writer" | "analyst" | "browser" | "knowledge" | "operator";
  task: string;
  status: "started" | "thinking" | "tool-call" | "tool-result" | "done" | "error";
  message: string;
  toolName?: string;
  result?: string;
  durationMs?: number;
  ts?: number;
}

const AGENT_META: Record<
  SubAgentEvent["agent"],
  { name: string; icon: React.ElementType; color: string; bg: string }
> = {
  researcher: { name: "Researcher", icon: SearchIcon, color: "text-teal", bg: "bg-teal/10 border-teal/20" },
  coder: { name: "Coder", icon: CodeIcon, color: "text-coral", bg: "bg-coral/10 border-coral/20" },
  "memory-keeper": { name: "Memory Keeper", icon: DatabaseIcon, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
  browser: { name: "Browser", icon: CompassIcon, color: "text-info", bg: "bg-info/10 border-info/20" },
  knowledge: { name: "Knowledge", icon: BookOpenIcon, color: "text-accent-foreground", bg: "bg-accent/20 border-accent/40" },
  operator: { name: "Operator", icon: TerminalIcon, color: "text-warning", bg: "bg-warning/10 border-warning/20" },
  writer: { name: "Writer", icon: PenIcon, color: "text-success", bg: "bg-success/10 border-success/20" },
  analyst: { name: "Analyst", icon: BarChart3Icon, color: "text-warning", bg: "bg-warning/10 border-warning/20" },
};

const TOOL_ICONS: Record<string, React.ElementType> = {
  webSearch: GlobeIcon,
  fetchUrl: GlobeIcon,
  deepResearch: SearchIcon,
  runSnippet: WrenchIcon,
  memorySearch: BookOpenIcon,
  memoryGet: BookOpenIcon,
  memoryWrite: BookOpenIcon,
  search_web: SearchIcon,
  browse_website: GlobeIcon,
  extract_links: GlobeIcon,
  add_document: BookOpenIcon,
  search_knowledge: SearchIcon,
  list_documents: BookOpenIcon,
  get_document: BookOpenIcon,
  delete_document: BookOpenIcon,
  run_command: TerminalIcon,
  check_command: TerminalIcon,
  secret_list: BookOpenIcon,
  secret_get: BookOpenIcon,
  secret_save: BookOpenIcon,
  secret_delete: BookOpenIcon,
};

export default function SubAgentActivity({
  events,
  isStreaming,
}: {
  events: SubAgentEvent[];
  isStreaming?: boolean;
}) {
  if (!events || events.length === 0) return null;

  // Group events by agent
  const grouped = events.reduce<Record<string, SubAgentEvent[]>>((acc, e) => {
    if (!acc[e.agent]) acc[e.agent] = [];
    acc[e.agent].push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-2 mb-3">
      {Object.entries(grouped).map(([agent, agentEvents]) => {
        const meta = AGENT_META[agent as SubAgentEvent["agent"]];
        if (!meta) return null;
        const lastEvent = agentEvents[agentEvents.length - 1];
        const isDone = lastEvent.status === "done";
        const isError = lastEvent.status === "error";
        const Icon = meta.icon;

        return (
          <details
            key={agent}
            className={`rounded-xl border ${meta.bg} overflow-hidden group`}
            open={!isDone && isStreaming}
          >
            <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer list-none select-none">
              <div className={`w-7 h-7 rounded-lg bg-background/60 flex items-center justify-center ${meta.color}`}>
                <Icon size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-semibold ${meta.color}`}>{meta.name}</span>
                  <span className="text-[10px] text-muted-foreground/70 truncate">
                    · {lastEvent.task}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {lastEvent.message}
                </div>
              </div>
              <div className="flex-shrink-0">
                {isError ? (
                  <XIcon size={13} className="text-destructive" />
                ) : isDone ? (
                  <CheckIcon size={13} className="text-success" />
                ) : (
                  <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                )}
              </div>
            </summary>

            <div className="px-3 pb-2.5 pt-1 space-y-1.5 border-t border-current/10 bg-background/30">
              {agentEvents.map((e, i) => {
                if (e.status === "started" || e.status === "done" || e.status === "error") return null;
                const ToolIcon = e.toolName ? TOOL_ICONS[e.toolName] || WrenchIcon : null;
                return (
                  <div key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <div className="w-1 h-1 rounded-full bg-current/50" />
                    {ToolIcon && <ToolIcon size={10} className="text-current/70" />}
                    <span className="truncate">{e.message}</span>
                  </div>
                );
              })}
              {lastEvent.durationMs !== undefined && (
                <div className="text-[10px] text-muted-foreground/60 mt-1">
                  {lastEvent.durationMs < 1000
                    ? `${lastEvent.durationMs}ms`
                    : `${(lastEvent.durationMs / 1000).toFixed(1)}s`}
                </div>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}
