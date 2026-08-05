// Dreaming — background memory consolidation
// OpenClaw-style 3-phase model: light → REM → deep
// Light: scan & stage short-term material
// REM: extract themes & reflections
// Deep: promote durable candidates to MEMORY.md (with provenance gates)

import { db } from "../db";
import {
  getRecentDailyNotes,
  getTopMemoryEntries,
  addMemoryEntries,
  searchMemoryEntries,
} from "../memory/manager";
import { getActiveProfile, addProfileEntry } from "./manager";

// ──────────────────────────────────────────────
// Phase 1: Light
// Reads recent daily notes, dedupes, stages candidates
// ──────────────────────────────────────────────

export interface LightResult {
  candidates: Array<{
    text: string;
    source: string; // e.g. "memory/2026-08-04.md#L3-L7"
    reinforcement: number; // how many times seen
    category: "user" | "project" | "preference" | "decision" | "fact" | "context";
  }>;
}

export async function runLightPhase(userId: string): Promise<LightResult> {
  // Read recent daily notes (last 7 days)
  const notes = await getRecentDailyNotes(userId, 7);

  const candidateMap = new Map<
    string,
    { text: string; source: string; reinforcement: number; category: any }
  >();

  for (const note of notes) {
    // Extract bulleted lines as candidates
    const lines = note.content.split("\n");
    let currentLine = 1;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const text = trimmed.slice(2).trim();
        if (text.length > 10 && text.length < 200) {
          // Use first 60 chars as key (catches near-duplicates)
          const key = text.toLowerCase().slice(0, 60);
          const existing = candidateMap.get(key);
          if (existing) {
            existing.reinforcement += 1;
          } else {
            candidateMap.set(key, {
              text,
              source: `memory/${note.date}.md#L${currentLine}`,
              reinforcement: 1,
              category: "context",
            });
          }
        }
      }
      currentLine++;
    }
  }

  return { candidates: Array.from(candidateMap.values()) };
}

// ──────────────────────────────────────────────
// Phase 2: REM
// Reflects on themes, builds summary candidates
// ──────────────────────────────────────────────

export interface RemResult {
  themes: Array<{
    theme: string;
    candidateCount: number;
    summary: string;
  }>;
}

export async function runRemPhase(
  userId: string,
  lightResult: LightResult
): Promise<RemResult> {
  // Group candidates by simple keyword overlap
  const themes = new Map<string, { count: number; texts: string[] }>();

  for (const c of lightResult.candidates) {
    // Extract a few keywords
    const words = c.text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w: any) => w.length > 4);
    const key = words.slice(0, 2).sort().join(" ");
    if (!themes.has(key)) {
      themes.set(key, { count: 0, texts: [] });
    }
    const t = themes.get(key)!;
    t.count += c.reinforcement;
    t.texts.push(c.text);
  }

  // Top themes
  const sorted = Array.from(themes.entries())
    .sort((a: any, b: any) => b[1].count - a[1].count)
    .slice(0, 5);

  return {
    themes: sorted.map(([theme, data]) => ({
      theme,
      candidateCount: data.count,
      summary: data.texts.slice(0, 3).join(" | "),
    })),
  };
}

// ──────────────────────────────────────────────
// Phase 3: Deep
// Promotes durable candidates with score/recall gates
// ──────────────────────────────────────────────

export interface DeepResult {
  promoted: number;
  merged: number;
  superseded: number;
  promotedEntries: Array<{ fact: string; importance: number }>;
}

const DEEP_MIN_RECALL = 2; // Must be reinforced at least twice
const DEEP_MIN_IMPORTANCE = 7; // For auto-promotion

export async function runDeepPhase(
  userId: string,
  lightResult: LightResult
): Promise<DeepResult> {
  // Check current MEMORY.md to know what's already promoted
  const existing = await getTopMemoryEntries(userId, 50);
  const existingFacts = new Set(existing.map((e: any) => e.fact.toLowerCase().slice(0, 60)));

  const promoted: Array<{ fact: string; importance: number }> = [];
  const promotedEntries: DeepResult["promotedEntries"] = [];
  let merged = 0;
  let superseded = 0;

  for (const candidate of lightResult.candidates) {
    // Gate 1: recall count
    if (candidate.reinforcement < DEEP_MIN_RECALL) continue;

    // Gate 2: not already in memory
    const key = candidate.text.toLowerCase().slice(0, 60);
    if (existingFacts.has(key)) {
      merged += 1;
      continue;
    }

    // Compute importance from reinforcement
    const importance = Math.min(10, 5 + candidate.reinforcement);
    if (importance < DEEP_MIN_IMPORTANCE) continue;

    // Promote!
    promoted.push({ fact: candidate.text, importance });
    promotedEntries.push({ fact: candidate.text, importance });
  }

  // Batch insert
  if (promoted.length > 0) {
    await addMemoryEntries(
      userId,
      promoted.map((p: any) => ({
        fact: p.fact,
        provenance: "inferred_by_model",
        category: "context" as any,
        importance: p.importance,
        confidence: 0.7, // Lower than confirmed_by_user
      }))
    );
  }

  return {
    promoted: promoted.length,
    merged,
    superseded,
    promotedEntries,
  };
}

// ──────────────────────────────────────────────
// Full dream sweep
// Runs all 3 phases + writes to DREAMS.md equivalent (DreamDiary table)
// ──────────────────────────────────────────────

export interface DreamSweepResult {
  light: LightResult;
  rem: RemResult;
  deep: DeepResult;
  date: string;
}

export async function runDreamSweep(userId: string): Promise<DreamSweepResult> {
  const today = new Date().toISOString().split("T")[0];

  const light = await runLightPhase(userId);
  const rem = await runRemPhase(userId, light);
  const deep = await runDeepPhase(userId, light);

  // Log each phase to DreamDiary
  await db.dreamDiary.createMany({
    data: [
      {
        userId,
        date: today,
        phase: "light",
        summary: `Staged ${light.candidates.length} candidates from recent daily notes`,
        promoted: 0,
      },
      {
        userId,
        date: today,
        phase: "rem",
        summary: `Identified ${rem.themes.length} recurring themes`,
        promoted: 0,
      },
      {
        userId,
        date: today,
        phase: "deep",
        summary: `Promoted ${deep.promoted} durable candidates to memory (${deep.merged} merged, ${deep.superseded} superseded)`,
        promoted: deep.promoted,
        changes: deep.promotedEntries as any,
      },
    ],
  });

  return { light, rem, deep, date: today };
}

/**
 * Get recent dream diary entries.
 */
export async function getDreamDiary(userId: string, limit: number = 30) {
  return db.dreamDiary.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
