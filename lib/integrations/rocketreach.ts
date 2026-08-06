// RocketReach API client — for professional contact search
// API docs: https://rocketreach.co/api
// Endpoint: https://api.rocketreach.co/v2/api/search
// Auth: Api-Key header

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
  // Additional fields
  department?: string;
  seniority?: string;
  teaser?: string;
}

export interface RocketReachSearchResult {
  profiles: RocketReachProfile[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RocketReachClient {
  search(query: {
    query: string;
    page_size?: number;
    page?: number;
  }): Promise<RocketReachSearchResult>;

  lookupByEmail(email: string): Promise<RocketReachProfile | null>;

  lookupByLinkedIn(linkedinUrl: string): Promise<RocketReachProfile | null>;

  enrichContact(profile: Partial<RocketReachProfile>): Promise<RocketReachProfile | null>;
}

/**
 * Create a RocketReach client with the given API key.
 */
export function createRocketReach(apiKey: string): RocketReachClient {
  const baseUrl = "https://api.rocketreach.co/v2/api";
  const headers = {
    "Api-Key": apiKey,
    "Content-Type": "application/json",
  };

  async function post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`RocketReach ${path} failed (${res.status}): ${err}`);
    }
    return (await res.json()) as T;
  }

  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`RocketReach ${path} failed (${res.status}): ${err}`);
    }
    return (await res.json()) as T;
  }

  return {
    async search({ query, page_size = 10, page = 1 }): Promise<RocketReachSearchResult> {
      const data = await post<{
        profiles: Array<Record<string, unknown>>;
        pagination?: { total?: number; start?: number };
      }>("/search", { query, page_size, page });

      const profiles = (data.profiles || []).map(normalizeProfile);
      return {
        profiles,
        total: data.pagination?.total ?? profiles.length,
        page,
        pageSize: page_size,
      };
    },

    async lookupByEmail(email: string): Promise<RocketReachProfile | null> {
      try {
        const data = await post<{ profile: Record<string, unknown> | null }>(
          "/lookup/profile",
          { email }
        );
        return data.profile ? normalizeProfile(data.profile) : null;
      } catch {
        return null;
      }
    },

    async lookupByLinkedIn(linkedinUrl: string): Promise<RocketReachProfile | null> {
      try {
        const data = await post<{ profile: Record<string, unknown> | null }>(
          "/lookup/profile",
          { linkedin_url: linkedinUrl }
        );
        return data.profile ? normalizeProfile(data.profile) : null;
      } catch {
        return null;
      }
    },

    async enrichContact(profile: Partial<RocketReachProfile>): Promise<RocketReachProfile | null> {
      const seed = profile.linkedin_url
        ? { linkedin_url: profile.linkedin_url }
        : profile.name
          ? {
              name: profile.name,
              company: profile.company,
              title: profile.title,
            }
          : null;
      if (!seed) return null;
      try {
        const data = await post<{ profile: Record<string, unknown> | null }>(
          "/lookup/profile",
          seed
        );
        return data.profile ? normalizeProfile(data.profile) : null;
      } catch {
        return null;
      }
    },
  };
}

/**
 * Normalize a raw RocketReach profile to our internal shape.
 */
function normalizeProfile(raw: Record<string, unknown>): RocketReachProfile {
  // Emails can be objects or strings
  const rawEmails = raw.emails || raw.telesign_emails || [];
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
  const rawPhones = raw.phones || [];
  const phones = (Array.isArray(rawPhones) ? rawPhones : [])
    .map((p: unknown) => {
      if (typeof p === "string") return p;
      if (p && typeof p === "object" && "number" in p) {
        return (p as { number: string }).number;
      }
      return null;
    })
    .filter((p): p is string => Boolean(p));

  return {
    id: String(raw.id || raw.profile_id || ""),
    name:
      [raw.first_name, raw.last_name].filter(Boolean).join(" ").trim() ||
      String(raw.name || ""),
    first_name: String(raw.first_name || ""),
    last_name: String(raw.last_name || ""),
    title: String(raw.title || raw.current_title || ""),
    company: String(raw.company || raw.current_employer || ""),
    location: String(raw.location || raw.city || ""),
    industry: String(raw.industry || ""),
    emails,
    phones,
    linkedin_url: String(raw.linkedin_url || raw.li_url || ""),
    profile_pic: String(raw.profile_pic || ""),
    department: raw.department ? String(raw.department) : undefined,
    seniority: raw.seniority ? String(raw.seniority) : undefined,
    teaser: raw.teaser ? String(raw.teaser) : undefined,
  };
}
