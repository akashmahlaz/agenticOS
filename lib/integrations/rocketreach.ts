// RocketReach API client — for professional contact search
// API docs: https://docs.rocketreach.co/reference/people-search-api
// Base URL: https://api.rocketreach.co/v2/api
// Auth: Api-Key header
//
// IMPORTANT: The search endpoint expects `query` as a DICTIONARY
// with facet keys (current_title, current_employer, location, skills, etc.)
// NOT as a plain string. Example:
//   { "query": { "current_title": ["CTO"], "location": ["Germany"] } }
//
// Verified: 134,992 CTOs in DB, 5,510,943 founders/CEO/CTOs available.

export interface RocketReachProfile {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  title: string;
  company: string;
  location: string;
  industry: string;
  emails: string[];
  phones: string[];
  linkedin_url: string;
  profile_pic: string;
  department?: string;
  seniority?: string;
  teaser?: string;
}

export interface RocketReachCompany {
  id: string;
  name: string;
  domain: string;
  industry: string;
  employees: number;
  revenue: string;
  location: string;
  description?: string;
  linkedin_url?: string;
  logo?: string;
}

export interface RocketReachSearchResult {
  profiles: RocketReachProfile[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Query facets supported by the RocketReach People Search API.
 * Each facet takes an array of strings (with optional operators and quotes).
 */
export interface RocketReachQuery {
  name?: string[];
  current_title?: string[];
  previous_title?: string[];
  current_or_previous_title?: string[];
  current_employer?: string[];
  previous_employer?: string[];
  employer?: string[];
  department?: string[];
  management_levels?: string[];
  years_experience?: string[];
  job_change_signal?: string[];
  skills?: string[];
  all_skills?: string[];
  major?: string[];
  degree?: string[];
  school?: string[];
  location?: string[]; // e.g. ["\"San Francisco\"::~50mi"] or ["Germany"]
  country?: string[];
  state?: string[];
  city?: string[];
  postal_code?: string[];
  email?: string[];
  contact_method?: string[];
  company_id?: string[];
  company_domain?: string[];
  company_size?: string[];
  company_revenue?: string[];
  company_industry?: string[];
  company_sic_code?: string[];
  company_naics_code?: string[];
  company_tag?: string[];
  company_competitors?: string[];
  company_intent?: string[];
  company_industry_keywords?: string[];
  company_news_signal?: string[];
  company_job_posting_signal?: string[];
  keyword?: string[];
}

export interface RocketReachCompanyQuery {
  name?: string[];
  domain?: string[];
  industry?: string[];
  primary_industry?: string[];
  industry_tags?: string[];
  industry_keywords?: string[];
  employees?: string[];
  revenue?: string[];
  total_funding?: string[];
  growth?: string[];
  location?: string[];
  country?: string[];
  state?: string[];
  city?: string[];
  keyword?: string[];
}

export interface RocketReachClient {
  /**
   * Search people. Pass a structured query object (NOT a string).
   * Returns summaries only — use lookupById for contact info.
   */
  searchPeople(query: {
    query: RocketReachQuery;
    page_size?: number;
    page?: number;
  }): Promise<RocketReachSearchResult>;

  /**
   * Search companies.
   */
  searchCompanies(query: {
    query: RocketReachCompanyQuery;
    page_size?: number;
    page?: number;
  }): Promise<{ companies: RocketReachCompany[]; total: number }>;

  /**
   * Look up contact details for a person (charges credits).
   * Provide id, email, linkedin_url, or name+current_employer.
   */
  lookupByEmail(email: string): Promise<RocketReachProfile | null>;

  lookupByLinkedIn(linkedinUrl: string): Promise<RocketReachProfile | null>;

  lookupById(id: string | number): Promise<RocketReachProfile | null>;

  /**
   * Look up company details (firmographics, tech stack, etc.).
   */
  lookupCompany(identifier: {
    id?: string | number;
    domain?: string;
    name?: string;
  }): Promise<RocketReachCompany | null>;
}

/**
 * Create a RocketReach client with the given API key.
 *
 * Note: The RocketReach API uses TWO different URL patterns:
 *   - Search endpoints: https://api.rocketreach.co/v2/api/...
 *   - Lookup endpoints: https://api.rocketreach.co/api/v2/...
 *
 * Confirmed working with API key from 2026-08-10.
 */
export function createRocketReach(apiKey: string): RocketReachClient {
  const searchBaseUrl = "https://api.rocketreach.co/v2/api";
  const lookupBaseUrl = "https://api.rocketreach.co/api/v2";
  const headers = {
    "Api-Key": apiKey,
    "Content-Type": "application/json",
  };

  async function post<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`RocketReach POST ${url} failed (${res.status}): ${err}`);
    }
    return (await res.json()) as T;
  }

  async function get<T>(url: string): Promise<T> {
    const res = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`RocketReach GET ${url} failed (${res.status}): ${err}`);
    }
    return (await res.json()) as T;
  }

  return {
    async searchPeople({
      query,
      page_size = 10,
      page = 1,
    }): Promise<RocketReachSearchResult> {
      const data = await post<{
        profiles: Array<Record<string, unknown>>;
        pagination?: { total?: number; start?: number; next?: number };
      }>(`${searchBaseUrl}/search`, { query, page_size, start: page });

      const profiles = (data.profiles || []).map(normalizeProfile);
      return {
        profiles,
        total: data.pagination?.total ?? profiles.length,
        page,
        pageSize: page_size,
      };
    },

    async searchCompanies({
      query,
      page_size = 10,
      page = 1,
    }): Promise<{ companies: RocketReachCompany[]; total: number }> {
      const data = await post<{
        companies: Array<Record<string, unknown>>;
        pagination?: { total?: number; thisPage?: number; nextPage?: number; pageSize?: number };
      }>(`${searchBaseUrl}/searchCompany`, { query, page_size, start: page });

      const companies = (data.companies || []).map(normalizeCompany);
      return {
        companies,
        total: data.pagination?.total ?? companies.length,
      };
    },

    async lookupByEmail(email: string): Promise<RocketReachProfile | null> {
      try {
        const url = `${lookupBaseUrl}/person/lookup?email=${encodeURIComponent(email)}`;
        const data = await get<Record<string, unknown>>(url);
        return normalizeProfile(data);
      } catch {
        return null;
      }
    },

    async lookupByLinkedIn(
      linkedinUrl: string
    ): Promise<RocketReachProfile | null> {
      try {
        const url = `${lookupBaseUrl}/person/lookup?linkedin_url=${encodeURIComponent(linkedinUrl)}`;
        const data = await get<Record<string, unknown>>(url);
        return normalizeProfile(data);
      } catch {
        return null;
      }
    },

    async lookupById(id: string | number): Promise<RocketReachProfile | null> {
      try {
        const data = await get<Record<string, unknown>>(
          `${lookupBaseUrl}/person/lookup?id=${id}`
        );
        return normalizeProfile(data);
      } catch {
        return null;
      }
    },

    async lookupCompany(identifier: {
      id?: string | number;
      domain?: string;
      name?: string;
    }): Promise<RocketReachCompany | null> {
      const params = new URLSearchParams();
      if (identifier.domain) params.set("domain", identifier.domain);
      else if (identifier.name) params.set("name", identifier.name);
      else if (identifier.id) params.set("id", String(identifier.id));
      if (!params.toString()) return null;
      try {
        const data = await get<Record<string, unknown>>(
          `${lookupBaseUrl}/company/lookup?${params.toString()}`
        );
        return normalizeCompany(data);
      } catch {
        return null;
      }
    },
  };
}

function normalizeProfile(raw: Record<string, unknown>): RocketReachProfile {
  // Emails can be objects or strings
  const teaserObj = (raw.teaser as Record<string, unknown>) || {};
  const rawEmails =
    raw.emails || raw.telesign_emails || teaserObj.personal_emails || [];
  const emails = (Array.isArray(rawEmails) ? rawEmails : [])
    .map((e: unknown) => {
      if (typeof e === "string") return e;
      if (e && typeof e === "object" && "email" in e) {
        return (e as { email: string }).email;
      }
      return null;
    })
    .filter((e): e is string => Boolean(e));

  // Phones can be objects or strings
  const rawPhones = raw.phones || teaserObj.phones || [];
  const phones = (Array.isArray(rawPhones) ? rawPhones : [])
    .map((p: unknown) => {
      if (typeof p === "string") return p;
      if (p && typeof p === "object" && "number" in p) {
        return (p as { number: string }).number;
      }
      return null;
    })
    .filter((p): p is string => Boolean(p));

  // LinkedIn can be top-level or in `links` object
  const linksObj = (raw.links as Record<string, unknown>) || {};
  const linkedin =
    raw.linkedin_url ||
    linksObj.linkedin ||
    raw.li_url ||
    "";

  return {
    id: String(raw.id || raw.profile_id || ""),
    name:
      [raw.first_name, raw.last_name].filter(Boolean).join(" ").trim() ||
      String(raw.name || ""),
    first_name: String(raw.first_name || ""),
    last_name: String(raw.last_name || ""),
    title:
      String(raw.title || raw.current_title || "") ||
      (Array.isArray(raw.titles) ? String(raw.titles[0] || "") : ""),
    company:
      String(raw.company || raw.current_employer || "") ||
      (Array.isArray(raw.employers) ? String(raw.employers[0] || "") : ""),
    location:
      String(raw.location || "") ||
      [
        raw.city,
        raw.region,
        raw.country,
      ]
        .filter(Boolean)
        .join(", "),
    industry:
      String(raw.industry || raw.industry_str || raw.primary_industry || ""),
    emails,
    phones,
    linkedin_url: String(linkedin || ""),
    profile_pic: String(raw.profile_pic || ""),
    department: raw.department ? String(raw.department) : undefined,
    seniority: raw.seniority
      ? String(raw.seniority)
      : raw.management_level
        ? String(raw.management_level)
        : undefined,
    teaser: raw.teaser ? String(JSON.stringify(raw.teaser)) : undefined,
  };
}

function normalizeCompany(raw: Record<string, unknown>): RocketReachCompany {
  // LinkedIn can be top-level or in `links` object
  const linksObj = (raw.links as Record<string, unknown>) || {};
  const linkedin =
    raw.linkedin_url || linksObj.linkedin || raw.li_url || "";

  // Address can be a string or object
  const address = raw.address as Record<string, unknown> | string | undefined;
  let city = "";
  let region = "";
  let country = "";
  if (typeof address === "object" && address) {
    city = String(address.city || "");
    region = String(address.region || "");
    country = String(address.country_code || address.country || "");
  }
  const location =
    String(raw.location || "") ||
    [city, region, country].filter(Boolean).join(", ");

  return {
    id: String(raw.id || ""),
    name: String(raw.name || ""),
    domain: String(raw.domain || raw.website_url || raw.website_domain || ""),
    industry: String(
      raw.industry || raw.industry_str || raw.primary_industry || ""
    ),
    employees: Number(raw.num_employees || raw.employees || 0),
    revenue: String(raw.revenue || ""),
    location,
    description: raw.description ? String(raw.description) : undefined,
    linkedin_url: linkedin ? String(linkedin) : undefined,
    logo: raw.logo
      ? String(raw.logo)
      : raw.logo_url
        ? String(raw.logo_url)
        : undefined,
  };
}
