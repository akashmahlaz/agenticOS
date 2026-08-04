// @ts-nocheck
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/(app)/layout";
import AuthGate from "@/components/auth-gate";
import Sidebar from "@/components/chat/sidebar";

import {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockFilename,
  CodeBlockContent,
} from "@/components/ai-elements/code-block";
import { Snippet } from "@/components/ai-elements/snippet";
import { Terminal, TerminalHeader, TerminalTitle, TerminalContent, TerminalCopyButton } from "@/components/ai-elements/terminal";
import { Sandbox, SandboxHeader, SandboxContent, SandboxTabs, SandboxTabsList, SandboxTabsTrigger, SandboxTabContent } from "@/components/ai-elements/sandbox";
import { PackageInfo, PackageInfoHeader, PackageInfoContent, PackageInfoDescription, PackageInfoName, PackageInfoVersion, PackageInfoChangeType, PackageInfoDependencies, PackageInfoDependency } from "@/components/ai-elements/package-info";
import { Folder as FolderIcon, FileCode as FileCodeIcon } from "lucide-react";
import { SnippetCopyButton } from "@/components/ai-elements/snippet";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput } from "@/components/ai-elements/prompt-input";

import { MenuIcon, CodeIcon, TerminalIcon, PlayIcon, SaveIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react";

const SAMPLE_CODE = `import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Counter() {
  const [count, setCount] = useState(0);
  return (
    <Button onClick={() => setCount(c => c + 1)}>
      Clicked {count} times
    </Button>
  );
}`;

const SAMPLE_TERMINAL_OUTPUT = [
  { type: "info", text: "Installing dependencies..." },
  { type: "success", text: "✓ Dependencies installed" },
  { type: "info", text: "Building TypeScript..." },
  { type: "success", text: "✓ Compiled successfully" },
  { type: "info", text: "Running tests..." },
  { type: "success", text: "✓ All tests passed (12/12)" },
  { type: "warning", text: "⚠ Bundle size > 500kb" },
];

const SAMPLE_PACKAGES = [
  { name: "react", version: "19.0.0", type: "dependencies" as const, description: "React is a JavaScript library for building user interfaces." },
  { name: "next", version: "16.3.0", type: "dependencies" as const, description: "The React Framework" },
  { name: "ai", version: "7.0.51", type: "dependencies" as const, description: "Vercel AI SDK" },
];

const SAMPLE_TREE = [
  { name: "app", type: "folder" as const, children: [
    { name: "page.tsx", type: "file" as const },
    { name: "layout.tsx", type: "file" as const },
    { name: "globals.css", type: "file" as const },
  ]},
  { name: "components", type: "folder" as const, children: [
    { name: "ui", type: "folder" as const, children: [
      { name: "button.tsx", type: "file" as const },
      { name: "card.tsx", type: "file" as const },
    ]},
    { name: "chat", type: "folder" as const },
  ]},
  { name: "lib", type: "folder" as const },
  { name: "package.json", type: "file" as const },
];

export default function CodePage() {
  return (
    <AuthGate>
      <CodePageContent />
    </AuthGate>
  );
}

function CodePageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [code, setCode] = useState(SAMPLE_CODE);
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);

  const handleRun = () => {
    setRunning(true);
    setOutput("Running...\n");
    setTimeout(() => {
      setOutput(
        SAMPLE_TERMINAL_OUTPUT.map((o) => `[${o.type.toUpperCase()}] ${o.text}`).join("\n")
      );
      setRunning(false);
    }, 1500);
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
            <CodeIcon size={16} className="text-coral" />
            <h1 className="text-sm font-semibold font-heading">Code Workspace</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleRun}
              disabled={running}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <PlayIcon size={12} />
              Run
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/70 transition-colors">
              <SaveIcon size={12} />
              Save
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-5 max-w-5xl mx-auto w-full">
          {/* Sandbox */}
          <Sandbox className="rounded-2xl border border-border bg-card overflow-hidden">
            <SandboxHeader className="flex items-center gap-2 px-4 h-10 border-b border-border bg-secondary/30">
              <FileCodeIcon size={14} className="text-muted-foreground" />
              <span className="text-sm font-medium">counter.tsx</span>
            </SandboxHeader>
            <SandboxContent>
              <SandboxTabs defaultValue="code" className="w-full">
                <SandboxTabsList className="border-b border-border px-2">
                  <SandboxTabsTrigger value="code" className="px-3 py-1.5 text-xs">Code</SandboxTabsTrigger>
                  <SandboxTabsTrigger value="preview" className="px-3 py-1.5 text-xs">Preview</SandboxTabsTrigger>
                  <SandboxTabsTrigger value="console" className="px-3 py-1.5 text-xs">Console</SandboxTabsTrigger>
                </SandboxTabsList>
                <SandboxTabContent value="code" className="p-0">
                  <CodeBlock code={code} language="tsx" showLineNumbers>
                    <CodeBlockHeader>
                      <CodeBlockTitle>counter.tsx</CodeBlockTitle>
                      <CodeBlockFilename>components/counter.tsx</CodeBlockFilename>
                    </CodeBlockHeader>
                    <CodeBlockContent />
                  </CodeBlock>
                </SandboxTabContent>
                <SandboxTabContent value="preview" className="p-6 min-h-[200px] flex items-center justify-center bg-secondary/20">
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
                    Click me (preview)
                  </button>
                </SandboxTabContent>
                <SandboxTabContent value="console" className="p-3 font-mono text-xs min-h-[200px] bg-secondary/30">
                  {running ? (
                    <Shimmer duration={1.2}>Running code…</Shimmer>
                  ) : (
                    <pre className="whitespace-pre-wrap text-foreground">{output || "No output yet. Click Run to execute."}</pre>
                  )}
                </SandboxTabContent>
              </SandboxTabs>
            </SandboxContent>
          </Sandbox>

          {/* Terminal */}
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Terminal</h2>
            <Terminal className="rounded-2xl border border-border bg-card overflow-hidden">
              <TerminalHeader className="flex items-center gap-2 px-4 h-9 border-b border-border bg-secondary/30">
                <TerminalIcon size={13} className="text-muted-foreground" />
                <TerminalTitle className="text-xs font-medium">~/agentic-os</TerminalTitle>
                <TerminalCopyButton className="ml-auto p-1 rounded hover:bg-secondary text-muted-foreground" />
              </TerminalHeader>
              <TerminalContent className="p-3 font-mono text-xs space-y-1">
                {SAMPLE_TERMINAL_OUTPUT.map((line, i) => (
                  <div
                    key={i}
                    className={
                      line.type === "info" ? "text-blue-500" :
                      line.type === "success" ? "text-green-500" :
                      line.type === "warning" ? "text-amber-500" :
                      line.type === "error" ? "text-red-500" :
                      "text-muted-foreground"
                    }
                  >
                    [{line.type.toUpperCase()}] {line.text}
                  </div>
                ))}
                <div className="text-foreground">$ _</div>
              </TerminalContent>
            </Terminal>
          </div>

          {/* Snippets */}
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick snippets</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Snippet className="rounded-xl border border-border bg-card">
                <pre className="p-3 font-mono text-xs overflow-x-auto">
                  <code>npm install @ai-sdk/react</code>
                </pre>
                <SnippetCopyButton className="absolute top-2 right-2 p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground" />
              </Snippet>
              <Snippet className="rounded-xl border border-border bg-card">
                <pre className="p-3 font-mono text-xs overflow-x-auto">
                  <code>git commit -m "feat: add agent chat"</code>
                </pre>
                <SnippetCopyButton className="absolute top-2 right-2 p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground" />
              </Snippet>
            </div>
          </div>

          {/* File tree + packages */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">File tree</h2>
              <div className="rounded-2xl border border-border bg-card p-3 font-mono text-xs space-y-1">
                {SAMPLE_TREE.map((node, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-foreground">
                    {node.type === "folder" ? (
                      <FolderIcon size={12} className="text-muted-foreground" />
                    ) : (
                      <FileCodeIcon size={12} className="text-muted-foreground" />
                    )}
                    <span>{node.name}</span>
                    {node.children && (
                      <div className="ml-6 space-y-1 w-full">
                        {node.children.map((child, j) => (
                          <div key={j} className="flex items-center gap-1.5 text-muted-foreground">
                            {child.type === "folder" ? (
                              <FolderIcon size={11} />
                            ) : (
                              <FileCodeIcon size={11} />
                            )}
                            <span>{child.name}</span>
                            {child.children && child.children.map((grand, k) => (
                              <div key={k} className="ml-6 flex items-center gap-1.5">
                                <FileCodeIcon size={10} className="text-muted-foreground/60" />
                                <span>{grand.name}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Dependencies</h2>
              <div className="space-y-2">
                {SAMPLE_PACKAGES.map((pkg) => (
                  <PackageInfo key={pkg.name} className="rounded-xl border border-border bg-card p-3">
                    <PackageInfoHeader className="flex items-center justify-between mb-1">
                      <PackageInfoName className="text-sm font-medium">{pkg.name}</PackageInfoName>
                      <PackageInfoVersion className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                        v{pkg.version}
                      </PackageInfoVersion>
                    </PackageInfoHeader>
                    <PackageInfoDescription className="text-xs text-muted-foreground mb-2">
                      {pkg.description}
                    </PackageInfoDescription>
                    <code className="text-[10px] font-mono text-foreground bg-secondary/50 px-2 py-1 rounded block">
                      npm install {pkg.name}
                    </code>
                  </PackageInfo>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
