// @ts-nocheck
// Secrets management page — encrypted API keys, tokens, credentials
// All values are encrypted with AES-256-GCM (per-user derived key)

"use client";

import { useState, useEffect } from "react";
import {
  KeyIcon,
  PlusIcon,
  TrashIcon,
  CopyIcon,
  CheckIcon,
  XIcon,
  EyeIcon,
  EyeOffIcon,
  SaveIcon,
  SearchIcon,
  AlertCircleIcon,
} from "lucide-react";

interface Secret {
  id: string;
  name: string;
  description: string | null;
  service: string | null;
  tags: string[];
  hasValue: boolean;
  fingerprint: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function SecretsPage() {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newService, setNewService] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());
  const [secretValues, setSecretValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/secrets");
      if (res.ok) {
        const data = await res.json();
        setSecrets(data.secrets || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName || !newValue) return;
    setSaving(true);
    try {
      const res = await fetch("/api/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          value: newValue,
          service: newService || undefined,
          description: newDescription || undefined,
        }),
      });
      if (res.ok) {
        setNewName("");
        setNewValue("");
        setNewService("");
        setNewDescription("");
        setShowAdd(false);
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(name: string) {
    if (!confirm(`Delete secret "${name}"?`)) return;
    await fetch(`/api/secrets/${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
    await load();
  }

  async function toggleVisibility(secret: Secret) {
    if (visibleSecrets.has(secret.id)) {
      const next = new Set(visibleSecrets);
      next.delete(secret.id);
      setVisibleSecrets(next);
      const values = { ...secretValues };
      delete values[secret.id];
      setSecretValues(values);
    } else {
      const res = await fetch(`/api/secrets/${encodeURIComponent(secret.name)}`);
      if (res.ok) {
        const data = await res.json();
        setSecretValues((prev) => ({ ...prev, [secret.id]: data.secret.value }));
        setVisibleSecrets((prev) => new Set([...prev, secret.id]));
      }
    }
  }

  async function copyValue(secret: Secret) {
    let value = secretValues[secret.id];
    if (!value) {
      const res = await fetch(`/api/secrets/${encodeURIComponent(secret.name)}`);
      if (res.ok) {
        const data = await res.json();
        value = data.secret.value;
        setSecretValues((prev) => ({ ...prev, [secret.id]: value! }));
      }
    }
    if (value) {
      await navigator.clipboard.writeText(value);
      setCopied(secret.id);
      setTimeout(() => setCopied(null), 2000);
    }
  }

  const filtered = secrets.filter((s) => {
    const q = search.toLowerCase();
    return (
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.service?.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Secrets</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Encrypted with AES-256-GCM. Only you can read them.
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <PlusIcon size={14} />
            New Secret
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <SearchIcon
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search secrets…"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-card border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />
        </div>

        {/* Notice */}
        <div className="mb-4 p-3 rounded-xl bg-info/10 border border-info/20 flex items-start gap-2">
          <AlertCircleIcon size={14} className="text-info flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Secrets are encrypted at rest with a key derived from your account.
            The agent can use them when you ask — you'll see the value previews
            in chat. The agent never sees the raw value unless explicitly
            requested.
          </p>
        </div>

        {/* List */}
        {loading && !secrets.length ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/50 p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted mx-auto mb-3 flex items-center justify-center">
              <KeyIcon size={20} className="text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium mb-1">
              {secrets.length === 0 ? "No secrets yet" : "No matches"}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {secrets.length === 0
                ? "Add your first secret to get started"
                : "Try a different search"}
            </p>
            {secrets.length === 0 && (
              <button
                onClick={() => setShowAdd(true)}
                className="text-xs text-primary hover:underline"
              >
                Add a secret →
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((s) => {
              const isVisible = visibleSecrets.has(s.id);
              const value = secretValues[s.id];
              return (
                <div
                  key={s.id}
                  className="rounded-xl border bg-card p-3.5"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <KeyIcon size={14} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium truncate">
                          {s.name}
                        </h3>
                        {s.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {s.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(s.name)}
                      className="p-1.5 rounded-md hover:bg-destructive/15 text-destructive opacity-60 hover:opacity-100"
                      title="Delete"
                    >
                      <TrashIcon size={12} />
                    </button>
                  </div>

                  {/* Value row */}
                  <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg px-2 py-1.5">
                    <code className="flex-1 text-xs font-mono truncate">
                      {isVisible && value
                        ? value
                        : "••••••••••••••••"}
                    </code>
                    <button
                      onClick={() => toggleVisibility(s)}
                      className="p-1 rounded hover:bg-background/50"
                      title={isVisible ? "Hide" : "Show"}
                    >
                      {isVisible ? (
                        <EyeOffIcon size={12} />
                      ) : (
                        <EyeIcon size={12} />
                      )}
                    </button>
                    <button
                      onClick={() => copyValue(s)}
                      className="p-1 rounded hover:bg-background/50"
                      title="Copy"
                    >
                      {copied === s.id ? (
                        <CheckIcon size={12} className="text-success" />
                      ) : (
                        <CopyIcon size={12} />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 mt-2">
                    {s.service && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
                        {s.service}
                      </span>
                    )}
                    {s.lastUsedAt && (
                      <span className="text-[10px] text-muted-foreground">
                        last used {new Date(s.lastUsedAt).toLocaleDateString()}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {s.fingerprint}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAdd}
            className="w-full max-w-md bg-card border rounded-2xl p-5 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">New Secret</h2>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="p-1 rounded-md hover:bg-muted"
              >
                <XIcon size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))}
                  placeholder="OPENAI_API_KEY"
                  className="w-full px-3 py-2 rounded-lg bg-muted/30 border-0 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Value
                </label>
                <input
                  type="password"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="sk-…"
                  className="w-full px-3 py-2 rounded-lg bg-muted/30 border-0 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Service (optional)
                </label>
                <input
                  type="text"
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  placeholder="openai, github, stripe…"
                  className="w-full px-3 py-2 rounded-lg bg-muted/30 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="What is this for?"
                  className="w-full px-3 py-2 rounded-lg bg-muted/30 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-5">
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
                {saving ? "Encrypting…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
