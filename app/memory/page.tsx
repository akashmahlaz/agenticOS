// @ts-nocheck
// Memory viewer page — shows the user's memory files, entries, and daily notes
// Allows editing USER.md and MEMORY.md inline

"use client";

import { useState, useEffect } from "react";
import {
  DatabaseIcon,
  FileTextIcon,
  BookOpenIcon,
  CalendarIcon,
  SaveIcon,
  RefreshCwIcon,
  EditIcon,
  CheckIcon,
  XIcon,
} from "lucide-react";

interface MemoryFile {
  id: string;
  path: string;
  title: string;
  content: string;
  version: number;
  charCount: number;
  lastEditedBy: string;
  updatedAt: string;
}

interface MemoryEntry {
  id: string;
  fact: string;
  provenance: string;
  category: string | null;
  importance: number;
  confidence: number;
  sourceSessionId: string | null;
  createdAt: string;
  lastAccessedAt: string | null;
}

interface DailyNote {
  id: string;
  date: string;
  content: string;
  entryCount: number;
  updatedAt: string;
}

const PROVENANCE_COLORS: Record<string, string> = {
  confirmed_by_user: "bg-success/15 text-success border-success/30",
  observed_from_source: "bg-info/15 text-info border-info/30",
  inferred_by_model: "bg-warning/15 text-warning border-warning/30",
  imported_from_transcript: "bg-primary/15 text-primary border-primary/30",
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  user: DatabaseIcon,
  project: FileTextIcon,
  preference: CheckIcon,
  fact: BookOpenIcon,
  decision: EditIcon,
  context: FileTextIcon,
};

export default function MemoryPage() {
  const [files, setFiles] = useState<MemoryFile[]>([]);
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [dailyNotes, setDailyNotes] = useState<DailyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"files" | "entries" | "daily">("files");

  async function loadMemory() {
    setLoading(true);
    try {
      const res = await fetch("/api/memory");
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
        setEntries(data.entries || []);
        setDailyNotes(data.dailyNotes || []);
      }
    } catch (err) {
      console.error("Failed to load memory:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMemory();
  }, []);

  async function saveFile(path: string, content: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/memory/file", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content }),
      });
      if (res.ok) {
        await loadMemory();
        setEditingPath(null);
      }
    } catch (err) {
      console.error("Failed to save file:", err);
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(id: string) {
    if (!confirm("Delete this memory entry?")) return;
    try {
      await fetch(`/api/memory/entry/${id}`, { method: "DELETE" });
      await loadMemory();
    } catch (err) {
      console.error("Failed to delete entry:", err);
    }
  }

  function startEdit(file: MemoryFile) {
    setEditingPath(file.path);
    setEditContent(file.content);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-4 py-8 pb-32">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Memory</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your long-term memory — what agenticOS remembers about you
            </p>
          </div>
          <button
            onClick={loadMemory}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title="Refresh"
          >
            <RefreshCwIcon size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b mb-6">
          <button
            onClick={() => setActiveTab("files")}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "files"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileTextIcon size={14} className="inline mr-1.5 -mt-0.5" />
            Files ({files.length})
          </button>
          <button
            onClick={() => setActiveTab("entries")}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "entries"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <DatabaseIcon size={14} className="inline mr-1.5 -mt-0.5" />
            Facts ({entries.length})
          </button>
          <button
            onClick={() => setActiveTab("daily")}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "daily"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarIcon size={14} className="inline mr-1.5 -mt-0.5" />
            Daily ({dailyNotes.length})
          </button>
        </div>

        {/* Content */}
        {loading && !files.length ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : activeTab === "files" ? (
          <div className="space-y-3">
            {files.length === 0 ? (
              <EmptyState
                icon={FileTextIcon}
                title="No memory files yet"
                subtitle="They'll be created automatically as you chat with the agent"
              />
            ) : (
              files.map((file) => (
                <div
                  key={file.id}
                  className="rounded-xl border bg-card overflow-hidden"
                >
                  <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileTextIcon size={16} className="text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{file.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {file.path} · v{file.version} · {file.charCount} chars ·{" "}
                          {new Date(file.updatedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    {editingPath === file.path ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => saveFile(file.path, editContent)}
                          disabled={saving}
                          className="p-2 rounded-lg bg-success/15 text-success hover:bg-success/25 transition-colors"
                          title="Save"
                        >
                          <SaveIcon size={14} />
                        </button>
                        <button
                          onClick={() => setEditingPath(null)}
                          className="p-2 rounded-lg hover:bg-muted transition-colors"
                          title="Cancel"
                        >
                          <XIcon size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(file)}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        title="Edit"
                      >
                        <EditIcon size={14} />
                      </button>
                    )}
                  </div>
                  <div className="p-4">
                    {editingPath === file.path ? (
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full h-64 p-3 rounded-lg bg-muted/30 border-0 text-sm font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed text-foreground/90">
                        {file.content}
                      </pre>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : activeTab === "entries" ? (
          <div className="space-y-2">
            {entries.length === 0 ? (
              <EmptyState
                icon={DatabaseIcon}
                title="No memory facts yet"
                subtitle="Tell the agent things about yourself — it will remember"
              />
            ) : (
              entries.map((entry) => {
                const Icon = CATEGORY_ICONS[entry.category || "fact"] || BookOpenIcon;
                return (
                  <div
                    key={entry.id}
                    className="rounded-xl border bg-card p-4 hover:border-foreground/20 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon size={14} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-relaxed">{entry.fact}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-md border ${
                              PROVENANCE_COLORS[entry.provenance] ||
                              "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {entry.provenance.replace(/_/g, " ")}
                          </span>
                          {entry.category && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                              {entry.category}
                            </span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                            importance {entry.importance}/10
                          </span>
                          <span className="text-[10px] text-muted-foreground/70">
                            · {new Date(entry.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-destructive/15 text-destructive transition-all"
                        title="Delete"
                      >
                        <XIcon size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : activeTab === "daily" ? (
          <div className="space-y-3">
            {dailyNotes.length === 0 ? (
              <EmptyState
                icon={CalendarIcon}
                title="No daily notes yet"
                subtitle="Notes are auto-created the first time you chat each day"
              />
            ) : (
              dailyNotes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-xl border bg-card overflow-hidden"
                >
                  <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <CalendarIcon size={16} className="text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {new Date(note.date).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {note.entryCount} entries · last updated{" "}
                          {new Date(note.updatedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 max-h-96 overflow-y-auto">
                      {note.content}
                    </pre>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-card/50 p-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-muted mx-auto mb-3 flex items-center justify-center">
        <Icon size={20} className="text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}
