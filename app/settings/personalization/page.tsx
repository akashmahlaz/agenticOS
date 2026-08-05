// @ts-nocheck
// Personalization settings page
// View and manage profile directives, SOUL.md, learned skills, dream diary

"use client";

import { useState, useEffect } from "react";
import {
  UserIcon,
  BookOpenIcon,
  BrainIcon,
  MoonIcon,
  SparklesIcon,
  PlusIcon,
  TrashIcon,
  RefreshCwIcon,
} from "lucide-react";

interface ProfileEntry {
  id: string;
  directive: string;
  category: string;
  observedDate: string;
  status: "active" | "superseded";
}

interface LearnedSkill {
  id: string;
  name: string;
  description: string;
  triggerPhrases: string[];
  useCount: number;
  status: "active" | "pending" | "quarantined";
  createdAt: string;
}

interface DreamDiaryEntry {
  id: string;
  date: string;
  phase: string;
  summary: string;
  promoted: number;
  createdAt: string;
}

export default function PersonalizationPage() {
  const [profile, setProfile] = useState<ProfileEntry[]>([]);
  const [skills, setSkills] = useState<LearnedSkill[]>([]);
  const [diary, setDiary] = useState<DreamDiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDirective, setNewDirective] = useState("");
  const [sweeping, setSweeping] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [p, d] = await Promise.all([
        fetch("/api/personalization").then((r) => r.json()),
        fetch("/api/dream").then((r) => r.json()),
      ]);
      setProfile(p.profile || []);
      setSkills(p.recentSkills || []);
      setDiary(d.diary || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addDirective() {
    if (!newDirective.trim()) return;
    await fetch("/api/personalization", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ directive: newDirective, category: "preference" }),
    });
    setNewDirective("");
    await load();
  }

  async function runDreamSweep() {
    setSweeping(true);
    try {
      await fetch("/api/dream", { method: "POST" });
      await load();
    } finally {
      setSweeping(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Personalization
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your profile, learned skills, and memory consolidation
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-muted"
          >
            <RefreshCwIcon size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Profile directives */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <UserIcon size={16} className="text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wide">
              Profile Directives
            </h2>
            <span className="text-xs text-muted-foreground">
              ({profile.length})
            </span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              value={newDirective}
              onChange={(e) => setNewDirective(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addDirective()}
              placeholder="Add a new preference or directive…"
              className="flex-1 px-3 py-2 rounded-lg bg-muted/30 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={addDirective}
              className="p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
            >
              <PlusIcon size={14} />
            </button>
          </div>
          <div className="space-y-1.5">
            {profile.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center rounded-xl border border-dashed">
                No directives yet. Add some, or just chat with me — I'll learn
                your preferences automatically.
              </p>
            ) : (
              profile.map((p) => (
                <div
                  key={p.id}
                  className="px-3 py-2.5 rounded-lg border bg-card flex items-start gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-relaxed">{p.directive}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                        {p.category}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        observed {new Date(p.observedDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Learned skills */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <BrainIcon size={16} className="text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wide">
              Learned Skills
            </h2>
            <span className="text-xs text-muted-foreground">
              ({skills.length})
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Procedures I've learned from your corrections and patterns. Status{" "}
            <code className="px-1 rounded bg-muted">pending</code> requires your
            approval to activate.
          </p>
          <div className="space-y-1.5">
            {skills.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center rounded-xl border border-dashed">
                No skills yet. I'll capture them as we work together.
              </p>
            ) : (
              skills.map((s) => (
                <div
                  key={s.id}
                  className="px-3 py-2.5 rounded-lg border bg-card"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {s.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md border ${
                          s.status === "active"
                            ? "bg-success/10 text-success border-success/30"
                            : s.status === "pending"
                            ? "bg-warning/10 text-warning border-warning/30"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {s.status}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {s.useCount}x
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Dream diary */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MoonIcon size={16} className="text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wide">
                Dream Diary
              </h2>
              <span className="text-xs text-muted-foreground">
                ({diary.length})
              </span>
            </div>
            <button
              onClick={runDreamSweep}
              disabled={sweeping}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50"
            >
              <SparklesIcon size={12} className={sweeping ? "animate-spin" : ""} />
              {sweeping ? "Sweeping…" : "Run Sweep"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Light → REM → Deep phases consolidate short-term memory into durable
            long-term knowledge.
          </p>
          <div className="space-y-1.5">
            {diary.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center rounded-xl border border-dashed">
                No dream cycles yet. Run a sweep to consolidate recent memory.
              </p>
            ) : (
              diary.map((d) => (
                <div
                  key={d.id}
                  className="px-3 py-2.5 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md uppercase font-medium ${
                        d.phase === "deep"
                          ? "bg-primary/15 text-primary"
                          : d.phase === "rem"
                          ? "bg-info/15 text-info"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {d.phase}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {d.date}
                    </span>
                    {d.promoted > 0 && (
                      <span className="text-[10px] text-success">
                        +{d.promoted} promoted
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {d.summary}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
