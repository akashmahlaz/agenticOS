// @ts-nocheck
// Self-learning — detect corrections and "from now on" patterns
// OpenClaw-style: turn failed/corrected turns into reusable skills
//
// Detection: deterministic, regex-based (no extra model calls)
// Storage: LearnedSkill table
// Lifecycle: pending → active (or quarantined) by the user

import { db } from "../db";
import { addProfileEntry } from "./manager";

// Durable phrases that indicate a preference / instruction for future behavior
const CORRECTION_PATTERNS: RegExp[] = [
  /\bfrom now on\b/i,
  /\bnext time\b/i,
  /\bin the future\b/i,
  /\balways\s+(use|do|remember|prefer)\b/i,
  /\bnever\s+(use|do|forget|include)\b/i,
  /\bdon'?t\s+(ever|again|anymore)\b/i,
  /\bremember\s+(that|to)\b/i,
  /\bmake sure to\b/i,
  /\bI prefer\b/i,
  /\bI want\b/i,
  /\bplease (always|never)\b/i,
  /\bgoing forward\b/i,
];

const NEGATIVE_CORRECTION_PATTERNS: RegExp[] = [
  /\bno,?\s+that'?s\s+not\s+right\b/i,
  /\bthat'?s\s+wrong\b/i,
  /\bdon'?t\s+do\s+that\b/i,
  /\btry\s+again\b/i,
  /\bI\s+already\s+told\s+you\b/i,
  /\bI\s+said\b/i,
];

export interface DetectedLearning {
  type: "preference" | "correction" | "instruction";
  text: string;
  trigger: string; // The phrase that matched
  confidence: number; // 0-1
}

/**
 * Scan a user message for durable learning signals.
 * Returns zero or more DetectedLearning entries.
 */
export function detectLearnings(userMessage: string): DetectedLearning[] {
  const results: DetectedLearning[] = [];

  for (const pattern of CORRECTION_PATTERNS) {
    const match = userMessage.match(pattern);
    if (match) {
      // Extract the directive (the sentence containing the match)
      const sentences = userMessage.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
      const matchingSentence = sentences.find((s) => pattern.test(s));
      if (matchingSentence && matchingSentence.length > 10) {
        results.push({
          type: "preference",
          text: matchingSentence,
          trigger: match[0],
          confidence: 0.85,
        });
      }
    }
  }

  for (const pattern of NEGATIVE_CORRECTION_PATTERNS) {
    const match = userMessage.match(pattern);
    if (match) {
      const sentences = userMessage.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
      const matchingSentence = sentences.find((s) => pattern.test(s));
      if (matchingSentence && matchingSentence.length > 10) {
        results.push({
          type: "correction",
          text: matchingSentence,
          trigger: match[0],
          confidence: 0.7,
        });
      }
    }
  }

  return results;
}

/**
 * Process a user message for learnings and save them.
 * Called after each turn (auto-capture).
 * Returns the number of new skills/profile entries added.
 */
export async function captureLearnings(
  userId: string,
  userMessage: string
): Promise<{ count: number; detected: DetectedLearning[] }> {
  const detected = detectLearnings(userMessage);
  if (detected.length === 0) return { count: 0, detected: [] };

  let count = 0;
  for (const d of detected) {
    // Determine category
    let category: "preference" | "style" | "project" | "identity" | "constraint" = "preference";
    const lower = d.text.toLowerCase();
    if (lower.includes("style") || lower.includes("format") || lower.includes("tone")) {
      category = "style";
    } else if (lower.includes("project") || lower.includes("building") || lower.includes("app")) {
      category = "project";
    } else if (lower.includes("never") || lower.includes("don't") || lower.includes("avoid")) {
      category = "constraint";
    }

    // Save as profile entry (imperative directive)
    await addProfileEntry(userId, {
      directive: d.text,
      category,
    });
    count += 1;

    // Also save as a learned skill (for procedure-like instructions)
    if (d.type === "instruction" || d.text.length > 50) {
      try {
        await db.learnedSkill.create({
          data: {
            userId,
            name: extractSkillName(d.text),
            description: d.text,
            procedure: d.text,
            triggerPhrases: [d.trigger.toLowerCase()],
            source: "user_correction",
            origin: "trusted",
            status: "pending", // Requires user approval before activation
          },
        });
      } catch {
        // Ignore duplicate skill errors
      }
    }
  }

  return { count, detected };
}

function extractSkillName(text: string): string {
  // First 60 chars, capitalize first word
  const words = text.split(/\s+/).slice(0, 6).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1, 60);
}

/**
 * Get active and pending skills for a user.
 */
export async function getUserSkills(userId: string, status?: string) {
  return db.learnedSkill.findMany({
    where: {
      userId,
      ...(status ? { status } : {}),
    },
    orderBy: [{ useCount: "desc" }, { createdAt: "desc" }],
    take: 100,
  });
}

/**
 * Activate a pending skill.
 */
export async function activateSkill(userId: string, skillId: string) {
  const skill = await db.learnedSkill.findUnique({ where: { id: skillId } });
  if (!skill || skill.userId !== userId) {
    return null;
  }
  return db.learnedSkill.update({
    where: { id: skillId },
    data: { status: "active" },
  });
}

/**
 * Quarantine a skill.
 */
export async function quarantineSkill(userId: string, skillId: string) {
  const skill = await db.learnedSkill.findUnique({ where: { id: skillId } });
  if (!skill || skill.userId !== userId) {
    return null;
  }
  return db.learnedSkill.update({
    where: { id: skillId },
    data: { status: "quarantined" },
  });
}

/**
 * Find skills whose trigger phrases match a user message.
 * Used to inject relevant learned procedures into the chat context.
 */
export async function findMatchingSkills(userId: string, userMessage: string) {
  const allSkills = await getUserSkills(userId, "active");
  const lower = userMessage.toLowerCase();

  const matching = allSkills.filter((s) =>
    s.triggerPhrases.some((phrase) => lower.includes(phrase.toLowerCase()))
  );

  // Update use count
  for (const s of matching) {
    db.learnedSkill
      .update({
        where: { id: s.id },
        data: { useCount: { increment: 1 }, lastUsedAt: new Date() },
      })
      .catch(() => {});
  }

  return matching;
}
