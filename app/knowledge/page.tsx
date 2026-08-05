// @ts-nocheck
// Knowledge Base page — RAG document viewer and manager
// Add documents, search by content, delete

"use client";

import { useState, useEffect } from "react";
import {
  DatabaseIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  FileTextIcon,
  XIcon,
  SaveIcon,
  TagIcon,
  ExternalLinkIcon,
} from "lucide-react";

interface Document {
  id: string;
  title: string;
  content: string;
  source: string | null;
  sourceType: string;
  tags: string[];
  hasRealEmbedding: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function KnowledgePage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Document[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newSource, setNewSource] = useState("");
  const [newTags, setNewTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  async function loadDocs() {
    setLoading(true);
    try {
      const res = await fetch("/api/knowledge");
      if (res.ok) {
        const data = await res.json();
        setDocs(data.documents || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocs();
  }, []);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      const res = await fetch("/api/knowledge/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, limit: 10 }),
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          content: newContent,
          source: newSource || undefined,
          tags: newTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      if (res.ok) {
        setNewTitle("");
        setNewContent("");
        setNewSource("");
        setNewTags("");
        setShowAdd(false);
        await loadDocs();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this document?")) return;
    try {
      await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
      if (selectedDoc?.id === id) setSelectedDoc(null);
      await loadDocs();
      if (searchResults) {
        setSearchResults(searchResults.filter((d) => d.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  }

  const displayed = searchResults || docs;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-4 py-8 pb-32">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Knowledge Base</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {docs.length} documents · RAG with vector embeddings
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <PlusIcon size={14} />
            Add Document
          </button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <SearchIcon
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search the knowledge base..."
              className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-card border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults(null);
                }}
                className="absolute right-12 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted"
              >
                <XIcon size={14} />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium"
            >
              Search
            </button>
          </div>
          {searchResults && (
            <p className="text-xs text-muted-foreground mt-2">
              {searchResults.length} relevant documents
            </p>
          )}
        </form>

        {/* Document list / detail */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* List */}
          <div className="space-y-2">
            {loading && !docs.length ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-muted/30 animate-pulse" />
                ))}
              </div>
            ) : displayed.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-card/50 p-12 text-center">
                <div className="w-12 h-12 rounded-xl bg-muted mx-auto mb-3 flex items-center justify-center">
                  <DatabaseIcon size={20} className="text-muted-foreground" />
                </div>
                <h3 className="text-sm font-medium mb-1">
                  {searchResults ? "No matches" : "No documents yet"}
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {searchResults
                    ? "Try a different search"
                    : "Add your first document to get started"}
                </p>
                {!searchResults && (
                  <button
                    onClick={() => setShowAdd(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    Add a document →
                  </button>
                )}
              </div>
            ) : (
              displayed.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`rounded-xl border bg-card p-4 cursor-pointer transition-colors ${
                    selectedDoc?.id === doc.id
                      ? "border-primary"
                      : "hover:border-foreground/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium truncate">{doc.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {doc.content.slice(0, 120).replace(/\s+/g, " ").trim()}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {doc.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                        {doc.hasRealEmbedding && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-success/15 text-success border border-success/30">
                            vector
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(doc.id);
                      }}
                      className="p-1.5 rounded-md hover:bg-destructive/15 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete"
                    >
                      <TrashIcon size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Detail */}
          {selectedDoc ? (
            <div className="rounded-xl border bg-card p-5 lg:sticky lg:top-4 self-start">
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-lg font-semibold">{selectedDoc.title}</h2>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="p-1 rounded-md hover:bg-muted lg:hidden"
                >
                  <XIcon size={14} />
                </button>
              </div>
              {selectedDoc.source && (
                <a
                  href={selectedDoc.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mb-3"
                >
                  <ExternalLinkIcon size={10} />
                  {selectedDoc.source}
                </a>
              )}
              <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 max-h-96 overflow-y-auto">
                {selectedDoc.content}
              </pre>
              {selectedDoc.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t">
                  <TagIcon size={12} className="text-muted-foreground" />
                  {selectedDoc.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-3">
                {selectedDoc.hasRealEmbedding
                  ? "Indexed with vector embeddings"
                  : "Indexed with hash embeddings (set OPENAI_API_KEY for real vectors)"}
              </p>
            </div>
          ) : (
            <div className="hidden lg:flex rounded-xl border border-dashed bg-card/30 p-8 items-center justify-center text-center text-sm text-muted-foreground min-h-[200px]">
              Select a document to view
            </div>
          )}
        </div>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAdd}
            className="w-full max-w-lg bg-card border rounded-2xl p-5 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Add Document</h2>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="p-1 rounded-md hover:bg-muted"
              >
                <XIcon size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Title"
                className="w-full px-3 py-2 rounded-lg bg-muted/30 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Content..."
                rows={8}
                className="w-full px-3 py-2 rounded-lg bg-muted/30 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                required
              />
              <input
                type="text"
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                placeholder="Source URL (optional)"
                className="w-full px-3 py-2 rounded-lg bg-muted/30 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="text"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="Tags (comma separated)"
                className="w-full px-3 py-2 rounded-lg bg-muted/30 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="flex-1 px-4 py-2 rounded-lg hover:bg-muted text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                <SaveIcon size={14} />
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
