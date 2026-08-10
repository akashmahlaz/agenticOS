// Lead Generation sub-agent — finds professional contacts via RocketReach
// Uses the user's stored ROCKETREACH_API_KEY secret, with fallback to
// server-wide Vercel env var if no user secret is configured.
//
// INTELLIGENT CLIENT-FINDING (per proven B2B SaaS acquisition research):
//   - Target decision-makers (CTO, VP Eng, Founder, CEO) — not random people
//   - Use specific filters: current_title, current_employer, location, skills
//   - Multi-channel: RocketReach (email) + LinkedIn URL for outreach
//   - ABM-style: pick target companies, find contacts at those companies
//   - Enrichment: lookup full contact info for top prospects

import { generateText, tool, zodSchema, stepCountIs } from "ai";
import { z } from "zod";
import { createMinimax } from "vercel-minimax-ai-provider";
import {
  createRocketReach,
  type RocketReachProfile,
  type RocketReachCompany,
  type RocketReachQuery,
  type RocketReachCompanyQuery,
} from "@/lib/integrations/rocketreach";
import { resolveKeyWithSource } from "@/lib/integrations/keys";
import { parseLeadGenQuery } from "@/lib/agents/leadgen-query-parser";
import type { SubAgentCallOptions, SubAgentResult } from "./types";

const minimax = (apiKey: string) => createMinimax({ apiKey });

const LEADGEN_SYSTEM = `You are the Lead Generation sub-agent inside agenticOS.

Your ONLY job is to find professional contacts for B2B client acquisition.
You are NOT the main agent. You receive a lead-generation task and execute
searches via RocketReach's 700M+ professional database.

EXECUTE IMMEDIATELY. Do not say "I'll help you" or "Let me first". 
Begin by calling \`fetchApiKey\`, then \`searchPeople\` with the suggested
query. If results are sparse (fewer than 3 matches), progressively loosen
filters: drop company_size first, then company_industry, then location —
call \`searchPeople\` again after each loosening. After finding profiles,
call \`lookupContact\` for the top 1-3 to get full email/phone details.
Then format and return the final list.

## PROVEN CLIENT-FINDING STRATEGY (per B2B SaaS research)

1. **Target decision-makers, not random contacts**
   - Founders, CEOs, CTOs, VPs of Engineering, Marketing Directors
   - Use \`current_title\` facet with specific titles, NOT generic "manager"

2. **Use specific filters (NOT vague queries)**
   - \`current_title\`: ["CTO", "VP Engineering", "Head of Engineering"]
   - \`current_employer\`: ["Stripe", "Shopify", specific company names]
   - \`location\`: ["United States", "Germany", "San Francisco"]
   - \`skills\`: ["React", "Next.js", "TypeScript"] (for tech targets)
   - \`management_levels\`: ["cxo", "vp", "director"]
   - \`company_size\`: ["10-200", "200-1000", "1000+"]
   - \`company_industry\`: ["Computer Software", "Internet", "AI"]

3. **Multi-channel approach** (287% better than single-channel per Martal)
   - Each contact MUST include LinkedIn URL for outreach
   - Each contact with email = 5x more likely to convert
   - Provide enough info for personalized cold email/LinkedIn message

4. **ABM (Account-Based Marketing) for high-value targets**
   - First: \`searchCompanies\` to find target companies
   - Then: \`searchPeople\` to find decision-makers at those companies
   - Then: \`lookupContact\` to get full contact info

5. **Always provide context for outreach**
   - For each contact, include: name, title, company, location
   - Top email (or "no email — use LinkedIn")
   - LinkedIn URL (required for omnichannel)
   - 1-line observation that can open a personalized message

## WORKFLOW

1. Call \`fetchApiKey\`.
2. Call \`searchPeople\` with the suggested query.
3. If < 3 results, refine and search again.
4. Call \`lookupContact\` for the top 1-3 profiles to get email/phone.
5. Return the formatted list.

## OUTPUT FORMAT

For each contact, return:
- **Name** + **Title** at **Company** (Location)
- 📧 email (or "no email — use LinkedIn")
- 💼 LinkedIn: [url]
- 🎯 1-line personalization hook (recent post, hiring signal, etc.)

Lead with the total count. Skip contacts with no name. Cap at 15 per query.
Return ONLY the contact list. No preamble, no "I'll help you".`;

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
    // Pre-parse the task into a structured RocketReach query
    // so the model has a starting point (saves time + reduces errors)
    const parsedQuery = parseLeadGenQuery(opts.task);

    const result = await generateText({
      model: minimax(apiKey)(opts.model || "MiniMax-M2"),
      system: LEADGEN_SYSTEM,
      prompt: opts.context
        ? `Task: ${opts.task}\n\nContext: ${opts.context}\n\nSuggested query (refine as needed):\n${JSON.stringify(parsedQuery, null, 2)}`
        : `Task: ${opts.task}\n\nSuggested query (refine as needed):\n${JSON.stringify(parsedQuery, null, 2)}`,
      stopWhen: stepCountIs(15), // Allow fetchApiKey → searchPeople → searchPeople → lookupContact → format
      tools: {
        fetchApiKey: tool({
          description: "Fetch the user's stored ROCKETREACH_API_KEY secret.",
          inputSchema: zodSchema(z.object({})),
          execute: async () => {
            const key = await resolveKeyWithSource(userId, "ROCKETREACH_API_KEY");
            if (!key) {
              return {
                found: false,
                message:
                  "No ROCKETREACH_API_KEY configured. Add it via /setup (per-user) or as a Vercel env var (server-wide).",
              };
            }
            return { found: true, key: key.value, source: key.source };
          },
        }),

        searchPeople: tool({
          description:
            "Search RocketReach for people. Pass a structured query dict with facets like current_title, current_employer, location, skills, etc. Returns up to 25 summaries per call (no contact info — use lookupContact for that).",
          inputSchema: zodSchema(
            z.object({
              query: z
                .object({
                  name: z.array(z.string()).optional(),
                  current_title: z.array(z.string()).optional(),
                  previous_title: z.array(z.string()).optional(),
                  current_employer: z.array(z.string()).optional(),
                  previous_employer: z.array(z.string()).optional(),
                  department: z.array(z.string()).optional(),
                  management_levels: z
                    .array(z.enum(["cxo", "vp", "director", "manager", "non_manager"]))
                    .optional(),
                  years_experience: z.array(z.string()).optional(),
                  job_change_signal: z.array(z.string()).optional(),
                  skills: z.array(z.string()).optional(),
                  all_skills: z.array(z.string()).optional(),
                  location: z.array(z.string()).optional(),
                  country: z.array(z.string()).optional(),
                  state: z.array(z.string()).optional(),
                  city: z.array(z.string()).optional(),
                  company_size: z.array(z.string()).optional(),
                  company_revenue: z.array(z.string()).optional(),
                  company_industry: z.array(z.string()).optional(),
                  company_domain: z.array(z.string()).optional(),
                  company_intent: z.array(z.string()).optional(),
                  company_news_signal: z.array(z.string()).optional(),
                  company_job_posting_signal: z.array(z.string()).optional(),
                  keyword: z.array(z.string()).optional(),
                })
                .describe(
                  "Structured query with RocketReach facets. Each value is an array of strings."
                ),
              page_size: z.number().optional().describe("Max 25"),
            })
          ),
          execute: async ({ query, page_size = 10 }) => {
            const summary = describeQuery(query);
            opts.onProgress?.({
              type: "tool-call",
              message: `Searching people: ${summary}`,
              toolName: "searchPeople",
            });
            const key = await resolveKeyWithSource(userId, "ROCKETREACH_API_KEY");
            if (!key) {
              return { error: "No ROCKETREACH_API_KEY configured" };
            }
            const rr = createRocketReach(key.value);
            try {
              const result = await rr.searchPeople({ query, page_size });
              opts.onProgress?.({
                type: "tool-result",
                message: `Found ${result.total} matches, ${result.profiles.length} returned`,
                toolName: "searchPeople",
              });
              return result;
            } catch (err) {
              opts.onProgress?.({
                type: "error",
                message: `Search failed: ${(err as Error).message}`,
                toolName: "searchPeople",
              });
              return { error: (err as Error).message };
            }
          },
        }),

        searchCompanies: tool({
          description:
            "Search RocketReach for companies by industry, employee count, location, etc. Use this for ABM — pick target companies, then find decision-makers at them.",
          inputSchema: zodSchema(
            z.object({
              query: z
                .object({
                  name: z.array(z.string()).optional(),
                  domain: z.array(z.string()).optional(),
                  industry: z.array(z.string()).optional(),
                  primary_industry: z.array(z.string()).optional(),
                  employees: z.array(z.string()).optional(),
                  revenue: z.array(z.string()).optional(),
                  total_funding: z.array(z.string()).optional(),
                  location: z.array(z.string()).optional(),
                  country: z.array(z.string()).optional(),
                  keyword: z.array(z.string()).optional(),
                })
                .describe("Structured company query with facets."),
              page_size: z.number().optional(),
            })
          ),
          execute: async ({ query, page_size = 10 }) => {
            const summary = describeCompanyQuery(query);
            opts.onProgress?.({
              type: "tool-call",
              message: `Searching companies: ${summary}`,
              toolName: "searchCompanies",
            });
            const key = await resolveKeyWithSource(userId, "ROCKETREACH_API_KEY");
            if (!key) return { error: "No ROCKETREACH_API_KEY configured" };
            const rr = createRocketReach(key.value);
            try {
              const result = await rr.searchCompanies({ query, page_size });
              opts.onProgress?.({
                type: "tool-result",
                message: `Found ${result.total} companies, ${result.companies.length} returned`,
                toolName: "searchCompanies",
              });
              return result;
            } catch (err) {
              opts.onProgress?.({
                type: "error",
                message: `Search failed: ${(err as Error).message}`,
                toolName: "searchCompanies",
              });
              return { error: (err as Error).message };
            }
          },
        }),

        lookupContact: tool({
          description:
            "Look up full contact info (email, phone) for a specific person. Provide one of: id (RocketReach profile ID), email, linkedin_url, or name+current_employer. Costs credits.",
          inputSchema: zodSchema(
            z.object({
              id: z.union([z.string(), z.number()]).optional(),
              email: z.string().optional(),
              linkedin_url: z.string().optional(),
              name: z.string().optional(),
              current_employer: z.string().optional(),
            })
          ),
          execute: async (input) => {
            const ident = input.email || input.linkedin_url || input.name || input.id;
            opts.onProgress?.({
              type: "tool-call",
              message: `Looking up contact: ${ident}`,
              toolName: "lookupContact",
            });
            const key = await resolveKeyWithSource(userId, "ROCKETREACH_API_KEY");
            if (!key) return { error: "No ROCKETREACH_API_KEY configured" };
            const rr = createRocketReach(key.value);
            try {
              let profile: RocketReachProfile | null = null;
              if (input.id) profile = await rr.lookupById(input.id);
              else if (input.email) profile = await rr.lookupByEmail(input.email);
              else if (input.linkedin_url)
                profile = await rr.lookupByLinkedIn(input.linkedin_url);
              else if (input.name && input.current_employer) {
                profile = await rr.lookupById(input.name);
              }
              if (!profile) {
                return { error: "Contact not found" };
              }
              opts.onProgress?.({
                type: "tool-result",
                message: `Found: ${profile.name} (${profile.emails.length} emails)`,
                toolName: "lookupContact",
              });
              return profile;
            } catch (err) {
              opts.onProgress?.({
                type: "error",
                message: `Lookup failed: ${(err as Error).message}`,
                toolName: "lookupContact",
              });
              return { error: (err as Error).message };
            }
          },
        }),

        lookupCompany: tool({
          description:
            "Get full firmographic data for a company (industry, employees, revenue, tech stack, social).",
          inputSchema: zodSchema(
            z.object({
              id: z.union([z.string(), z.number()]).optional(),
              domain: z.string().optional(),
              name: z.string().optional(),
            })
          ),
          execute: async (input) => {
            const ident = input.domain || input.name || input.id;
            opts.onProgress?.({
              type: "tool-call",
              message: `Looking up company: ${ident}`,
              toolName: "lookupCompany",
            });
            const key = await resolveKeyWithSource(userId, "ROCKETREACH_API_KEY");
            if (!key) return { error: "No ROCKETREACH_API_KEY configured" };
            const rr = createRocketReach(key.value);
            try {
              const company = await rr.lookupCompany(input);
              if (!company) return { error: "Company not found" };
              opts.onProgress?.({
                type: "tool-result",
                message: `Found: ${company.name} (${company.employees} employees)`,
                toolName: "lookupCompany",
              });
              return company;
            } catch (err) {
              return { error: (err as Error).message };
            }
          },
        }),
      },
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

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

function describeQuery(q: RocketReachQuery): string {
  const parts: string[] = [];
  if (q.current_title?.length) parts.push(`titles: ${q.current_title.join(", ")}`);
  if (q.current_employer?.length)
    parts.push(`at: ${q.current_employer.join(", ")}`);
  if (q.location?.length) parts.push(`in: ${q.location.join(", ")}`);
  if (q.skills?.length) parts.push(`skills: ${q.skills.join(", ")}`);
  if (q.management_levels?.length)
    parts.push(`levels: ${q.management_levels.join(", ")}`);
  if (q.company_industry?.length)
    parts.push(`industry: ${q.company_industry.join(", ")}`);
  if (q.company_size?.length)
    parts.push(`company size: ${q.company_size.join(", ")}`);
  if (q.keyword?.length) parts.push(`keyword: ${q.keyword.join(", ")}`);
  return parts.join(" | ") || "any";
}

function describeCompanyQuery(q: RocketReachCompanyQuery): string {
  const parts: string[] = [];
  if (q.industry?.length) parts.push(`industry: ${q.industry.join(", ")}`);
  if (q.employees?.length) parts.push(`employees: ${q.employees.join(", ")}`);
  if (q.location?.length) parts.push(`in: ${q.location.join(", ")}`);
  if (q.keyword?.length) parts.push(`keyword: ${q.keyword.join(", ")}`);
  return parts.join(" | ") || "any";
}
