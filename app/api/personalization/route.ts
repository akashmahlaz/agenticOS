// @ts-nocheck
// /api/personalization — get user profile, complete onboarding
// GET: profile entries + SOUL.md + IDENTITY.md
// POST: complete onboarding
// PUT: add/update profile directive

import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth";
import {
  getActiveProfile,
  addProfileEntry,
  isOnboarded,
  completeOnboarding,
  initUserProfile,
} from "@/lib/personalization/manager";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [profile, soul, identity, onboarded, recentSkills] = await Promise.all([
    getActiveProfile(userId),
    db.memoryFile.findUnique({ where: { userId_path: { userId, path: "SOUL.md" } } }),
    db.memoryFile.findUnique({ where: { userId_path: { userId, path: "IDENTITY.md" } } }),
    isOnboarded(userId),
    db.learnedSkill.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return NextResponse.json({
    profile,
    soul,
    identity,
    onboarded,
    recentSkills,
  });
}

export async function POST(req: Request) {
  // Complete onboarding with initial data
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, role, preferences } = body;

  // Initialize profile with initial data
  await initUserProfile(userId, {
    name,
    role,
    preferences,
  });

  // Mark onboarding as complete
  await completeOnboarding(userId);

  return NextResponse.json({ completed: true });
}

export async function PUT(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { directive, category, supersedeSimilar } = body;

  if (!directive) {
    return NextResponse.json({ error: "Directive required" }, { status: 400 });
  }

  const result = await addProfileEntry(userId, {
    directive,
    category: category || "preference",
    supersedeSimilar: supersedeSimilar !== false,
  });

  return NextResponse.json(result);
}
