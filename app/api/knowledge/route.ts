// /api/knowledge — list + create documents
// GET: list all documents for user
// POST: create a new document

import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth";
import { createDocument, getDocuments } from "@/lib/rag/manager";

export async function GET(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const documents = await getDocuments(userId, 100);
  return NextResponse.json({ documents });
}

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, content, source, sourceType, tags } = body;

  if (!title || !content) {
    return NextResponse.json({ error: "Title and content required" }, { status: 400 });
  }

  if (content.length > 100_000) {
    return NextResponse.json({ error: "Content too long (max 100KB)" }, { status: 400 });
  }

  try {
    const doc = await createDocument({
      userId,
      title,
      content,
      source,
      sourceType,
      tags: tags || [],
    });
    return NextResponse.json({ document: doc });
  } catch (err) {
    console.error("[knowledge] create failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
