// Lead Generation sub-agent — finds professional contacts via RocketReach
// Uses the user's stored ROCKETREACH_API_KEY secret, with fallback to
// server-wide Vercel env var if no user secret is configured.

import { generateText, tool, zodSchema } from "ai";
import { z } from "zod";
import { createMinimax } from "vercel-minimax-ai-provider";
import { createRocketReach, type RocketReachProfile } from "@/lib/integrations/rocketreach";
import { resolveKeyWithSource } from "@/lib/integrations/keys";
import type { SubAgentCallOptions, SubAgentResult } from "./types";

const minimax = (apiKey: string) => createMinimax({ apiKey });

const LEADGEN_SYSTEM = `You are the Lead Generation sub-agent inside agenticOS.

Your ONLY job is to find professional contacts using RocketReach. You are NOT the main agent. You receive a lead-generation task (e.g. "find CTOs at SaaS startups in Germany"), execute searches, and return a focused list of qualified contacts.

Workflow:
1. **Fetch the API key** with \`fetchApiKey\` (system secret "ROCKETREACH_API_KEY").
2. **Parse the request** into one or more focused search queries. Use specific terms: "CTO SaaS Germany", "VP Engineering fintech London", etc.
3. **Run searches** with \`searchContacts\` (returns up to 10 per call). Do 2-3 parallel searches with different angles to maximize coverage.
4. **Enrich top results** with \`lookupContact\` if you need more details on a specific person.
5. **Score and filter**: return the most relevant contacts. If a contact has email/phone, they're more valuable.
6. **Format your output** as a clear, scannable list.

Output rules:
- Lead with the total count and target profile (e.g. "Found 24 CTOs at SaaS startups in Germany").
- For each contact, include: name, title, company, location, top email (or "no email"), LinkedIn URL.
- Rank by relevance — most relevant first.
- Skip contacts with no name or no useful info.
- If a search returns 0 results, try a broader query (e.g. drop the company filter).
- Never return more than 25 contacts — curate the best.

Return ONLY the contact list. Do not include meta-commentary.`;

export async function runLeadGen(
  opts: SubAgentCallOptions & { userId?: string }
): Promise<SubAgentResult> {
  const start = Date.now();
  const apiKey = process.env.MINIMAX_API_KEY;
  const userId = opts.userId || (opts as any).context?.userId;

  if (!apiKey) {
    return {
      agent: "leadgen",
      task: opts.task,
      output: "",
      success: false,
      error: "MINIMAX_API_KEY not configured",
      durationMs: 0,
    };
  }
  if (!userId) {
    return {
      agent: "leadgen",
      task: opts.task,
      output: "",
      success: false,
      error: "userId required",
      durationMs: 0,
    };
  }

  opts.onProgress?.({ type: "started", message: `Lead gen: ${opts.task}` });

  try {
    const result = await generateText({
      model: minimax(apiKey)(opts.model || "MiniMax-M2"),
      system: LEADGEN_SYSTEM,
      prompt: opts.context
        ? `Task: ${opts.task}\n\nContext: ${opts.context}`
        : `Task: ${opts.task}`,
      tools: {
        fetchApiKey: tool({
          description: "Fetch the user's stored ROCKETREACH_API_KEY secret.",
          inputSchema: zodSchema(z.object({})),
          execute: async () => {
            const key = await resolveKeyWithSource(userId, "ROCKETREACH_API_KEY");
            if (!key) {
              return { found: false, message: "No ROCKETREACH_API_KEY configured. Add it via /secrets (per-user) or as a Vercel env var (server-wide)." };
            }
            return { found: true, key: key.value, source: key.source };
          },
        }),

        searchContacts: tool({
          description:
            "Search RocketReach for people matching the query. Returns up to 10 profiles per call.",
          inputSchema: zodSchema(
            z.object({
              query: z.string().describe(
                "Search query like 'CTO SaaS Germany' or 'VP Engineering fintech London'. Be specific."
              ),
              page_size: z.number().optional().describe("Max results (default 10, max 25)"),
            })
          ),
          execute: async ({ query, page_size = 10 }) => {
            opts.onProgress?.({
              type: "tool-call",
              message: `Searching RocketReach: ${query}`,
              toolName: "searchContacts",
            });
            const key = await resolveKeyWithSource(userId, "ROCKETREACH_API_KEY");
            if (!key) {
              return { error: "No ROCKETREACH_API_KEY configured" };
            }
            const rr = createRocketReach(key.value);
            try {
              const result = await rr.search({ query, page_size });
              opts.onProgress?.({
                type: "tool-result",
                message: `Found ${result.profiles.length} contacts`,
                toolName: "searchContacts",
              });
              return result;
            } catch (err) {
              opts.onProgress?.({
                type: "error",
                message: `Search failed: ${(err as Error).message}`,
                toolName: "searchContacts",
              });
              return { error: (err as Error).message };
            }
          },
        }),

        lookupContact: tool({
          description: "Look up a specific contact by email, LinkedIn URL, or name+company to get full details.",
          inputSchema: zodSchema(
            z.object({
              email: z.string().optional(),
              linkedin_url: z.string().optional(),
              name: z.string().optional(),
              company: z.string().optional(),
            })
          ),
          execute: async (input) => {
            opts.onProgress?.({
              type: "tool-call",
              message: `Looking up contact: ${input.email || input.linkedin_url || input.name}`,
              toolName: "lookupContact",
            });
            const key = await resolveKeyWithSource(userId, "ROCKETREACH_API_KEY");
            if (!key) return { error: "No ROCKETREACH_API_KEY configured" };
            const rr = createRocketReach(key.value);
            try {
              let profile: RocketReachProfile | null = null;
              if (input.email) profile = await rr.lookupByEmail(input.email);
              else if (input.linkedin_url) profile = await rr.lookupByLinkedIn(input.linkedin_url);
              else if (input.name) {
                profile = await rr.enrichContact({
                  name: input.name,
                  company: input.company,
                });
              }
              opts.onProgress?.({
                type: "tool-result",
                message: profile ? `Found ${profile.name}` : "Not found",
                toolName: "lookupContact",
              });
              return profile || { error: "Contact not found" };
            } catch (err) {
              return { error: (err as Error).message };
            }
          },
        }),
      },
    });

    opts.onProgress?.({
      type: "done",
      message: "Lead generation complete",
      result: result.text,
    });

    return {
      agent: "leadgen",
      task: opts.task,
      output: result.text,
      success: true,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      agent: "leadgen",
      task: opts.task,
      output: "",
      success: false,
      error: (err as Error).message,
      durationMs: Date.now() - start,
    };
  }
}
