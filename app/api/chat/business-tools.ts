// Business Strategy tools — encode the 7-strategy client-acquisition playbook
// as executable actions the main agent can call.
//
// Each tool follows the REPLY framework (50-125 words where applicable) and
// uses Hormozi's value equation, Clay's enrichment waterfall, and signal-based
// outbound timing from the Master Playbook.

import { tool, zodSchema, type Tool } from "ai";
import { z } from "zod";

// ────────────────────────────────────────────────────────────────────────
// buildIcpProfile — Define Ideal Customer Profile / Starving Crowd
// Per Hormozi: specific role, specific company, specific pain, easy to find
// ────────────────────────────────────────────────────────────────────────

export const buildIcpProfileTool: Tool = tool({
  description:
    "Build a complete Ideal Customer Profile (ICP) / 'Starving Crowd' using Hormozi's framework. The 4 tests: (1) massive pain, (2) purchasing power, (3) easy targeting, (4) growth market. Returns a profile with role, company type, dream outcome, top 3 pains, current workarounds, trigger events, watering holes, and search queries for finding them.",
  inputSchema: zodSchema(
    z.object({
      product: z.string().describe("What you're selling (1 sentence)"),
      targetMarket: z
        .string()
        .describe("Who you think it's for (initial guess)"),
    })
  ),
  execute: async (input: { product: string; targetMarket: string }) => {
    // Generate the ICP framework with both fixed structure and prompt engineering hints
    return {
      product: input.product,
      targetMarket: input.targetMarket,
      framework: "STARVING_CROWD_4_TESTS",
      tests: {
        massive_pain:
          "Would they spend $500+ TODAY to fix this? If not, the pain isn't big enough. Sharpen the dream outcome.",
        purchasing_power:
          "Do they have budget or can they get it? Target roles with authority: CXO, VP, Director, Head of [X].",
        easy_targeting:
          "Can you find 1,000 of them in a database or community? Need a clear company size, industry, and geography.",
        growth_market:
          "Is this market growing, flat, or shrinking? Pick growing markets — easier to win.",
      },
      template: {
        who: "[Specific job title] at [specific company type] of [size range]",
        dream_outcome: "[In their words, not yours — what does success look like?]",
        top_3_pains: [
          "Pain 1 — keeps them up at night",
          "Pain 2 — costs them money or time",
          "Pain 3 — embarrassing or risky to ignore",
        ],
        current_workarounds:
          "What are they using TODAY? Spreadsheets, manual processes, cobbled scripts, agencies, freelancers.",
        trigger_events: [
          "Funded (raise announcement)",
          "Hired for the role that needs your product (e.g., new VP Eng)",
          "Problem got worse (lost customer, breach, lawsuit)",
          "Switched from competitor (negative review, exec change)",
        ],
        watering_holes: {
          reddit: [
            "r/[niche1]",
            "r/[niche2]",
            "r/[problem-they-have]",
          ],
          linkedin: "[specific LinkedIn groups they post in]",
          slack_discord: "[community names]",
          podcasts: "[shows they listen to]",
          newsletters: "[newsletters they read]",
        },
        search_queries: [
          '"struggling with [their problem]" site:reddit.com',
          '"recommend a tool for [their use case]"',
          '"looking for [solution category]"',
          '"frustrated with [competitor]"',
          '"switched from [competitor] because"',
        ],
      },
      sources: ["r/Entrepreneur, r/SaaS, r/sales — 4 patterns killing B2B pipelines (2026)"],
    };
  },
});

// ────────────────────────────────────────────────────────────────────────
// craftColdEmail — REPLY framework, 50-125 words, 4-7 touch sequence
// Per Firstsales.io 2026: 5-10% reply is good, 15-25% is great
// ────────────────────────────────────────────────────────────────────────

export const craftColdEmailTool: Tool = tool({
  description:
    "Craft a cold email using the REPLY framework: Relevance trigger (line 1, about THEM not you) + Empathy (their specific pain) + Proof (one specific result) + Low-friction ask (not a 30-min call) + Your signature. 50-125 words. Subject line 'Hi {{first_name}}' has 45% open rate. Returns subject + body + 4-7 follow-up touches.",
  inputSchema: zodSchema(
    z.object({
      recipientName: z.string().describe("Their first name"),
      recipientCompany: z.string().describe("Their company name"),
      recipientRole: z.string().describe("Their job title"),
      product: z.string().describe("What you sell (1 sentence)"),
      painPoint: z.string().describe("Their specific pain (1 sentence)"),
      signalOrHook: z
        .string()
        .describe("What's the relevance trigger? Funding, hire, post, etc."),
      proof: z
        .string()
        .describe("One specific result for a similar company ('We helped X do Y in Z weeks')"),
    })
  ),
  execute: async (input) => {
    const body = `Hi ${input.recipientName},

${input.signalOrHook}.

${input.recipientCompany} seems to be tackling ${input.painPoint} — and the approach most teams take tends to break down at the part that actually moves the needle.

We built ${input.product} specifically for that.
${input.proof}.

Worth a quick look?`;

    return {
      subject: `Hi ${input.recipientName}`,
      body,
      word_count: body.split(/\s+/).length,
      framework: "REPLY",
      follow_up_sequence: [
        {
          day: 3,
          subject: "re: " + `Hi ${input.recipientName}`.toLowerCase(),
          body: `Hi ${input.recipientName} — sent this last week. Worth a 60-second look? If not the right person, who would you point me to?`,
        },
        {
          day: 7,
          subject: `${input.recipientCompany} + ${input.product.split(" ")[0]}`,
          body: `Hi ${input.recipientName} — bumping this once. Saw that ${input.signalOrHook.toLowerCase()}. If timing is off, just say so and I'll circle back next quarter.`,
        },
        {
          day: 14,
          subject: `closing the loop`,
          body: `Hi ${input.recipientName} — last note from me. If ${input.painPoint.toLowerCase()} isn't a priority right now, totally fine. If it is, I have one case study that would change your mind. Reply "show me" and I'll send it.`,
        },
      ],
      tips: [
        "Plain text only — no images, no attachments, no HTML",
        "Lowercase subject line signals casual, personal communication",
        "Send between Tue-Thu, 9-11am recipient's timezone",
        "If <2% reply, your relevance trigger is weak — try a different signal",
        "If 2-5% reply, you have a list-quality problem, not a copy problem",
        "If 5-10%, scaling is the next step",
        "If 15%+, you found a wedge — protect it with case studies",
      ],
      expected_replies: "3.4-8.5% average; 15-25% top performers",
    };
  },
});

// ────────────────────────────────────────────────────────────────────────
// craftLinkedInMessage — PAIPS formula, connection note + DM
// Per Prospeo + LinkedIn Top Voices research
// ────────────────────────────────────────────────────────────────────────

export const craftLinkedInMessageTool: Tool = tool({
  description:
    "Craft a LinkedIn connection request (300 char limit) + follow-up DM using the PAIPS formula (Pain → Agitate → Intrigue → Positive future → Solution). For signal-based outreach (job change, funding), warm-up the connection with engagement first, then send message 14-21 days after the trigger event.",
  inputSchema: zodSchema(
    z.object({
      recipientName: z.string(),
      recipientRole: z.string(),
      signalOrTrigger: z.string(),
      product: z.string(),
      proof: z.string().optional(),
    })
  ),
  execute: async (input) => {
    return {
      phase_0_warmup: [
        "Day -7 to -1: Like and comment on 2-3 of their posts (add value, not 'Great post!')",
        "Day 0: Send connection request with personalized note (300 chars max)",
        "Day 1-7: Like 1-2 of their posts before DM",
      ],
      connection_request: {
        max_chars: 300,
        body: `Hi ${input.recipientName} — saw ${input.signalOrTrigger}. As a [their role] at [company], that's a fascinating moment. I work on ${input.product} — would love to connect and learn from your experience.`,
      },
      first_dm: {
        timing: "Day 3-7 after they accept (not immediately)",
        body: `Thanks for connecting, ${input.recipientName}.

${input.signalOrTrigger} caught my eye because it usually creates a specific bottleneck — [name 1 problem related to the trigger].

We work on ${input.product} with [similar companies]. ${input.proof || "Happy to share what worked if useful."}

Worth a 15-min call next week?`,
      },
      paips_breakdown: {
        P_pain: `${input.signalOrTrigger} creates a specific operational pain`,
        A_agitate: "Most teams underestimate how much that pain compounds over 6-12 months",
        I_intrigue: "There's a faster path most [their role] don't see until they talk to peers",
        P_positive_future: "Solving it in 30-90 days changes your Q2/Q3 numbers",
        S_solution: `${input.product} + our process`,
      },
      follow_up_if_no_reply: [
        "Day 14: Share a relevant article (not your own) — 'thought of you when I saw this'",
        "Day 30: Mention a relevant trigger event 'Saw [X] — curious if that's changing your priorities'",
        "Day 60: One final note 'Closing the loop — not going to keep bumping your inbox'",
      ],
      mistakes_to_avoid: [
        "Sending the pitch in the connection request (instant ignore)",
        "DMing within 1 hour of accept (feels transactional)",
        "Long DM (over 500 words) — they won't read it",
        "Not warming up before connecting (looks like a cold spam pattern)",
        "Generic 'I'd love to learn more about your business' — they hear this 50x a week",
      ],
    };
  },
});

// ────────────────────────────────────────────────────────────────────────
// buildPricingTiers — 3-tier (Good/Better/Best), value-anchored
// Per Hormozi $100M Offers + solopreneur pricing research
// ────────────────────────────────────────────────────────────────────────

export const buildPricingTiersTool: Tool = tool({
  description:
    "Build 3-tier pricing (Good/Better/Best) using Hormozi's value equation: Value = (Dream Outcome × Perceived Likelihood) / (Time Delay × Effort). Price at 10-20% of projected value. The 'Best' tier exists to anchor 'Better' as reasonable — not to sell often. Returns the 3 tiers with price, scope, and value-justification math.",
  inputSchema: zodSchema(
    z.object({
      service: z.string().describe("What you sell"),
      projectedValueMonthly: z
        .number()
        .describe("Monthly value you create for the client in dollars (e.g. 50000 for $50K extra revenue/mo)"),
      targetPrice: z.number().describe("Your target monthly retainer in dollars"),
    })
  ),
  execute: async (input) => {
    const value = input.projectedValueMonthly;
    const target = input.targetPrice;
    const anchor = Math.round(value * 0.25); // 25% of value (high anchor)
    const better = target; // 10-20% of value
    const good = Math.round(target * 0.55); // ~55% of target

    return {
      formula: "Price at 10-20% of projected value (or 4-8% of annual value)",
      anchor_tactic:
        "Always quote 3 prices. The 'Best' tier exists to make 'Better' feel like a steal — not to sell often. 60-70% of clients should land on Better.",
      good_tier: {
        price: good,
        name: `${input.service} — Starter`,
        positioning: "Stripped offer, priced to make Better look smart",
        scope: [
          "1 core deliverable",
          "Self-serve or limited hand-holding",
          "Email support, 48h response",
          "30-day cancellation",
        ],
        value_justification: `Pays for itself if you save 5 hours/month. ${good < value * 0.1 ? "Underpriced — raise to " + Math.round(value * 0.1) : "Right zone."}`,
      },
      better_tier: {
        price: better,
        name: `${input.service} — Growth`,
        positioning: "Your real target. 60-70% of clients land here.",
        scope: [
          "Everything in Starter",
          "2-3 additional deliverables",
          "Weekly check-in call",
          "Priority support, 4h response",
          "Quarterly business review",
          "Performance report",
        ],
        value_justification: `Charging ${better}/mo against ${value}/mo value = ${Math.round((value / better) * 10) / 10}x ROI for client. ${better < value * 0.15 ? "Could push to " + Math.round(value * 0.18) : "Healthy pricing."}`,
      },
      best_tier: {
        price: anchor,
        name: `${input.service} — Premium`,
        positioning: "Anchor tier. Priced high on purpose so 'Better' feels reasonable.",
        scope: [
          "Everything in Growth",
          "Dedicated account manager",
          "Custom integrations",
          "Quarterly strategy sessions",
          "SLA + guaranteed response time",
          "Co-marketing opportunities",
        ],
        value_justification: `Premium pricing signals quality. Even if you don't sell this, mentioning it resets buyer expectations — a $3K buyer walking into a $5.5K Better feels smart.`,
      },
      pricing_signals: {
        close_rate: "If 100% close, price is too low. If <30%, too high or bad sales. Sweet spot: 40-60%.",
        annual_increase: "15-25% annual increase is normal. Tie each raise to a new result or case study.",
        productize: "Name the outcome, not the deliverable. Lock the scope. Set one price.",
      },
      mistake_to_avoid:
        "Never cut price without cutting scope. That teaches the buyer your number was fake.",
    };
  },
});

// ────────────────────────────────────────────────────────────────────────
// buildOffer — Hormozi's Grand Slam Offer (Value Equation + Value Stack)
// ────────────────────────────────────────────────────────────────────────

export const buildOfferTool: Tool = tool({
  description:
    "Build a Grand Slam Offer using Hormozi's framework: Value = (Dream Outcome × Perceived Likelihood) / (Time Delay × Effort). Returns the full offer with dream outcome, all obstacles → solutions, value stack (each component priced), risk reversal, scarcity, urgency, and a compelling name. The goal: make the offer so good the buyer feels stupid saying no.",
  inputSchema: zodSchema(
    z.object({
      whatYouSell: z.string().describe("Your core product/service"),
      buyer: z.string().describe("Specific avatar"),
      dreamOutcome: z.string().describe("Their dream outcome in their words"),
      price: z.number().describe("Your target price point"),
    })
  ),
  execute: async (input) => {
    return {
      value_equation: {
        formula: "Value = (Dream Outcome × Perceived Likelihood of Achievement) / (Time Delay × Effort and Sacrifice)",
        maximize_top: [
          "Make the dream outcome more compelling (bigger, clearer, more personally resonant)",
          "Increase perceived likelihood (more evidence, better delivery, stronger guarantees)",
        ],
        minimize_bottom: [
          "Reduce time to outcome (faster delivery, faster results, quicker wins)",
          "Reduce the effort required (done-for-you components, elimination of friction)",
        ],
      },
      offer_building_process: {
        step_1_dream_outcome: input.dreamOutcome,
        step_2_list_all_obstacles: [
          "What are all the things standing between them and the dream outcome?",
          "Fears, friction points, things that could go wrong",
          "Things that make them hesitate to buy",
        ],
        step_3_solutions_for_each: [
          "For each obstacle, design a specific deliverable that removes it",
          "Use 'How to' as the prefix: 'How to [overcome obstacle] in [timeframe]'",
        ],
        step_4_delivery_vehicles: [
          "1-on-1 vs group vs template vs done-for-you",
          "Each has different effort/cost profiles",
        ],
        step_5_value_stack: {
          how_to_calculate: [
            "Each component should have an independent market value (what it would cost to buy separately)",
            "Time saved × hourly rate of target customer",
            "Alternative solution pricing",
            "Unique value only you provide",
          ],
          target_ratio: "10:1 — your offer should be perceived as delivering at least 10x the price",
        },
        step_6_risk_reversal: [
          "30-day money-back guarantee",
          "Performance guarantee (we get paid when you get results)",
          "Pilot structure ($300 credited toward first month if they convert)",
          "Money model: get paid to get new customers forever (e.g., recurring)",
        ],
        step_7_enhancers: {
          scarcity: "Limit quantity (how many). Increases exclusivity and demand.",
          urgency: "Limit time (how long). Lowers action threshold.",
          bonuses: "Additional components that address remaining objections. Bonuses should eclipse core offer in value.",
          guarantee: "Flip buyer risk to zero with creative guarantee structures (3x conversions).",
          naming: "Use MAGIC: Make a Magnetic reason why, Announce your Avatar, Give them a Goal, Indicate time frame, Complete with container word.",
        },
      },
      offer_template: {
        name: `[MAGIC] ${input.whatYouSell} — [Goal] in [Timeframe] [Container]`,
        positioning: `For ${input.buyer} who want ${input.dreamOutcome} without [top objection]`,
        value_components: [
          { name: "Core offer", market_value: "X", cost_to_deliver: "Y" },
          { name: "Bonus 1 (solves obstacle 1)", market_value: "X", cost_to_deliver: "Y" },
          { name: "Bonus 2 (solves obstacle 2)", market_value: "X", cost_to_deliver: "Y" },
        ],
        total_stack_value: "Sum of all components — should be 5-10x the price",
        guarantee: "[30-day money-back | Performance guarantee | Pilot structure]",
        price: input.price,
        scarcity: "[X spots per month | Cohort closes Y date]",
        urgency: "[Bonus expires Z | Price increases after Y]",
      },
      pro_tip:
        "Add bonuses instead of discounting. Discounting hurts margin and value perception. Bonuses make the offer feel like a steal and your margins stay intact.",
    };
  },
});

// ────────────────────────────────────────────────────────────────────────
// build30DayPlan — Daily action plan with measurable goals
// Per First 100 Customers Playbook
// ────────────────────────────────────────────────────────────────────────

export const build30DayPlanTool: Tool = tool({
  description:
    "Build a 30-day action plan for a chosen strategy (Reddit, Cold Email, Signal-Based, Build-in-Public, AI Agency, etc.). Returns daily tasks, weekly milestones, success metrics, and end-of-month goals. Based on the First 100 Customers Playbook: pick ONE strategy, run it for 30 days, only then evaluate.",
  inputSchema: zodSchema(
    z.object({
      strategy: z.enum([
        "reddit",
        "cold_email",
        "signal_based",
        "build_in_public",
        "ai_agency",
        "voice_agents",
      ]),
      target: z.string().describe("What you're trying to achieve (e.g., '5 paying clients', '10 ICPs', '$5K MRR')"),
      hoursPerDay: z.number().describe("How many hours per day you can commit"),
    })
  ),
  execute: async (input) => {
    const plans: Record<string, any> = {
      reddit: {
        week_1: {
          focus: "Map + monitor",
          daily: [
            "Identify 5-10 relevant subreddits (r/sales, r/SaaS, r/Entrepreneur, r/[niche])",
            "Set up F5Bot alerts for: 'struggling with [your problem]', 'looking for [category]', 'frustrated with [competitor]'",
            "Read 30 min/day of these subreddits — comment helpfully on 3-5 posts (no selling yet)",
          ],
          milestone: "5 subreddit alerts active, 30+ comments posted",
        },
        week_2: {
          focus: "First 10 prospects",
          daily: [
            "From F5Bot alerts, identify 5-10 qualified prospects per day",
            "Enrich them: find LinkedIn, company, work email (use RocketReach or Apollo)",
            "Send personalized email using the email framework (NOT DM on Reddit)",
            "Continue commenting 30 min/day to build karma",
          ],
          milestone: "First 10 personalized emails sent",
        },
        week_3: {
          focus: "Iterate and widen",
          daily: [
            "Continue 5-10 emails/day (now 50+ sent total)",
            "Reply to any responses within 2 hours (speed wins)",
            "Test different angles: which subject line gets opens? which hook gets replies?",
            "Build case study from any paying customers or pilot offers",
          ],
          milestone: "First reply, first call booked, or first customer",
        },
        week_4: {
          focus: "Systematize",
          daily: [
            "Continue volume (5-10 emails/day)",
            "Add 2nd channel: LinkedIn engagement for the same ICPs",
            "Document what's working (the angle, the subject, the timing)",
            "Set up a basic CRM (Notion or HubSpot Free)",
          ],
          milestone: `End of month 1: ${input.target}`,
        },
        daily_cadence: `With ${input.hoursPerDay}h/day, you'll send ${Math.floor(input.hoursPerDay * 5)} emails/day + monitor + engage`,
      },
      cold_email: {
        week_1: {
          focus: "Infrastructure",
          daily: [
            "Set up separate domain for cold outreach",
            "Configure SPF, DKIM, DMARC",
            "Start warming inboxes (5-10 warmup emails/day)",
            "Verify any lists you already have (ZeroBounce or NeverBounce)",
          ],
          milestone: "Domain configured, inboxes warming",
        },
        week_2: {
          focus: "Build list + first sequence",
          daily: [
            "Build ICP using buildIcpProfile tool",
            "Source 300-500 prospects using Apollo.io or LeadMagic + waterfall",
            "Write 3-7 touch sequence using craftColdEmail tool (REPLY framework)",
            "Keep warming inboxes (now sending 20-30/day warmup)",
          ],
          milestone: "First 50 prospects loaded, sequence written",
        },
        week_3: {
          focus: "Launch + measure",
          daily: [
            "Launch to first 50 prospects (micro-segmented)",
            "Test 2 subject line variations",
            "Measure REPLY rates, not open rates",
            "Continue warming (now 50-100/day)",
          ],
          milestone: "First replies coming in, learning what works",
        },
        week_4: {
          focus: "Scale what works",
          daily: [
            "Continue sequence to remaining 250 prospects",
            "Test new hooks and angles based on data",
            "Add LinkedIn touch (the 2nd channel)",
            "Start a simple content engine (1 LinkedIn post/week)",
          ],
          milestone: `End of month 1: ${input.target}`,
        },
        daily_cadence: `With ${input.hoursPerDay}h/day, send 30-50 cold emails/day + research + follow-up`,
      },
      signal_based: {
        week_1: {
          focus: "Signal taxonomy + sources",
          daily: [
            "Define your 3-5 highest-priority signals (job change, funding, intent surge)",
            "Set up sources: LinkedIn Sales Navigator job alerts, Crunchbase funding alerts, BuiltWith tech changes",
            "Define SLA per tier (Tier 1 = 30 min, Tier 2 = 4 hours, Tier 3 = same day)",
            "Build a Notion or HubSpot Free pipeline with signal-source tagging",
          ],
          milestone: "Signal sources connected, SLA defined",
        },
        week_2: {
          focus: "First 20 signal-driven outreaches",
          daily: [
            "Monitor signals daily (1 hour in the morning)",
            "Score and route per cluster-of-three rule (2-3 signals in 7 days = act)",
            "Send 5-10 personalized outreaches per day, timed to signal (job change = 14-21 days, funding = 3-7 days, pricing page = same day)",
          ],
          milestone: "20 personalized outreaches sent, signal-tagged",
        },
        week_3: {
          focus: "Iterate and widen",
          daily: [
            "Continue 5-10/day",
            "Track which signal types produce best results (signal-to-meeting rate)",
            "Kill signal types contributing <5% of pipeline after 30 days",
            "Add Claygent or GPT-4 enrichment for 'is this ICP fit?' decisions",
          ],
          milestone: "Clear pattern on which signals convert",
        },
        week_4: {
          focus: "Build a real-time motion",
          daily: [
            "Move from daily check to real-time alerts (Slack notifications)",
            "Document the signal → sequence → reply → meeting flow",
            "Train anyone else on the team to follow the playbook",
            "Add a 2nd channel (cold email) for accounts with weak signal but strong ICP fit",
          ],
          milestone: `End of month 1: ${input.target}`,
        },
        daily_cadence: `With ${input.hoursPerDay}h/day, 1h monitoring + 2h outreach`,
      },
      build_in_public: {
        week_1: {
          focus: "Listen + decide your niche",
          daily: [
            "Audit your last 50 DMs — what are people asking you about?",
            "Pick ONE niche for the next 90 days (not your whole life — just this quarter)",
            "Set up your content stack: 1 newsletter (Beehiiv or Substack), X, LinkedIn",
            "Study 5 top creators in your niche (read their last 50 posts)",
          ],
          milestone: "Niche chosen, content stack set up",
        },
        week_2: {
          focus: "First 7 newsletter + 21 posts",
          daily: [
            "Write 1 newsletter issue (use Justin Welsh's formula: big problem → common solution → why it fails → your better way → CTA)",
            "Turn it into 1 Twitter thread + 1 LinkedIn carousel + 3-4 short posts (listicle, story, contrarian, etc.)",
            "Engage 30 min/day: reply to 10 people in your niche with genuine value",
          ],
          milestone: "7 pieces of content published + 1 newsletter",
        },
        week_3: {
          focus: "Double down on what worked",
          daily: [
            "Look at top-performing posts from week 2 — what topic/format won?",
            "Make more of that. Kill what underperformed (don't be sentimental)",
            "Start tracking: clicks, follows gained per post, newsletter signups",
            "DM 5-10 people who engaged meaningfully — start building real relationships",
          ],
          milestone: "First 100 newsletter subscribers or 500 new followers",
        },
        week_4: {
          focus: "Build the first $50 product (validation)",
          daily: [
            "From DM and engagement patterns, identify the #1 thing people want from you",
            "Create a $29-99 product: ebook, template pack, mini-course, or paid community",
            "Announce it in a post (don't be shy — you've earned the audience)",
            "Continue publishing at 6-12 pieces/week",
          ],
          milestone: `End of month 1: ${input.target} (or $500+ from product sales)`,
        },
        daily_cadence: `With ${input.hoursPerDay}h/day, ${Math.floor(input.hoursPerDay * 0.5)}h content creation + ${Math.floor(input.hoursPerDay * 0.3)}h engagement + ${Math.floor(input.hoursPerDay * 0.2)}h research`,
      },
      ai_agency: {
        week_1: {
          focus: "Pick niche + wedge service",
          daily: [
            "Pick ONE narrow niche (e.g., 'voice agents for HVAC companies in the Midwest')",
            "Pick ONE wedge service to start: voice agent (14d to $1K), lead qualifier (32d), chatbot (38d), or content (28d)",
            "Build a demo of your service for a hypothetical client in that niche",
            "Set up your pricing using buildPricingTiers (Good/Better/Best)",
          ],
          milestone: "Niche + service chosen, demo built, pricing set",
        },
        week_2: {
          focus: "Get first 1-3 clients (free or cheap)",
          daily: [
            "Make a list of 30 businesses in your niche",
            "DM/call them offering a 30-day free pilot in exchange for a case study",
            "Sign 1-3 (don't be picky — you need case studies first)",
            "Document EVERYTHING: before/after metrics, screenshots, customer quote",
          ],
          milestone: "1-3 clients signed, first deliverables underway",
        },
        week_3: {
          focus: "Convert pilots to paid + build case study",
          daily: [
            "Deliver the service and document results obsessively",
            "Convert pilots to paid retainers (setup fee + monthly)",
            "Build a 1-page case study with screenshots and 1 customer quote",
            "Start a 2nd outreach campaign using case study as proof",
          ],
          milestone: "First paying client, case study ready",
        },
        week_4: {
          focus: "Productize and systematize",
          daily: [
            "Create a fixed-scope productized offer (e.g., 'AI Receptionist — $3K setup + $1.5K/mo')",
            "Build SOPs for the repeatable parts (you can AI-automate 80% of delivery)",
            "Add a 2nd channel: SEO content or partnerships with adjacent agencies",
            "Start charging full price (no more discounts)",
          ],
          milestone: `End of month 1: ${input.target} + productized offer live`,
        },
        daily_cadence: `With ${input.hoursPerDay}h/day, split between delivery (60%) and sales (40%)`,
      },
      voice_agents: {
        week_1: {
          focus: "Build demo + pick niche",
          daily: [
            "Pick a vertical: HVAC, dental, real estate, law firm, chiropractor",
            "Build a Vapi + Cal.com voice agent demo for that vertical",
            "Test it. Get a friend to call and book a fake appointment",
            "Set up pricing: $3-5K setup + $1.5-2.5K/mo retainer",
          ],
          milestone: "Working voice agent demo, vertical picked, pricing set",
        },
        week_2: {
          focus: "First 5 prospects",
          daily: [
            "Make a list of 30 local businesses in your vertical",
            "Call them (yes, real phone call) — most owners are friendly if you're local",
            "Pitch: 'I built a voice agent that books appointments 24/7. Want a 30-day free trial?'",
            "Sign 1-3 (free or cheap — you need a case study)",
          ],
          milestone: "First 1-3 clients signed (free/cheap)",
        },
        week_3: {
          focus: "Case study + paid conversions",
          daily: [
            "Document the results: calls answered, appointments booked, hours saved",
            "Convert pilots to paid ($3-5K setup + $1.5-2.5K/mo)",
            "Get a testimonial with specific numbers (X calls in 30 days, $Y revenue)",
            "Build a 1-page case study",
          ],
          milestone: "First paying client, case study ready",
        },
        week_4: {
          focus: "Replicate + price up",
          daily: [
            "Sell to next 5-10 businesses (use case study)",
            "Productize: fixed scope, fixed price, no hourly",
            "Build delivery SOPs — you can handle 5-10 clients solo at 5h/client/week",
            "Add a 2nd channel: web/SEO content for '[city] + [vertical] + AI receptionist'",
          ],
          milestone: `End of month 1: ${input.target} (3-5 active clients)`,
        },
        daily_cadence: `With ${input.hoursPerDay}h/day, 2h delivery + 2h sales + 1h building`,
      },
    };

    return {
      strategy: input.strategy,
      target: input.target,
      hours_per_day: input.hoursPerDay,
      plan: plans[input.strategy],
      universal_principles: [
        "Pick ONE strategy. Don't switch mid-month. Run for 30 days, then evaluate.",
        "Speed-to-reply is the moat. Reply within 2 hours of any signal.",
        "Document everything. Every metric, every win, every loss. You can't optimize what you don't measure.",
        "Get 1 case study before you scale. One documented case study > 5 reviews.",
        "If 100% close rate, your price is too low. Healthy: 40-60%.",
        "Use AI to do the meta-move: the AI service you sell should be how you acquire your own clients.",
      ],
      next_steps: [
        "Save this plan to memory (delegate to Memory Keeper)",
        "Bookmark F5Bot (free), Apollo.io, RocketReach, Clay.com",
        "Set up a simple Notion or HubSpot Free CRM",
        "Schedule a 30-day check-in: review this plan, decide if it's working",
      ],
    };
  },
});

// ────────────────────────────────────────────────────────────────────────
// findSignals — Generate a list of buying signals + how to monitor them
// Per Trayo/AutoBound signal-based selling framework
// ────────────────────────────────────────────────────────────────────────

export const findSignalsTool: Tool = tool({
  description:
    "Generate a complete signal monitoring plan: which signals to watch, where to find them, the timing window for outreach, and the SLA. Returns tiers of signals (immediate action / priority queue / nurture), sources, and outreach templates per signal type.",
  inputSchema: zodSchema(
    z.object({
      icp: z.string().describe("Your ICP — e.g., 'VP of Engineering at Series A SaaS'"),
    })
  ),
  execute: async (input) => {
    return {
      icp: input.icp,
      cluster_of_three_rule:
        "Don't act on a single signal. Wait for 2-3 distinct signals within a 7-day window. Then reach out.",
      tiers: {
        tier_1_immediate_24_48h: {
          description: "Highest intent. Personal outreach from AE/senior SDR.",
          signals: [
            {
              signal: "Repeat pricing page visit from named contact",
              source: "First-party CRM, Clearbit, Warmly, RB2B",
              timing: "Same day, hour-of delay matters",
              conversion: "15-20% meeting rate",
            },
            {
              signal: "Direct inquiry (demo request, contact form)",
              source: "First-party CRM",
              timing: "Same day",
              conversion: "30%+ meeting rate",
            },
            {
              signal: "Job change into buying role at ICP account",
              source: "LinkedIn, Apollo, ZoomInfo, Sales Navigator",
              timing: "14-21 days post-hire",
              conversion: "3x cold baseline (champion tracking)",
            },
          ],
        },
        tier_2_priority_1_week: {
          description: "Strong signal. Structured, personalized sequence.",
          signals: [
            {
              signal: "Funding round at ICP account",
              source: "Crunchbase, LinkedIn announcements, PredictLeads",
              timing: "3-7 days post-announcement",
              conversion: "2-3x cold baseline",
            },
            {
              signal: "Tech stack change (competitor tool dropped)",
              source: "BuiltWith, HG Insights",
              timing: "7-10 days post-detection",
              conversion: "Variable, but very high intent",
            },
            {
              signal: "Hiring surge in relevant roles",
              source: "LinkedIn job posts, Apollo",
              timing: "7-14 days",
              conversion: "1.5-2x cold baseline",
            },
          ],
        },
        tier_3_nurture_monitor: {
          description: "Soft signal. Use to inform account intelligence.",
          signals: [
            {
              signal: "Bombora intent surge on category keywords",
              source: "Bombora, G2 Buyer Intent, 6sense",
              timing: "7-14 days post-spike",
              conversion: "Tiebreaker, not primary",
            },
            {
              signal: "LinkedIn post expressing pain point",
              source: "LinkedIn, manual monitoring",
              timing: "3-5 days",
              conversion: "1.2-1.5x baseline",
            },
            {
              signal: "Content engagement (downloaded, attended webinar)",
              source: "Clearbit, CRM",
              timing: "3-5 days",
              conversion: "0.8-1.2x baseline",
            },
          ],
        },
      },
      monitoring_setup: {
        free: [
          "LinkedIn Sales Navigator (free trial, then $100/mo) — job changes + engagement",
          "F5Bot (free) — Reddit keyword alerts",
          "Crunchbase alerts (free) — funding events",
          "Google Alerts (free) — company mentions, leadership changes",
          "BuiltWith free tier — tech stack changes",
        ],
        paid: [
          "Apollo.io ($49-99/mo) — contact data + intent + job changes",
          "Bombora ($3K+/mo) — first-party intent",
          "UserGems (~$500/mo) — champion tracking",
          "6sense / Demandbase / Trayo — enterprise intent",
        ],
      },
      weekly_retrospective: [
        "Which signals produced the most threshold-crossing accounts this week?",
        "Of accounts that crossed threshold, what was the signal-to-reply rate by signal type?",
        "Were there accounts that responded this week that we did NOT have in our signal queue? (Add them.)",
        "Were there accounts in the signal queue that we contacted 3+ times with no response? (Kill or refresh.)",
      ],
      kill_threshold:
        "Any signal type contributing <5% of pipeline after two quarters gets retired.",
    };
  },
});

// ────────────────────────────────────────────────────────────────────────
// Export all tools
// ────────────────────────────────────────────────────────────────────────

export const businessTools: Record<string, Tool> = {
  buildIcpProfile: buildIcpProfileTool,
  craftColdEmail: craftColdEmailTool,
  craftLinkedInMessage: craftLinkedInMessageTool,
  buildPricingTiers: buildPricingTiersTool,
  buildOffer: buildOfferTool,
  build30DayPlan: build30DayPlanTool,
  findSignals: findSignalsTool,
};
