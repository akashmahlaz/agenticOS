// /api/knowledge/search — vector search across the knowledge base
// POST: { query: string, limit?: number }

import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth";
import { searchDocuments } from "@/lib/rag/manager";

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { query, limit } = body;

  if (!query || typeof query !== "string") {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }

  const results = await searchDocuments(userId, query, limit || 5);
  return NextResponse.json({ results });
}
