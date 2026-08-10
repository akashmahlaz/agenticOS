// Knowledge sub-agent — RAG over the user's knowledge base
// Adds documents, searches the knowledge base, retrieves relevant context

import { createMinimax } from "vercel-minimax-ai-provider";
import { generateText, tool, zodSchema, stepCountIs } from "ai";
import { z } from "zod";
import type { SubAgentCallOptions, SubAgentResult } from "./types";
import {
  createDocument,
  searchDocuments,
  getDocuments,
  getDocument,
  deleteDocument,
} from "@/lib/rag/manager";

const minimax = (apiKey: string) => createMinimax({ apiKey });

const KNOWLEDGE_SYSTEM = `You are the Knowledge sub-agent inside agenticOS.

Your ONLY job is to manage the user's knowledge base. You are NOT the main agent. You receive a knowledge task (add, search, summarize, or curate), perform it, then return a concise result.

Tools you have:
- \`add_document(title, content, tags)\` — add a new document to the knowledge base
- \`search_knowledge(query, limit)\` — search the knowledge base for relevant docs
- \`list_documents()\` — list all documents
- \`get_document(id)\` — get full content of a specific document
- \`delete_document(id)\` — delete a document

Workflow:
1. **Search** the knowledge base first with \`search_knowledge\`.
2. **Read** the full content of relevant docs with \`get_document\`.
3. **Add** new documents with \`add_document\` (include relevant tags).
4. **Delete** outdated docs if explicitly asked.

Output rules:
- Lead with the most relevant finding.
- Cite document titles for any facts you surface.
- If no relevant documents found, say so.
- Be focused — return what the user asked for.

Return ONLY the result of your knowledge operation. Do not include meta-commentary.`;

export async function runKnowledge(
  opts: SubAgentCallOptions & { userId?: string }
): Promise<SubAgentResult> {
  const start = Date.now();
  const apiKey = process.env.MINIMAX_API_KEY;
  const userId = opts.userId || (opts as any).context?.userId;

  if (!apiKey) {
    return {
      agent: "researcher",
      task: opts.task,
      output: "",
      success: false,
      error: "MINIMAX_API_KEY not configured",
      durationMs: 0,
    };
  }

  if (!userId) {
    return {
      agent: "researcher",
      task: opts.task,
      output: "",
      success: false,
      error: "userId required for knowledge operations",
      durationMs: 0,
    };
  }

  opts.onProgress?.({ type: "started", message: `Knowledge task: ${opts.task}` });

  try {
    const result = await generateText({
      model: minimax(apiKey)(opts.model || "MiniMax-M2"),
      system: KNOWLEDGE_SYSTEM,
      prompt: opts.context
        ? `Task: ${opts.task}\n\nContext: ${opts.context}`
        : `Task: ${opts.task}`,
      stopWhen: stepCountIs(15), // Allow up to 15 tool-call steps
      tools: {
        add_document: tool({
          description: "Add a new document to the user's knowledge base.",
          inputSchema: zodSchema(
            z.object({
              title: z.string().describe("Document title"),
              content: z.string().describe("Full document content"),
              tags: z.array(z.string()).optional().describe("Optional tags for filtering"),
              source: z.string().optional().describe("Optional source URL or reference"),
            })
          ),
          execute: async ({ title, content, tags, source }) => {
            opts.onProgress?.({
              type: "tool-call",
              message: `Adding document: ${title}`,
              toolName: "add_document",
            });
            const doc = await createDocument({
              userId,
              title,
              content,
              tags,
              source,
              sourceType: source ? "url" : "manual",
            });
            opts.onProgress?.({
              type: "tool-result",
              message: `Added (${doc.content.length} chars)`,
              toolName: "add_document",
            });
            return { id: doc.id, title: doc.title, contentLength: doc.content.length };
          },
        }),

        search_knowledge: tool({
          description: "Search the knowledge base for documents relevant to a query.",
          inputSchema: zodSchema(
            z.object({
              query: z.string().describe("The search query"),
              limit: z.number().optional().describe("Max results (default 5)"),
            })
          ),
          execute: async ({ query, limit = 5 }) => {
            opts.onProgress?.({
              type: "tool-call",
              message: `Searching: ${query}`,
              toolName: "search_knowledge",
            });
            const results = await searchDocuments(userId, query, limit);
            opts.onProgress?.({
              type: "tool-result",
              message: `Found ${results.length} relevant docs`,
              toolName: "search_knowledge",
            });
            return {
              count: results.length,
              results: results.map((r) => ({
                id: r.id,
                title: r.title,
                score: r.score,
                snippet: r.snippet,
                tags: r.tags,
              })),
            };
          },
        }),

        list_documents: tool({
          description: "List all documents in the knowledge base.",
          inputSchema: zodSchema(z.object({})),
          execute: async () => {
            opts.onProgress?.({
              type: "tool-call",
              message: `Listing documents`,
              toolName: "list_documents",
            });
            const docs = await getDocuments(userId, 100);
            opts.onProgress?.({
              type: "tool-result",
              message: `${docs.length} documents`,
              toolName: "list_documents",
            });
            return {
              count: docs.length,
              documents: docs.map((d: any) => ({
                id: d.id,
                title: d.title,
                source: d.source,
                sourceType: d.sourceType,
                tags: d.tags,
                hasRealEmbedding: d.hasRealEmbedding,
                updatedAt: d.updatedAt,
              })),
            };
          },
        }),

        get_document: tool({
          description: "Get the full content of a specific document by ID.",
          inputSchema: zodSchema(
            z.object({ id: z.string().describe("Document ID") })
          ),
          execute: async ({ id }) => {
            opts.onProgress?.({
              type: "tool-call",
              message: `Fetching document ${id}`,
              toolName: "get_document",
            });
            const doc = await getDocument(id, userId);
            if (!doc) {
              return { found: false };
            }
            opts.onProgress?.({
              type: "tool-result",
              message: `Got ${doc.content.length} chars`,
              toolName: "get_document",
            });
            return {
              found: true,
              id: doc.id,
              title: doc.title,
              content: doc.content,
              source: doc.source,
              tags: doc.tags,
              updatedAt: doc.updatedAt,
            };
          },
        }),

        delete_document: tool({
          description: "Delete a document from the knowledge base.",
          inputSchema: zodSchema(
            z.object({ id: z.string().describe("Document ID to delete") })
          ),
          execute: async ({ id }) => {
            opts.onProgress?.({
              type: "tool-call",
              message: `Deleting document ${id}`,
              toolName: "delete_document",
            });
            try {
              await deleteDocument(id, userId);
              opts.onProgress?.({
                type: "tool-result",
                message: `Deleted`,
                toolName: "delete_document",
              });
              return { deleted: true, id };
            } catch (err) {
              opts.onProgress?.({
                type: "tool-result",
                message: `Failed: ${err}`,
                toolName: "delete_document",
              });
              return { deleted: false, error: String(err) };
            }
          },
        }),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const output = result.text || "No knowledge output produced.";
    opts.onProgress?.({ type: "done", message: "Knowledge operation complete" });

    return {
      agent: "researcher",
      task: opts.task,
      output,
      durationMs: Date.now() - start,
      success: true,
    };
  } catch (err) {
    return {
      agent: "researcher",
      task: opts.task,
      output: "",
      success: false,
      error: String(err),
      durationMs: Date.now() - start,
    };
  }
}
