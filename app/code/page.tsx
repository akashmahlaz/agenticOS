// @ts-nocheck
"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sandbox,
  SandboxHeader,
  SandboxContent,
  SandboxTabs,
  SandboxTabsBar,
  SandboxTabsList,
  SandboxTabsTrigger,
  SandboxTabContent,
} from "@/components/ai-elements/sandbox";
import {
  Terminal,
  TerminalHeader,
  TerminalTitle,
  TerminalContent,
  TerminalCopyButton,
  TerminalStatus,
  TerminalActions,
  TerminalClearButton,
} from "@/components/ai-elements/terminal";
import {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockContent,
  CodeBlockCopyButton,
} from "@/components/ai-elements/code-block";
import {
  Snippet,
  SnippetText,
  SnippetCopyButton,
} from "@/components/ai-elements/snippet";
import {
  PackageInfo,
  PackageInfoHeader,
  PackageInfoName,
  PackageInfoVersion,
  PackageInfoDescription,
  PackageInfoContent,
  PackageInfoDependencies,
  PackageInfoDependency,
} from "@/components/ai-elements/package-info";
import {
  FileTree,
  FileTreeFolder,
  FileTreeFile,
  FileTreeName,
  FileTreeIcon,
  FileTreeActions,
} from "@/components/ai-elements/file-tree";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  CodeIcon,
  TerminalIcon,
  FolderIcon,
  FileCodeIcon,
  PlayIcon,
  SaveIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  PackageIcon,
  SearchIcon,
  PlusIcon,
  TrashIcon,
  CopyIcon,
  CheckIcon,
} from "lucide-react";

const SAMPLE_TREE = [
  {
    name: "agentic-os",
    type: "folder",
    open: true,
    children: [
      { name: "app", type: "folder", children: [{ name: "page.tsx" }, { name: "layout.tsx" }, { name: "globals.css" }] },
      { name: "components", type: "folder", children: [{ name: "chat" }, { name: "ai-elements" }, { name: "ui" }] },
      { name: "lib", type: "folder", children: [{ name: "prisma.ts" }, { name: "auth.ts" }] },
      { name: "package.json", type: "file" },
      { name: "tsconfig.json", type: "file" },
    ],
  },
];

const SAMPLE_CODE = `import { NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    messages,
  });

  return result.toDataStreamResponse();
}`;

const SAMPLE_TERMINAL_LINES = [
  { type: "info", text: "$ npm install ai @ai-sdk/react" },
  { type: "output", text: "added 124 packages in 8s" },
  { type: "info", text: "$ npx prisma generate" },
  { type: "success", text: "✔ Generated Prisma Client (v5.22.0)" },
  { type: "info", text: "$ npm run dev" },
  { type: "warning", text: "⚠ Port 3000 is in use, using 3001 instead" },
  { type: "success", text: "✓ Ready in 2.3s" },
  { type: "info", text: "○ Local: http://localhost:3001" },
  { type: "error", text: "✗ [404] /api/chat - Route not found" },
];

const SAMPLE_PACKAGES = [
  { name: "ai", version: "5.0.51", desc: "Vercel AI SDK — streaming chat" },
  { name: "@ai-sdk/react", version: "2.0.30", desc: "React hooks for AI SDK" },
  { name: "prisma", version: "6.2.1", desc: "TypeScript ORM" },
  { name: "next", version: "16.3.0", desc: "React framework" },
  { name: "tailwindcss", version: "4.0.0", desc: "Utility-first CSS" },
];

export default function CodePage() {
  const [tab, setTab] = useState<"preview" | "code" | "console">("code");
  const [running, setRunning] = useState(false);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-3 md:px-5 h-12 border-b border-border flex-shrink-0 bg-background/95 backdrop-blur-md z-20">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal to-coral flex items-center justify-center text-white">
            <CodeIcon size={14} />
          </div>
          <h1 className="text-sm font-semibold tracking-tight font-space-grotesk">Code</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRunning((v) => !v)}
            className="h-8 px-3 text-xs"
          >
            <PlayIcon size={13} className="mr-1.5" />
            Run
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <SaveIcon size={14} />
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-3 md:p-5 space-y-5 pb-32">
          {/* Sandbox with tabs */}
          <Sandbox className="rounded-2xl border border-border bg-card overflow-hidden">
            <SandboxHeader className="border-b border-border bg-muted/20 px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileCodeIcon size={13} />
                <span className="font-mono">app/api/chat/route.ts</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setRunning((v) => !v)}
                  className="h-7 px-2 rounded-md hover:bg-muted text-xs flex items-center gap-1.5 transition-colors"
                >
                  <PlayIcon size={11} />
                  Run
                </button>
              </div>
            </SandboxHeader>
            <SandboxContent>
              <SandboxTabs value={tab} onValueChange={(v) => setTab(v as any)}>
                <SandboxTabsBar className="border-b border-border bg-muted/10">
                  <SandboxTabsList className="bg-transparent">
                    <SandboxTabsTrigger value="code" className="text-xs">
                      <CodeIcon size={11} className="mr-1.5" />
                      Code
                    </SandboxTabsTrigger>
                    <SandboxTabsTrigger value="preview" className="text-xs">
                      <PlayIcon size={11} className="mr-1.5" />
                      Preview
                    </SandboxTabsTrigger>
                    <SandboxTabsTrigger value="console" className="text-xs">
                      <TerminalIcon size={11} className="mr-1.5" />
                      Console
                      {running && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                    </SandboxTabsTrigger>
                  </SandboxTabsList>
                </SandboxTabsBar>
                <SandboxTabContent value="code" className="p-0">
                  <CodeBlock code={SAMPLE_CODE} language="typescript">
                    <CodeBlockHeader className="border-b border-border bg-muted/10 px-3 py-1.5">
                      <CodeBlockTitle className="text-xs">route.ts</CodeBlockTitle>
                      <CodeBlockCopyButton className="text-xs" />
                    </CodeBlockHeader>
                  </CodeBlock>
                </SandboxTabContent>
                <SandboxTabContent value="preview" className="p-6 text-center bg-muted/20 min-h-[200px] flex flex-col items-center justify-center">
                  {running ? (
                    <>
                      <Shimmer className="text-sm">Running…</Shimmer>
                      <p className="text-[10px] text-muted-foreground mt-2">Starting Next.js dev server</p>
                    </>
                  ) : (
                    <>
                      <PlayIcon size={28} className="text-muted-foreground mb-2" />
                      <p className="text-sm font-medium">Click Run to start the dev server</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Preview will appear here
                      </p>
                    </>
                  )}
                </SandboxTabContent>
                <SandboxTabContent value="console" className="p-0">
                  <Terminal className="rounded-none border-0 bg-zinc-950 text-zinc-100 font-mono text-xs">
                    <TerminalHeader className="border-b border-zinc-800 px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TerminalTitle className="text-xs">bash</TerminalTitle>
                        <TerminalStatus status={running ? "running" : "idle"} className="text-[10px]" />
                      </div>
                      <TerminalActions>
                        <TerminalClearButton className="text-[10px] text-zinc-400 hover:text-zinc-100" />
                        <TerminalCopyButton className="text-zinc-400 hover:text-zinc-100" />
                      </TerminalActions>
                    </TerminalHeader>
                    <TerminalContent className="p-3 space-y-0.5 min-h-[200px]">
                      {SAMPLE_TERMINAL_LINES.map((line, i) => (
                        <div
                          key={i}
                          className={
                            line.type === "error"
                              ? "text-red-400"
                              : line.type === "success"
                              ? "text-emerald-400"
                              : line.type === "warning"
                              ? "text-amber-400"
                              : line.type === "info"
                              ? "text-sky-300"
                              : "text-zinc-300"
                          }
                        >
                          {line.text}
                        </div>
                      ))}
                      {running && <span className="text-emerald-400 animate-pulse">▋</span>}
                    </TerminalContent>
                  </Terminal>
                </SandboxTabContent>
              </SandboxTabs>
            </SandboxContent>
          </Sandbox>

          {/* Snippet — install command */}
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Install command
            </h2>
            <Snippet className="rounded-xl border border-border bg-muted/50 overflow-hidden">
              <SnippetText className="px-3 py-2.5 text-xs font-mono">
                npm install ai @ai-sdk/react vercel-minimax-ai-provider
              </SnippetText>
              <SnippetCopyButton className="border-l border-border h-full px-2.5 hover:bg-background" />
            </Snippet>
          </div>

          {/* File tree */}
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FolderIcon size={12} />
              File tree
            </h2>
            <FileTree className="rounded-2xl border border-border bg-card p-3 font-mono text-xs">
              {SAMPLE_TREE.map((node, i) => (
                <FileTreeFolder key={i} defaultOpen className="text-sm">
                  <FileTreeName>
                    <FileTreeIcon>
                      <FolderIcon size={12} className="text-muted-foreground" />
                    </FileTreeIcon>
                    <span className="ml-1.5">{node.name}</span>
                  </FileTreeName>
                  {(node.children || []).map((child: any, j) =>
                    child.type === "folder" || child.type === undefined ? (
                      <FileTreeFolder key={j}>
                        <FileTreeName>
                          <FileTreeIcon>
                            <FolderIcon size={12} className="text-muted-foreground" />
                          </FileTreeIcon>
                          <span className="ml-1.5">{child.name}</span>
                        </FileTreeName>
                        {(child.children || []).map((grand: any, k) => (
                          <FileTreeFile key={k}>
                            <FileTreeName>
                              <FileTreeIcon>
                                <FileCodeIcon size={11} className="text-muted-foreground" />
                              </FileTreeIcon>
                              <span className="ml-1.5">{grand.name || grand}</span>
                            </FileTreeName>
                          </FileTreeFile>
                        ))}
                      </FileTreeFolder>
                    ) : (
                      <FileTreeFile key={j}>
                        <FileTreeName>
                          <FileTreeIcon>
                            <FileCodeIcon size={11} className="text-muted-foreground" />
                          </FileTreeIcon>
                          <span className="ml-1.5">{child.name}</span>
                        </FileTreeName>
                      </FileTreeFile>
                    )
                  )}
                </FileTreeFolder>
              ))}
            </FileTree>
          </div>

          {/* Package info cards */}
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <PackageIcon size={12} />
              Project dependencies
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SAMPLE_PACKAGES.map((p) => (
                <PackageInfo
                  key={p.name}
                  className="rounded-xl border border-border bg-card p-3"
                >
                  <PackageInfoHeader className="flex items-center gap-2 mb-1">
                    <PackageInfoName className="text-sm font-mono font-semibold">
                      {p.name}
                    </PackageInfoName>
                    <PackageInfoVersion className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                      {p.version}
                    </PackageInfoVersion>
                  </PackageInfoHeader>
                  <PackageInfoDescription className="text-xs text-muted-foreground">
                    {p.desc}
                  </PackageInfoDescription>
                </PackageInfo>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
