// Natural-language → RocketReach query parser
// Converts a lead-gen task like "find CTOs at SaaS startups in Germany"
// into a structured RocketReach query dict.
//
// This is a deterministic rule-based parser (not AI) — it's just regex
// pattern matching for the most common B2B lead-gen intents. The
// Lead Gen sub-agent refines from here if needed.

import type { RocketReachQuery, RocketReachCompanyQuery } from "@/lib/integrations/rocketreach";

// Job title → RocketReach `management_levels` mapping
const CXO_TITLES = new Set([
  "cto",
  "ceo",
  "cfo",
  "coo",
  "cmo",
  "cio",
  "cdo",
  "chro",
  "cpo",
  "cso",
  "cro",
  "cxo",
  "chief technology officer",
  "chief executive officer",
  "chief financial officer",
  "chief operating officer",
  "chief marketing officer",
  "chief product officer",
  "chief data officer",
  "chief revenue officer",
  "chief people officer",
  "chief strategy officer",
  "chief information officer",
  "founder",
  "co-founder",
  "cofounder",
  "owner",
  "president",
  "partner",
  "principal",
]);

const VP_TITLES = new Set([
  "vp",
  "vps",
  "svp",
  "vice president",
  "senior vice president",
]);

const DIRECTOR_TITLES = new Set([
  "director",
  "head",
  "senior director",
  "associate director",
  "group director",
]);

// Common US/Europe cities for location detection
const CITY_KEYWORDS: Record<string, string> = {
  "new york": "New York",
  nyc: "New York",
  manhattan: "New York",
  brooklyn: "New York",
  "san francisco": "San Francisco",
  sf: "San Francisco",
  "san jose": "San Jose",
  "los angeles": "Los Angeles",
  la: "Los Angeles",
  seattle: "Seattle",
  austin: "Austin",
  boston: "Boston",
  chicago: "Chicago",
  denver: "Denver",
  miami: "Miami",
  dallas: "Dallas",
  houston: "Houston",
  atlanta: "Atlanta",
  portland: "Portland",
  washington: "Washington",
  dc: "Washington",
  "washington dc": "Washington",
  philadelphia: "Philadelphia",
  toronto: "Toronto",
  vancouver: "Vancouver",
  montreal: "Montreal",
  london: "London",
  paris: "Paris",
  berlin: "Berlin",
  munich: "Munich",
  hamburg: "Hamburg",
  frankfurt: "Frankfurt",
  amsterdam: "Amsterdam",
  barcelona: "Barcelona",
  madrid: "Madrid",
  milan: "Milan",
  rome: "Rome",
  zurich: "Zurich",
  geneva: "Geneva",
  stockholm: "Stockholm",
  oslo: "Oslo",
  copenhagen: "Copenhagen",
  helsinki: "Helsinki",
  dublin: "Dublin",
  lisbon: "Lisbon",
  warsaw: "Warsaw",
  prague: "Prague",
  vienna: "Vienna",
  brussels: "Brussels",
  tokyo: "Tokyo",
  osaka: "Osaka",
  seoul: "Seoul",
  singapore: "Singapore",
  "hong kong": "Hong Kong",
  "kuala lumpur": "Kuala Lumpur",
  bangkok: "Bangkok",
  jakarta: "Jakarta",
  sydney: "Sydney",
  melbourne: "Melbourne",
  mumbai: "Mumbai",
  delhi: "Delhi",
  bangalore: "Bangalore",
  bengaluru: "Bangalore",
  hyderabad: "Hyderabad",
  chennai: "Chennai",
  pune: "Pune",
  "sao paulo": "São Paulo",
  "mexico city": "Mexico City",
  "buenos aires": "Buenos Aires",
  telaviv: "Tel Aviv",
  "tel aviv": "Tel Aviv",
  "dubai": "Dubai",
  "abu dhabi": "Abu Dhabi",
  cairo: "Cairo",
  "cape town": "Cape Town",
  johannesburg: "Johannesburg",
  nairobi: "Nairobi",
  lagos: "Lagos",
};

// Common industries with RocketReach-compatible names
const INDUSTRY_KEYWORDS: Record<string, string> = {
  saas: "Computer Software",
  software: "Computer Software",
  "ai ": "Artificial Intelligence",
  ai: "Artificial Intelligence",
  "ml ": "Machine Learning",
  ml: "Machine Learning",
  fintech: "Financial Services",
  finance: "Financial Services",
  banking: "Banking",
  crypto: "Cryptocurrency",
  blockchain: "Blockchain",
  web3: "Internet",
  ecommerce: "E-commerce",
  "e-commerce": "E-commerce",
  retail: "Retail",
  health: "Healthcare",
  healthcare: "Healthcare",
  biotech: "Biotechnology",
  pharma: "Pharmaceuticals",
  edtech: "Education",
  education: "Education",
  "real estate": "Real Estate",
  construction: "Construction",
  manufacturing: "Manufacturing",
  logistics: "Logistics",
  marketing: "Marketing & Advertising",
  advertising: "Marketing & Advertising",
  media: "Media Production",
  gaming: "Computer Games",
  cybersecurity: "Computer & Network Security",
  security: "Computer & Network Security",
  telecom: "Telecommunications",
  energy: "Oil & Energy",
  cleantech: "Renewables & Environment",
  climate: "Renewables & Environment",
  agriculture: "Farming",
  "non-profit": "Non-profit",
  ngo: "Non-profit",
  government: "Government",
};

// Country / region names for `location` and `country` facets
const COUNTRY_KEYWORDS: Record<string, string> = {
  us: "United States",
  usa: "United States",
  "united states": "United States",
  "u.s.": "United States",
  uk: "United Kingdom",
  "united kingdom": "United Kingdom",
  gb: "United Kingdom",
  "great britain": "United Kingdom",
  england: "United Kingdom",
  germany: "Germany",
  de: "Germany",
  france: "France",
  fr: "France",
  spain: "Spain",
  italy: "Italy",
  netherlands: "Netherlands",
  nl: "Netherlands",
  holland: "Netherlands",
  sweden: "Sweden",
  norway: "Norway",
  denmark: "Denmark",
  finland: "Finland",
  switzerland: "Switzerland",
  austria: "Austria",
  belgium: "Belgium",
  portugal: "Portugal",
  ireland: "Ireland",
  poland: "Poland",
  czech: "Czech Republic",
  romania: "Romania",
  greece: "Greece",
  india: "India",
  china: "China",
  japan: "Japan",
  singapore: "Singapore",
  australia: "Australia",
  "new zealand": "New Zealand",
  canada: "Canada",
  brazil: "Brazil",
  mexico: "Mexico",
  israel: "Israel",
  "south korea": "South Korea",
  korea: "South Korea",
};

// Company size keywords
const SIZE_KEYWORDS: Record<string, string> = {
  startup: "1-10",
  early: "1-10",
  small: "10-50",
  medium: "50-200",
  mid: "50-200",
  // 'growth' intentionally NOT a size keyword — "Head of Growth" is a title, not a size
  enterprise: "1000+",
  large: "1000+",
  big: "1000+",
  "pre-ipo": "1000+",
  unicorn: "1000+",
  seed: "1-10",
  "series a": "10-50",
  "series b": "50-200",
  "series c": "200-1000",
  "series d": "1000+",
};

// Seniority from titles
const SENIORITY_MAP: Record<string, "cxo" | "vp" | "director" | "manager" | "non_manager"> = {
  cto: "cxo",
  ceo: "cxo",
  cfo: "cxo",
  coo: "cxo",
  cmo: "cxo",
  cio: "cxo",
  cdo: "cxo",
  chro: "cxo",
  cpo: "cxo",
  cso: "cxo",
  cro: "cxo",
  cxo: "cxo",
  founder: "cxo",
  cofounder: "cxo",
  "co-founder": "cxo",
  owner: "cxo",
  president: "cxo",
  partner: "cxo",
  principal: "cxo",
  vp: "vp",
  vps: "vp",
  "vice president": "vp",
  svp: "vp",
  "senior vice president": "vp",
  director: "director",
  head: "director",
  "senior director": "director",
  "associate director": "director",
  "group director": "director",
};

export interface ParsedQuery {
  // People search (most common)
  people?: RocketReachQuery;
  // Company search (for ABM)
  companies?: RocketReachCompanyQuery;
  // Diagnostics — what was detected
  detected: {
    titles: string[];
    companies: string[];
    countries: string[];
    skills: string[];
    industries: string[];
    sizes: string[];
  };
}

const STOP_WORDS = new Set([
  "find",
  "looking",
  "look",
  "search",
  "searching",
  "for",
  "me",
  "in",
  "the",
  "at",
  "of",
  "to",
  "a",
  "an",
  "any",
  "some",
  "all",
  "i",
  "want",
  "need",
  "give",
  "show",
  "with",
  "from",
  "by",
  "us",
  "and",
  "or",
  "as",
  "be",
  "on",
  "who",
  "are",
  "is",
  "we",
  "do",
  "engineers",
  "developer",
  "developers",
  "specialist",
  "specialists",
  "people",
  "professionals",
  "work",
  "works",
  "working",
  "these",
  "this",
  "that",
  "those",
  "lead",
  "leads",
  "leads",
  "target",
  "targets",
  "prospect",
  "prospects",
]);

/**
 * Parse a lead-gen task into a structured RocketReach query.
 */
export function parseLeadGenQuery(task: string): ParsedQuery {
  const lower = task.toLowerCase();
  const tokens = lower.split(/[\s,;.]+/).filter(Boolean);

  const detected = {
    titles: [] as string[],
    companies: [] as string[],
    countries: [] as string[],
    skills: [] as string[],
    industries: [] as string[],
    sizes: [] as string[],
  };

  const query: RocketReachQuery = {};
  const companyQuery: RocketReachCompanyQuery = {};

  // 1) Detect management levels from CXO / VP / Director titles
  const seniority = new Set<"cxo" | "vp" | "director" | "manager" | "non_manager">();
  for (const t of tokens) {
    const base = t.replace(/s$/, ""); // strip trailing 's' (e.g. "vps" → "vp")
    if (CXO_TITLES.has(t) || CXO_TITLES.has(base)) {
      detected.titles.push(t);
      const level = SENIORITY_MAP[t] || SENIORITY_MAP[base] || "cxo";
      seniority.add(level);
    } else if (VP_TITLES.has(t) || VP_TITLES.has(base)) {
      detected.titles.push(t);
      const level = SENIORITY_MAP[t] || SENIORITY_MAP[base] || "vp";
      seniority.add(level);
    } else if (DIRECTOR_TITLES.has(t) || DIRECTOR_TITLES.has(base)) {
      detected.titles.push(t);
      const level = SENIORITY_MAP[t] || SENIORITY_MAP[base] || "director";
      seniority.add(level);
    }
  }
  if (seniority.size > 0) {
    query.management_levels = Array.from(seniority);
  }

  // 2) Detect specific job title patterns like "Head of Engineering"
  // Each entry has a regex and a "cap" function that takes the matched text
  // and returns the proper case for the API.
  const titlePatterns: Array<{ re: RegExp; cap: (s: string) => string }> = [
    {
      re: /heads? of ([a-z][a-z\s]+?)(?=\s+(?:in|at|with|from|who|are|and|\d)|\.|,|$)/g,
      cap: (s) => titleCase(s).replace(/^Heads?/, "Head"),
    },
    {
      re: /vps? of ([a-z][a-z\s]+?)(?=\s+(?:in|at|with|from|who|are|and|\d)|\.|,|$)/g,
      cap: (s) => titleCase(s).replace(/^Vps?/, "VP"),
    },
    {
      re: /svps? of ([a-z][a-z\s]+?)(?=\s+(?:in|at|with|from|who|are|and|\d)|\.|,|$)/g,
      cap: (s) => titleCase(s).replace(/^Svps?/, "SVP"),
    },
    {
      re: /vice president of ([a-z][a-z\s]+?)(?=\s+(?:in|at|with|from|who|are|and|\d)|\.|,|$)/g,
      cap: (s) => titleCase(s).replace(/^Vice President/, "VP"),
    },
    {
      re: /director(?:s)? of ([a-z][a-z\s]+?)(?=\s+(?:in|at|with|from|who|are|and|\d)|\.|,|$)/g,
      cap: (s) => titleCase(s).replace(/^Directors?/, "Director"),
    },
    {
      re: /\bsenior directors?\b/g,
      cap: (s) => titleCase(s),
    },
    {
      re: /senior ([a-z]+) engineer/g,
      cap: (s) => titleCase(s),
    },
    {
      re: /(staff|principal|lead) ([a-z]+) engineer/g,
      cap: (s) => titleCase(s),
    },
    {
      re: /\b([a-z]+) engineers?\b/g,
      cap: (s) => titleCase(s),
    },
    {
      re: /\b([a-z]+) developers?\b/g,
      cap: (s) => titleCase(s),
    },
  ];
  for (const { re, cap } of titlePatterns) {
    const matches = lower.matchAll(re);
    for (const m of matches) {
      const full = m[0].trim();
      if (full.length < 3 || full.length > 60) continue;
      const capStr = cap(full);
      if (!query.current_title?.includes(capStr)) {
        query.current_title = query.current_title || [];
        query.current_title.push(capStr);
        detected.titles.push(full);
      }
    }
  }

  // 3) Detect countries
  for (const [key, value] of Object.entries(COUNTRY_KEYWORDS)) {
    const re = new RegExp(`\\b${escapeRegex(key)}\\b`, "i");
    if (re.test(lower)) {
      if (!detected.countries.includes(value)) {
        detected.countries.push(value);
        query.location = query.location || [];
        query.location.push(value);
        companyQuery.location = companyQuery.location || [];
        companyQuery.location.push(value);
      }
    }
  }

  // 3b) Detect cities (more specific than countries)
  for (const [key, value] of Object.entries(CITY_KEYWORDS)) {
    const re = new RegExp(`\\b${escapeRegex(key)}\\b`, "i");
    if (re.test(lower)) {
      if (!detected.countries.includes(value)) {
        detected.countries.push(value);
        query.location = query.location || [];
        query.location.push(value);
        companyQuery.location = companyQuery.location || [];
        companyQuery.location.push(value);
      }
    }
  }

  // 4) Detect industries
  for (const [key, value] of Object.entries(INDUSTRY_KEYWORDS)) {
    const re = new RegExp(`\\b${escapeRegex(key.trim())}\\b`, "i");
    if (re.test(lower)) {
      if (!detected.industries.includes(value)) {
        detected.industries.push(value);
        query.company_industry = query.company_industry || [];
        query.company_industry.push(value);
        companyQuery.industry = companyQuery.industry || [];
        companyQuery.industry.push(value);
      }
    }
  }

  // 5) Detect company size (keyword OR explicit range)
  for (const [key, value] of Object.entries(SIZE_KEYWORDS)) {
    const re = new RegExp(`\\b${escapeRegex(key)}\\b`, "i");
    if (re.test(lower)) {
      if (!detected.sizes.includes(value)) {
        detected.sizes.push(value);
        query.company_size = query.company_size || [];
        query.company_size.push(value);
        companyQuery.employees = companyQuery.employees || [];
        companyQuery.employees.push(value);
      }
    }
  }
  // Detect explicit employee ranges: "200-1000 employees", "1000+ people"
  const sizeRangeMatches = lower.match(
    /\b(\d+\s*-\s*\d+|\d+\+|\<\d+|\>\d+|\d+)\s*(?:employees?|people|staff|headcount|head|engineers|developers|users)\b/g
  );
  if (sizeRangeMatches) {
    for (const m of sizeRangeMatches) {
      const range = m.match(/(\d+\s*-\s*\d+|\d+\+|\<\d+|\>\d+|\d+)/)?.[0]?.replace(/\s/g, "");
      if (range && !detected.sizes.includes(range)) {
        detected.sizes.push(range);
        query.company_size = query.company_size || [];
        query.company_size.push(range);
        companyQuery.employees = companyQuery.employees || [];
        companyQuery.employees.push(range);
      }
    }
  }

  // 6) Detect skills (tech keywords)
  // IMPORTANT: these are SKILLS, not company names. Even though
  // "openai" and "anthropic" are also companies, we treat them as
  // skills because they often appear as required skills in job posts.
  const TECH_SKILLS = new Set([
    "react", "nextjs", "next.js", "typescript", "javascript", "python",
    "rust", "go", "golang", "java", "kotlin", "swift", "ruby", "rails",
    "django", "flask", "node", "nodejs", "vue", "svelte", "angular",
    "aws", "azure", "gcp", "kubernetes", "docker", "terraform",
    "postgresql", "postgres", "mongodb", "redis", "graphql",
    "tensorflow", "pytorch", "llm", "claude", "gpt",
  ]);
  for (const t of tokens) {
    if (TECH_SKILLS.has(t)) {
      detected.skills.push(t);
      query.skills = query.skills || [];
      query.skills.push(t);
    }
  }

  // 7) Detect specific company mentions
  // Look for patterns like "at [CompanyName]" or "[CompanyName] employees"
  const companyPatterns = [
    /at ([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?)/g,
    /from ([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?)/g,
  ];
  // Also check for well-known company names from the task
  const KNOWN_COMPANIES = [
    "Stripe",
    "Shopify",
    "Notion",
    "Figma",
    "Linear",
    "Vercel",
    "OpenAI",
    "Anthropic",
    "Google",
    "Microsoft",
    "Meta",
    "Apple",
    "Amazon",
    "Netflix",
    "Airbnb",
    "Uber",
    "Lyft",
    "Twitter",
    "X",
    "LinkedIn",
    "Salesforce",
    "HubSpot",
    "Slack",
    "Zoom",
    "Dropbox",
    "Spotify",
    "TikTok",
    "ByteDance",
    "Pinterest",
    "Snap",
    "Reddit",
    "GitHub",
    "GitLab",
    "Atlassian",
    "MongoDB",
    "Snowflake",
    "Databricks",
    "Cloudflare",
    "Twilio",
    "Datadog",
    "Elastic",
    "HashiCorp",
    "Confluent",
    "CrowdStrike",
    "Palantir",
    "Coinbase",
    "Robinhood",
    "Klarna",
    "Revolut",
    "N26",
    "Wise",
    "Binance",
    "Kraken",
  ];
  for (const c of KNOWN_COMPANIES) {
    const re = new RegExp(`\\b${escapeRegex(c)}\\b`, "i");
    if (re.test(lower)) {
      detected.companies.push(c);
      query.current_employer = query.current_employer || [];
      query.current_employer.push(c);
    }
  }

  // If we found nothing useful, fall back to a generic keyword
  if (
    !query.current_title?.length &&
    !query.current_employer?.length &&
    !query.location?.length &&
    !query.skills?.length
  ) {
    query.keyword = tokens.filter((t) => !STOP_WORDS.has(t) && t.length > 2).slice(0, 5);
  }

  // De-dupe arrays
  const result: ParsedQuery = {
    detected,
    people: query,
    companies: companyQuery,
  };
  if (result.people) {
    for (const k of Object.keys(result.people) as (keyof RocketReachQuery)[]) {
      const v = result.people[k];
      if (Array.isArray(v)) {
        result.people[k] = Array.from(new Set(v)) as never;
      }
    }
  }
  if (result.companies) {
    for (const k of Object.keys(result.companies) as (keyof RocketReachCompanyQuery)[]) {
      const v = result.companies[k];
      if (Array.isArray(v)) {
        result.companies[k] = Array.from(new Set(v)) as never;
      }
    }
  }

  // Final pass: singularize "VPs", "CTOs", "Directors" → "VP", "CTO", "Director"
  // (RocketReach uses singular forms in its facet values)
  if (result.people?.current_title) {
    result.people.current_title = result.people.current_title.map((t) =>
      singularize(t)
    );
  }
  if (result.people?.management_levels) {
    result.people.management_levels = Array.from(
      new Set(result.people.management_levels)
    );
  }

  return result;
}

/**
 * Naive singularization for common English title plurals.
 * Only singularizes words in a known allowlist — leaves content words
 * (Sales, Marketing, Engineering, Product, Growth) untouched.
 * "VPs" → "VP", "CTOs" → "CTO", "Directors" → "Director", "Engineers" → "Engineer"
 * "VP of Sales" → "VP of Sales" (preserved)
 */
const SINGULARIZE_ALLOWLIST = new Set([
  "ctos", "ceos", "cfos", "coos", "cmos", "cios", "cdos", "cros", "cpos", "csos", "chros",
  "vps", "svps", "evps", "vps.",
  "directors", "founders", "cofounders", "co-founders",
  "owners", "presidents", "partners", "principals",
  "managers", "engineers", "developers", "designers", "architects",
  "analysts", "scientists", "researchers", "writers", "editors",
  "officers", "leads", "interns", "specialists", "consultants",
  "administrators", "coordinators", "associates", "assistants",
  "executives", "supervisors",
]);

function singularize(s: string): string {
  return s
    .split(" ")
    .map((w) => {
      const lower = w.toLowerCase();
      // Only singularize words in the allowlist
      if (!SINGULARIZE_ALLOWLIST.has(lower)) return w;
      // CTOs, CEOs, VPs, SVPs → drop the 's'
      if (lower.endsWith("os") && lower.length > 3) {
        return w.slice(0, -2) + (lower === "vps" || lower === "svps" || lower === "evps" ? "" : "o");
      }
      if (lower === "vps" || lower === "svps" || lower === "evps") {
        return w.slice(0, -1);
      }
      // Default: drop the trailing 's'
      return w.slice(0, -1);
    })
    .join(" ");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function titleCase(s: string): string {
  // Capitalize each word but keep common stop words lowercase
  const stop = new Set([
    "of", "the", "and", "or", "in", "at", "to", "for", "a", "an",
    "with", "by", "on", "as", "is", "are", "be",
  ]);
  return s
    .trim()
    .split(/\s+/)
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (i > 0 && stop.has(lower)) return lower;
      return w[0]?.toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}
