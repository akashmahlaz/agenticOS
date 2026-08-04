// @ts-nocheck
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/(app)/layout";
import AuthGate from "@/components/auth-gate";
import Sidebar from "@/components/chat/sidebar";

import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactDescription,
  ArtifactContent,
  ArtifactActions,
  ArtifactClose,
} from "@/components/ai-elements/artifact";
import { WebPreview, WebPreviewNavigation, WebPreviewUrl, WebPreviewBody } from "@/components/ai-elements/web-preview";
import {
  EnvironmentVariables,
  EnvironmentVariablesHeader,
  EnvironmentVariablesTitle,
  EnvironmentVariablesContent,
  EnvironmentVariable,
  EnvironmentVariableName,
  EnvironmentVariableValue,
  EnvironmentVariableCopyButton,
} from "@/components/ai-elements/environment-variables";
import { JSXPreview, JSXPreviewContent } from "@/components/ai-elements/jsx-preview";
import { Commit, CommitHeader, CommitHash, CommitMessage, CommitAuthor, CommitTimestamp, CommitInfo, CommitAuthorAvatar, CommitMetadata } from "@/components/ai-elements/commit";
import { SchemaDisplay, SchemaDisplayHeader, SchemaDisplayMethod, SchemaDisplayPath, SchemaDisplayDescription, SchemaDisplayContent } from "@/components/ai-elements/schema-display";

import { MenuIcon, FileTextIcon, GlobeIcon, CodeIcon, DownloadIcon, CopyIcon, XIcon, LockIcon, EyeIcon, EyeOffIcon } from "lucide-react";

const ARTIFACTS = [
  {
    id: "1",
    type: "code",
    title: "ChatContainer.tsx",
    description: "Main chat UI component with streaming support",
    language: "tsx",
    content: `import { useState } from "react";
import { useAuth } from "@/app/(app)/layout";

export default function ChatContainer() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  return (
    <div className="chat-container">
      {/* ... */}
    </div>
  );
}`,
  },
  {
    id: "2",
    type: "html",
    title: "Landing page",
    description: "Marketing landing page",
    url: "https://agentic-os.vercel.app",
    content: "<html><body><h1>agenticOS</h1></body></html>",
  },
  {
    id: "3",
    type: "doc",
    title: "API Reference",
    description: "REST API documentation",
    content: `# agenticOS API

## Endpoints

### POST /api/chat
Send a chat message and stream the response.

### GET /api/sessions
List all chat sessions.

### POST /api/sessions
Create a new chat session.`,
  },
];

export default function ArtifactsPage() {
  return (
    <AuthGate>
      <ArtifactsPageContent />
    </AuthGate>
  );
}

function ArtifactsPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState(ARTIFACTS[0]);
  const [showEnvVars, setShowEnvVars] = useState(false);

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
            <FileTextIcon size={16} className="text-coral" />
            <h1 className="text-sm font-semibold font-heading">Artifacts</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowEnvVars(!showEnvVars)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                showEnvVars ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/70"
              }`}
            >
              <LockIcon size={12} />
              Env Vars
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-3 md:p-5 max-w-5xl mx-auto w-full space-y-4">
          {/* Env vars panel */}
          {showEnvVars && (
            <EnvironmentVariables className="rounded-2xl border border-border bg-card overflow-hidden animate-fade-in">
              <EnvironmentVariablesHeader className="flex items-center justify-between px-4 h-10 border-b border-border bg-secondary/30">
                <EnvironmentVariablesTitle className="text-sm font-medium">Environment Variables</EnvironmentVariablesTitle>
                <button onClick={() => setShowEnvVars(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground">
                  <XIcon size={12} />
                </button>
              </EnvironmentVariablesHeader>
              <EnvironmentVariablesContent className="p-3 space-y-2">
                {[
                  { name: "DATABASE_URL", value: "postgresql://***@***.neon.tech/neondb" },
                  { name: "MINIMAX_API_KEY", value: "sk-cp-***" },
                  { name: "JWT_SECRET", value: "agentic-***" },
                  { name: "DIRECT_URL", value: "postgresql://***@***.neon.tech/neondb" },
                ].map((env) => (
                  <EnvironmentVariable key={env.name} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
                    <EnvironmentVariableName className="text-xs font-mono font-medium text-foreground">{env.name}</EnvironmentVariableName>
                    <EnvironmentVariableValue className="text-xs font-mono text-muted-foreground flex-1">
                      {env.value}
                    </EnvironmentVariableValue>
                    <EnvironmentVariableCopyButton className="p-1 rounded hover:bg-secondary text-muted-foreground" />
                  </EnvironmentVariable>
                ))}
              </EnvironmentVariablesContent>
            </EnvironmentVariables>
          )}

          {/* Artifact tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {ARTIFACTS.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelected(a)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selected.id === a.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground hover:bg-secondary/70"
                }`}
              >
                {a.type === "code" ? <CodeIcon size={11} /> : a.type === "html" ? <GlobeIcon size={11} /> : <FileTextIcon size={11} />}
                {a.title}
              </button>
            ))}
          </div>

          {/* Active artifact */}
          <Artifact className="rounded-2xl border border-border bg-card overflow-hidden">
            <ArtifactHeader className="flex items-start justify-between gap-3 p-4 border-b border-border">
              <div className="flex-1 min-w-0">
                <ArtifactTitle className="text-base font-semibold flex items-center gap-2">
                  {selected.type === "code" ? <CodeIcon size={14} className="text-primary" /> : selected.type === "html" ? <GlobeIcon size={14} className="text-coral" /> : <FileTextIcon size={14} className="text-success" />}
                  {selected.title}
                </ArtifactTitle>
                <ArtifactDescription className="text-xs text-muted-foreground mt-0.5">{selected.description}</ArtifactDescription>
              </div>
              <ArtifactActions className="flex items-center gap-1">
                <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground" title="Copy">
                  <CopyIcon size={13} />
                </button>
                <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground" title="Download">
                  <DownloadIcon size={13} />
                </button>
                <ArtifactClose className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground" />
              </ArtifactActions>
            </ArtifactHeader>
            <ArtifactContent className="p-0">
              {selected.type === "code" ? (
                <pre className="p-4 font-mono text-xs overflow-x-auto text-foreground bg-secondary/20 leading-relaxed">
                  <code>{selected.content}</code>
                </pre>
              ) : selected.type === "html" ? (
                <WebPreview className="w-full h-[400px] border-0">
                  <WebPreviewNavigation className="flex items-center gap-1 px-3 h-9 border-b border-border bg-secondary/30">
                    <WebPreviewUrl className="flex-1 px-2 py-0.5 text-xs text-muted-foreground bg-secondary/50 rounded truncate" value={selected.url || ""} readOnly />
                  </WebPreviewNavigation>
                  <WebPreviewBody className="bg-white p-6 min-h-[300px]" />
                </WebPreview>
              ) : (
                <pre className="p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {selected.content}
                </pre>
              )}
            </ArtifactContent>
          </Artifact>

          {/* Schema example */}
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">API Schema</h2>
            <SchemaDisplay className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <SchemaDisplayHeader className="flex items-center gap-2">
                <SchemaDisplayMethod className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-success/10 text-success">POST</SchemaDisplayMethod>
                <SchemaDisplayPath className="text-sm font-mono">/api/chat</SchemaDisplayPath>
              </SchemaDisplayHeader>
              <SchemaDisplayDescription className="text-xs text-muted-foreground">
                Send a chat message and stream the response as NDJSON.
              </SchemaDisplayDescription>
              <SchemaDisplayContent className="text-xs text-foreground">
                <pre className="font-mono text-[10px] bg-secondary/50 p-2 rounded">
{`curl -X POST /api/chat \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <token>" \\
  -d '{"messages":[{"role":"user","content":"Hi"}]}'`}
                </pre>
              </SchemaDisplayContent>
            </SchemaDisplay>
          </div>

          {/* Recent commits */}
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent commits</h2>
            <div className="space-y-2">
              {[
                { hash: "a1b2c3d", message: "Add voice mode and code workspace", author: "akash", time: "2h ago" },
                { hash: "f8ad7d7", message: "Wire MessageResponse for markdown", author: "akash", time: "3h ago" },
                { hash: "12f53e8", message: "Mobile UI redesign with teal/coral", author: "akash", time: "4h ago" },
              ].map((c) => (
                <Commit key={c.hash} className="rounded-xl border border-border bg-card p-3">
                  <CommitHeader className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CommitHash className="text-[10px] font-mono text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
                        {c.hash}
                      </CommitHash>
                      <CommitMessage className="text-sm text-foreground">{c.message}</CommitMessage>
                    </div>
                    <CommitMetadata className="flex items-center gap-2 flex-shrink-0">
                      <CommitAuthor className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <CommitAuthorAvatar className="w-4 h-4 rounded-full bg-gradient-to-br from-teal to-coral" />
                        {c.author}
                      </CommitAuthor>
                      <CommitTimestamp date={new Date()} className="text-[10px] text-muted-foreground">
                        {c.time}
                      </CommitTimestamp>
                    </CommitMetadata>
                  </CommitHeader>
                </Commit>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
