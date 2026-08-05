// /api/dream — manual dream sweep trigger + diary retrieval
// GET: recent dream diary
// POST: run a dream sweep

import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth";
import { runDreamSweep, getDreamDiary } from "@/lib/personalization/dreaming";

export async function GET(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const diary = await getDreamDiary(userId, 50);
  return NextResponse.json({ diary });
}

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDreamSweep(userId);
    return NextResponse.json({
      light: { candidates: result.light.candidates.length },
      rem: { themes: result.rem.themes.length },
      deep: result.deep,
      date: result.date,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
