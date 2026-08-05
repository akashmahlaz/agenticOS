// @ts-nocheck
// Personalization manager — durable user preferences and identity
// OpenClaw-style: USER.md with imperative directives, observed-date, status
//
// On day one: onboarding wizard collects initial preferences
// Over time: auto-capture learns new preferences from conversations
//            self-learning captures corrections as procedures

import { db } from "../db";
import { initDefaultMemory, addMemoryEntry } from "../memory/manager";
import { searchMemoryEntries } from "../memory/manager";

export type ProfileCategory =
  | "preference"
  | "style"
  | "project"
  | "identity"
  | "constraint";

export interface ProfileEntry {
  id: string;
  directive: string;
  category: ProfileCategory;
  observedDate: Date;
  status: "active" | "superseded";
  supersedeId: string | null;
}

/**
 * Initialize a new user's profile (onboarding).
 * Creates initial USER.md + SOUL.md files + a welcome set of profile entries.
 */
export async function initUserProfile(
  userId: string,
  initialData: {
    name?: string;
    role?: string;
    preferences?: string[];
  } = {}
) {
  // Initialize memory files (USER.md, MEMORY.md)
  await initDefaultMemory(userId);

  // Create initial SOUL.md with the agent's personality
  const soulPath = "SOUL.md";
  const existingSoul = await db.memoryFile.findUnique({
    where: { userId_path: { userId, path: soulPath } },
  });

  if (!existingSoul) {
    await db.memoryFile.create({
      data: {
        userId,
        path: soulPath,
        title: "Soul & Personality",
        content: `# Soul & Personality

_Last initialized: ${new Date().toISOString().split("T")[0]}_

This file defines agenticOS's personality and interaction style.

## Core Identity
- Name: **agenticOS** (your AI assistant)
- Voice: warm, focused, casual-professional
- Stance: thinks-out-loud, shows work, never hand-waves

## Communication Style
- Concise by default — bullet points > paragraphs when listing
- Code-first when relevant — show the code, then explain
- Honest about uncertainty — say "I'm not sure" instead of guessing
- No filler ("Great question!", "Certainly!", etc.)

## Boundaries
- Never pretend to remember things you don't have
- Never store secrets unencrypted
- Always cite sources for non-trivial claims
- Always ask before destructive operations (delete, push, deploy)

## Working Style
- Use sub-agents aggressively for parallel work
- Show tool calls in the UI so the user knows what's happening
- Save learned preferences to memory automatically
- Log session activity to today's daily note
`,
        charCount: 0,
        lastEditedBy: "system",
      },
    });
  }

  // Create initial IDENTITY.md
  const identityPath = "IDENTITY.md";
  const existingIdentity = await db.memoryFile.findUnique({
    where: { userId_path: { userId, path: identityPath } },
  });

  if (!existingIdentity) {
    await db.memoryFile.create({
      data: {
        userId,
        path: identityPath,
        title: "Identity",
        content: `# Identity

_Generated on signup_

## Avatar
- Default: neutral bot
- Custom: not yet set

## Account
- Created: ${new Date().toISOString().split("T")[0]}
- Tier: free
`,
        charCount: 0,
        lastEditedBy: "system",
      },
    });
  }

  // Create profile entries from initial data
  if (initialData.name) {
    await addProfileEntry(userId, {
      directive: `User's name is ${initialData.name}`,
      category: "identity",
    });
  }
  if (initialData.role) {
    await addProfileEntry(userId, {
      directive: `User works as ${initialData.role}`,
      category: "identity",
    });
  }
  if (initialData.preferences) {
    for (const pref of initialData.preferences) {
      await addProfileEntry(userId, {
        directive: pref,
        category: "preference",
      });
    }
  }
}

/**
 * Add a new profile directive.
 * If a similar directive already exists, supersede it.
 */
export async function addProfileEntry(
  userId: string,
  input: {
    directive: string;
    category: ProfileCategory;
    supersedeSimilar?: boolean;
  }
): Promise<{ id: string; superseded: string[] }> {
  const superseded: string[] = [];

  // Optionally find similar directives to supersede
  if (input.supersedeSimilar !== false) {
    const similar = await db.userProfile.findMany({
      where: {
        userId,
        status: "active",
        directive: { contains: input.directive.slice(0, 30) },
      },
    });
    for (const s of similar) {
      await db.userProfile.update({
        where: { id: s.id },
        data: { status: "superseded" },
      });
      superseded.push(s.directive);
    }
  }

  const entry = await db.userProfile.create({
    data: {
      userId,
      directive: input.directive,
      category: input.category,
    },
  });

  // Also log to memory
  await addMemoryEntry({
    userId,
    fact: input.directive,
    provenance: "confirmed_by_user",
    category: input.category === "identity" ? "user" : input.category === "preference" ? "preference" : "context",
    importance: input.category === "identity" ? 9 : 6,
  });

  return { id: entry.id, superseded };
}

/**
 * Get all active profile directives.
 */
export async function getActiveProfile(userId: string): Promise<ProfileEntry[]> {
  const entries = await db.userProfile.findMany({
    where: { userId, status: "active" },
    orderBy: [{ category: "asc" }, { observedDate: "desc" }],
  });

  return entries.map((e) => ({
    id: e.id,
    directive: e.directive,
    category: e.category as ProfileCategory,
    observedDate: e.observedDate,
    status: e.status as "active" | "superseded",
    supersedeId: e.supersedeId,
  }));
}

/**
 * Build a personalization context block to inject into the system prompt.
 */
export async function buildPersonalizationContext(userId: string): Promise<string | null> {
  const profile = await getActiveProfile(userId);
  if (profile.length === 0) return null;

  const grouped: Record<string, ProfileEntry[]> = {};
  for (const entry of profile) {
    if (!grouped[entry.category]) grouped[entry.category] = [];
    grouped[entry.category].push(entry);
  }

  let block = "## User Profile (imperative directives — follow these)\n";
  for (const [category, entries] of Object.entries(grouped)) {
    block += `\n### ${category.charAt(0).toUpperCase() + category.slice(1)}\n`;
    for (const e of entries) {
      const date = e.observedDate.toISOString().split("T")[0];
      block += `- [observed ${date}] ${e.directive}\n`;
    }
  }

  return block;
}

/**
 * Check if a user has completed onboarding.
 */
export async function isOnboarded(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { onboardingCompleted: true },
  });
  return user?.onboardingCompleted ?? false;
}

/**
 * Mark onboarding complete.
 */
export async function completeOnboarding(userId: string) {
  await db.user.update({
    where: { id: userId },
    data: { onboardingCompleted: true },
  });
}
