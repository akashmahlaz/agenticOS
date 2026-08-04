// @ts-nocheck
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/(app)/layout";
import AuthGate from "@/components/auth-gate";
import Sidebar from "@/components/chat/sidebar";

import {
  Canvas,
  CanvasNode,
  CanvasEdge,
  CanvasControls,
  CanvasPanel,
  CanvasToolbar,
} from "@/components/ai-elements/canvas";
import { Node, NodeHeader, NodeTitle, NodeDescription, NodeContent, NodeFooter, NodeActions } from "@/components/ai-elements/node";
import { Edge } from "@/components/ai-elements/edge";
import { Connection } from "@/components/ai-elements/connection";
import { Controls } from "@/components/ai-elements/controls";
import { Panel } from "@/components/ai-elements/panel";
import { Toolbar } from "@/components/ai-elements/toolbar";

import { MenuIcon, WorkflowIcon, PlayIcon, SaveIcon, PlusIcon, ZapIcon, DatabaseIcon, BrainIcon, MessageSquareIcon, FileOutputIcon, GitBranchIcon } from "lucide-react";

const NODES = [
  { id: "input", title: "User Input", description: "Query from user", icon: MessageSquareIcon, color: "text-primary", x: 0, y: 100 },
  { id: "brain", title: "Reasoning", description: "MiniMax M2 thinking", icon: BrainIcon, color: "text-teal", x: 220, y: 60 },
  { id: "search", title: "Web Search", description: "Search the web", icon: ZapIcon, color: "text-coral", x: 220, y: 180 },
  { id: "db", title: "Memory", description: "Read from DB", icon: DatabaseIcon, color: "text-success", x: 440, y: 30 },
  { id: "tool", title: "Tool Use", description: "Execute tools", icon: GitBranchIcon, color: "text-coral", x: 440, y: 200 },
  { id: "output", title: "Response", description: "Send to user", icon: FileOutputIcon, color: "text-primary", x: 660, y: 120 },
];

const EDGES = [
  { from: "input", to: "brain" },
  { from: "input", to: "search" },
  { from: "brain", to: "db" },
  { from: "brain", to: "tool" },
  { from: "db", to: "output" },
  { from: "tool", to: "output" },
  { from: "search", to: "output" },
];

export default function WorkflowPage() {
  return (
    <AuthGate>
      <WorkflowPageContent />
    </AuthGate>
  );
}

function WorkflowPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [activeNode, setActiveNode] = useState<string | null>(null);

  const handleRun = () => {
    setRunning(true);
    let i = 0;
    const interval = setInterval(() => {
      if (i >= NODES.length) {
        clearInterval(interval);
        setRunning(false);
        setActiveNode(null);
        return;
      }
      setActiveNode(NODES[i].id);
      i++;
    }, 800);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar
          activeSessionId={null}
          onSelectSession={() => router.push("/")}
          onNewChat={() => router.push("/")}
          refreshKey={0}
        />
      </div>

      {drawerOpen && (
        <div onClick={() => setDrawerOpen(false)} className="md:hidden fixed inset-0 bg-black/40 z-40 animate-fade-in" />
      )}
      <div className={`md:hidden fixed top-0 left-0 bottom-0 z-50 transform transition-transform duration-300 ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <Sidebar
          activeSessionId={null}
          onSelectSession={() => { setDrawerOpen(false); router.push("/"); }}
          onNewChat={() => { setDrawerOpen(false); router.push("/"); }}
          onClose={() => setDrawerOpen(false)}
          refreshKey={0}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-2 px-3 md:px-5 h-12 border-b border-border flex-shrink-0 bg-background/95 backdrop-blur-md z-20">
          <button
            onClick={() => setDrawerOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-secondary text-foreground"
            aria-label="Open menu"
          >
            <MenuIcon size={18} />
          </button>
          <div className="flex items-center gap-2">
            <WorkflowIcon size={16} className="text-success" />
            <h1 className="text-sm font-semibold font-heading">Agent Workflow</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleRun}
              disabled={running}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <PlayIcon size={12} />
              {running ? "Running…" : "Run"}
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/70 transition-colors">
              <SaveIcon size={12} />
              Save
            </button>
          </div>
        </header>

        <div className="flex-1 relative overflow-auto bg-secondary/20">
          <Canvas className="w-full h-full p-6">
            {/* Connection lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {EDGES.map((edge, i) => {
                const from = NODES.find((n) => n.id === edge.from);
                const to = NODES.find((n) => n.id === edge.to);
                if (!from || !to) return null;
                const x1 = from.x + 140;
                const y1 = from.y + 40;
                const x2 = to.x;
                const y2 = to.y + 40;
                const active = activeNode === from.id || activeNode === to.id;
                return (
                  <g key={i}>
                    <path
                      d={`M ${x1} ${y1} C ${x1 + 80} ${y1}, ${x2 - 80} ${y2}, ${x2} ${y2}`}
                      stroke={active ? "var(--teal)" : "var(--border)"}
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray={active ? "0" : "4 4"}
                    />
                    <circle cx={x1} cy={y1} r="3" fill="var(--teal)" />
                    <circle cx={x2} cy={y2} r="3" fill="var(--teal)" />
                  </g>
                );
              })}
            </svg>

            {/* Nodes */}
            {NODES.map((node) => {
              const Icon = node.icon;
              const isActive = activeNode === node.id;
              return (
                <div
                  key={node.id}
                  style={{ left: node.x, top: node.y }}
                  className={`absolute w-[180px] rounded-2xl border bg-card p-3 transition-all ${
                    isActive
                      ? "border-teal shadow-lg shadow-teal/30 scale-105"
                      : "border-border shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-secondary ${node.color}`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate">{node.title}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{node.description}</div>
                    </div>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
                    )}
                  </div>
                </div>
              );
            })}
          </Canvas>

          {/* Toolbar */}
          <div className="absolute top-4 left-4 z-10">
            <Panel className="bg-card border border-border rounded-2xl shadow-sm p-2 flex flex-col gap-1">
              <button
                onClick={handleRun}
                disabled={running}
                className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50"
                title="Run workflow"
              >
                <PlayIcon size={14} />
              </button>
              <button className="w-9 h-9 rounded-lg bg-secondary text-foreground flex items-center justify-center hover:bg-secondary/70" title="Add node">
                <PlusIcon size={14} />
              </button>
            </Panel>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 z-10 bg-card border border-border rounded-2xl shadow-sm p-3 max-w-[220px]">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Pipeline
            </div>
            <div className="space-y-1 text-[11px] text-foreground">
              {NODES.map((n) => {
                const Icon = n.icon;
                return (
                  <div key={n.id} className="flex items-center gap-1.5">
                    <Icon size={10} className={n.color} />
                    <span>{n.title}</span>
                    {activeNode === n.id && <span className="text-[8px] text-teal">●</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status */}
          {running && (
            <div className="absolute top-4 right-4 z-10 bg-card border border-border rounded-2xl shadow-sm p-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
                <span>Executing pipeline…</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
