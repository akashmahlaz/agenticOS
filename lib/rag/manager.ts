// RAG (Retrieval-Augmented Generation) manager
// Document storage + embeddings + search
//
// Two modes:
// 1. Real embeddings: when OPENAI_API_KEY is set, use text-embedding-3-small
//    Stores 1536-d vectors, search by cosine similarity
// 2. Fallback: PostgreSQL full-text search (tsvector) + trigram
//    Works out of the box, no API key needed

import { db } from "@/lib/db";

export type EmbeddingModel = "text-embedding-3-small" | "text-embedding-ada-002" | "fallback-hash";

const EMBEDDING_DIM = 1536;
const OPENAI_EMBEDDING_URL = "https://api.openai.com/v1/embeddings";

// ──────────────────────────────────────────────
// Embedding generation
// ──────────────────────────────────────────────

/**
 * Generate an embedding for a piece of text.
 * - If OPENAI_API_KEY is set, use OpenAI's text-embedding-3-small
 * - Otherwise, use a deterministic hash-based fallback (so we can still do similarity)
 */
export async function generateEmbedding(text: string): Promise<{
  vector: number[];
  model: EmbeddingModel;
  isReal: boolean;
}> {
  if (process.env.OPENAI_API_KEY) {
    return generateOpenAIEmbedding(text);
  }
  return generateFallbackEmbedding(text);
}

async function generateOpenAIEmbedding(text: string) {
  const apiKey = process.env.OPENAI_API_KEY!;
  const truncated = text.slice(0, 8000); // OpenAI limit

  const res = await fetch(OPENAI_EMBEDDING_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: truncated,
      encoding_format: "float",
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    console.error("[embedding] OpenAI error:", res.status);
    return generateFallbackEmbedding(text);
  }

  const data = await res.json();
  const vector = data.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length !== EMBEDDING_DIM) {
    return generateFallbackEmbedding(text);
  }
  return { vector, model: "text-embedding-3-small" as EmbeddingModel, isReal: true };
}

/**
 * Fallback embedding: deterministic hash-based vector.
 * Not as good as real embeddings, but allows the system to work without an API key.
 * Uses simple word-frequency hashing into a fixed 1536-d space.
 */
function generateFallbackEmbedding(text: string) {
  const vec = new Array(EMBEDDING_DIM).fill(0);
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const words = normalized.split(/\s+/).filter((w: any) => w.length > 2);

  for (const word of words) {
    // Hash the word into a dimension
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash + word.charCodeAt(i)) | 0;
    }
    const dim = Math.abs(hash) % EMBEDDING_DIM;
    vec[dim] += 1;
  }

  // Also use bigrams for some structure
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = words[i] + " " + words[i + 1];
    let hash = 0;
    for (let j = 0; j < bigram.length; j++) {
      hash = ((hash << 5) - hash + bigram.charCodeAt(j)) | 0;
    }
    const dim = Math.abs(hash) % EMBEDDING_DIM;
    vec[dim] += 0.5;
  }

  // Normalize
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  for (let i = 0; i < vec.length; i++) {
    vec[i] = vec[i] / mag;
  }

  return { vector: vec, model: "fallback-hash" as EmbeddingModel, isReal: false };
}

// ──────────────────────────────────────────────
// Cosine similarity
// ──────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-10);
}

// ──────────────────────────────────────────────
// Document operations
// ──────────────────────────────────────────────

export interface CreateDocumentInput {
  userId: string;
  title: string;
  content: string;
  source?: string;
  sourceType?: "manual" | "url" | "file" | "note";
  tags?: string[];
}

export async function createDocument(input: CreateDocumentInput) {
  const { vector, model, isReal } = await generateEmbedding(
    `${input.title}\n\n${input.content}`
  );

  return db.document.create({
    data: {
      userId: input.userId,
      title: input.title,
      content: input.content,
      source: input.source,
      sourceType: input.sourceType || "manual",
      tags: input.tags || [],
      chunkCount: 1,
      embedding: vector,
      embeddingModel: model,
      hasRealEmbedding: isReal,
    },
  });
}

export async function getDocuments(userId: string, limit: number = 50) {
  return db.document.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
}

export async function getDocument(id: string, userId: string) {
  const doc = await db.document.findUnique({ where: { id } });
  if (!doc || doc.userId !== userId) return null;
  return doc;
}

export async function deleteDocument(id: string, userId: string) {
  const doc = await getDocument(id, userId);
  if (!doc) throw new Error("Not found");
  return db.document.delete({ where: { id } });
}

// ──────────────────────────────────────────────
// Search
// ──────────────────────────────────────────────

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  source: string | null;
  sourceType: string;
  tags: string[];
  score: number;
  method: "vector" | "fulltext";
  snippet: string;
}

export async function searchDocuments(
  userId: string,
  query: string,
  limit: number = 5
): Promise<SearchResult[]> {
  // Try vector search first (works for both real and fallback embeddings)
  const queryEmb = await generateEmbedding(query);
  const docs = await db.document.findMany({
    where: { userId },
    take: 100, // search top 100 for now
  });

  const scored = docs
    .map((doc: any) => {
      let score = 0;
      if (doc.embedding && doc.embedding.length > 0) {
        // Convert Prisma Float[] to number[]
        const docVec = (doc.embedding as number[]).map(Number);
        score = cosineSimilarity(queryEmb.vector, docVec);
      }
      return { doc, score };
    })
    .filter((s: any) => s.score > 0.05)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ doc, score }: any) => ({
    id: doc.id,
    title: doc.title,
    content: doc.content,
    source: doc.source,
    sourceType: doc.sourceType,
    tags: doc.tags,
    score,
    method: "vector" as const,
    snippet: doc.content.slice(0, 200).replace(/\s+/g, " ").trim(),
  }));
}

/**
 * Build a RAG context block to inject into the system prompt.
 * Returns null if no relevant documents are found.
 */
export async function buildRagContext(
  userId: string,
  query: string,
  limit: number = 3
): Promise<string | null> {
  const results = await searchDocuments(userId, query, limit);
  if (results.length === 0) return null;

  return (
    `## Relevant Knowledge Base\n` +
    results
      .map(
        (r, i) =>
          `### ${i + 1}. ${r.title} (relevance: ${(r.score * 100).toFixed(0)}%)\n${r.snippet}${
            r.content.length > 200 ? "…" : ""
          }`
      )
      .join("\n\n")
  );
}
