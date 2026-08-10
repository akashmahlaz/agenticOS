// Browser abstraction — uses fetch + cheerio by default
// Can swap to real Playwright (locally) or Lightpanda Cloud (when API key set)
//
// Usage:
//   - Default: HTTP fetch + HTML parsing (works in Vercel serverless)
//   - When BROWSER_API_URL env var is set, calls that API (e.g. Lightpanda Cloud)
//   - When running locally with Playwright installed, uses that

import * as cheerio from "cheerio";

export interface BrowseOptions {
  url: string;
  action?: "extract" | "screenshot" | "search";
  selector?: string;
  maxChars?: number;
}

export interface BrowseResult {
  url: string;
  status: number;
  title: string;
  description?: string;
  content: string;
  links?: Array<{ text: string; href: string }>;
  screenshotUrl?: string;
  method: "fetch" | "playwright" | "lightpanda";
}

const DEFAULT_MAX_CHARS = 8000;
const DEFAULT_TIMEOUT = 10000;

/**
 * Browse a URL and extract its content.
 * Default: HTTP fetch + cheerio HTML parsing.
 */
export async function browseWebsite(opts: BrowseOptions): Promise<BrowseResult> {
  // If a browser API is configured, use it
  if (process.env.BROWSER_API_URL) {
    return browseViaApi(opts);
  }

  return browseViaFetch(opts);
}

async function browseViaFetch(opts: BrowseOptions): Promise<BrowseResult> {
  const maxChars = opts.maxChars ?? DEFAULT_MAX_CHARS;

  const res = await fetch(opts.url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; agenticOS/1.0; +https://agentic-os.vercel.app)",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
    redirect: "follow",
  });

  const html = await res.text();
  const $ = cheerio.load(html);

  // Remove noise
  $("script, style, noscript, iframe, svg, canvas, video").remove();
  $('[role="navigation"], [role="banner"], [role="contentinfo"]').remove();
  $("nav, footer, header, aside, .nav, .footer, .header, .sidebar, .menu").remove();

  const title =
    $("title").first().text().trim() ||
    $('meta[property="og:title"]').attr("content") ||
    opts.url;

  const description =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    undefined;

  // Get main content
  let content = "";
  const main =
    $("main").first().text() ||
    $("article").first().text() ||
    $("#content, #main, .content, .main").first().text() ||
    $("body").text();

  content = main
    .replace(/[\t ]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();

  if (content.length > maxChars) {
    content = content.slice(0, maxChars) + "…";
  }

  // Extract links
  const links: Array<{ text: string; href: string }> = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    const text = $(el).text().trim().slice(0, 80);
    if (href && text && !href.startsWith("#")) {
      try {
        const absolute = new URL(href, opts.url).toString();
        links.push({ text, href: absolute });
      } catch {
        // ignore invalid URLs
      }
    }
  });

  return {
    url: res.url || opts.url,
    status: res.status,
    title,
    description,
    content,
    links: links.slice(0, 20),
    method: "fetch",
  };
}

async function browseViaApi(opts: BrowseOptions): Promise<BrowseResult> {
  const apiUrl = process.env.BROWSER_API_URL!;
  const res = await fetch(`${apiUrl}/browse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.BROWSER_API_KEY
        ? { Authorization: `Bearer ${process.env.BROWSER_API_KEY}` }
        : {}),
    },
    body: JSON.stringify(opts),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    // Fallback to fetch
    return browseViaFetch(opts);
  }

  const data = await res.json();
  return { ...data, method: "lightpanda" };
}

// ────────────────────────────────────────────────────────────────────────
// Web search — tries multiple backends in order:
//   1. MiniMax Token Plan web_search (built-in, uses MINIMAX_API_KEY) ⭐
//   2. Brave Search API (if BRAVE_API_KEY set)
//   3. Serper (Google) (if SERPER_API_KEY set)
//   4. DuckDuckGo HTML (often blocked on serverless, unreliable)
//
// MiniMax's built-in web_search is the preferred default because:
//   - No extra API key needed (uses existing MINIMAX_API_KEY)
//   - Works serverless (no IP blocking)
//   - Returns structured results (title, link, snippet, date)
//   - Endpoints: https://api.minimax.io/v1/coding_plan/search
//
// Reference: https://platform.minimax.io/docs/token-plan/mcp-guide
// Users can add Brave/Serper keys via /setup (Vercel env) or /secrets (per-user).
// ────────────────────────────────────────────────────────────────────────

export interface SearchResult {
  query: string;
  results: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  source: "brave" | "serper" | "duckduckgo" | "google" | "bing" | "minimax";
  /** If non-null, all backends failed and this explains why + how to fix. */
  error?: string;
}

/**
 * Search the web. Tries multiple backends in order.
 * Returns the first non-empty result set.
 *
 * Order:
 *   1. MiniMax Token Plan web_search (uses MINIMAX_API_KEY, works out-of-box)
 *   2. Brave Search API (if BRAVE_API_KEY set)
 *   3. Serper (Google) (if SERPER_API_KEY set)
 *   4. DuckDuckGo HTML (often blocked on serverless, unreliable)
 */
export async function searchWeb(
  query: string,
  numResults: number = 5
): Promise<SearchResult> {
  // 1. Try MiniMax Token Plan web_search FIRST — uses existing MINIMAX_API_KEY
  //    so search works out-of-the-box with no extra configuration.
  //    Per https://platform.minimax.io/docs/token-plan/mcp-guide
  const minimaxKey = process.env.MINIMAX_API_KEY;
  if (minimaxKey) {
    try {
      const result = await searchMiniMax(query, numResults, minimaxKey);
      if (result.results.length > 0) return result;
    } catch (err) {
      console.error("[search] MiniMax failed:", err);
    }
  }

  // 2. Try Brave Search API (best for privacy + works serverless)
  const braveKey = process.env.BRAVE_API_KEY;
  if (braveKey) {
    try {
      const result = await searchBrave(query, numResults, braveKey);
      if (result.results.length > 0) return result;
    } catch (err) {
      console.error("[search] Brave failed:", err);
    }
  }

  // 3. Try Serper (Google results via API, fast and reliable)
  const serperKey = process.env.SERPER_API_KEY;
  if (serperKey) {
    try {
      const result = await searchSerper(query, numResults, serperKey);
      if (result.results.length > 0) return result;
    } catch (err) {
      console.error("[search] Serper failed:", err);
    }
  }

  // 4. Try DuckDuckGo as a last resort (often blocked on serverless)
  try {
    const result = await searchDuckDuckGo(query, numResults);
    if (result.results.length > 0) return result;
  } catch (err) {
    console.error("[search] DuckDuckGo failed:", err);
  }

  // 5. All backends failed (or returned empty)
  const hasKey = !!(minimaxKey || braveKey || serperKey);
  return {
    query,
    results: [],
    source: minimaxKey
      ? "minimax"
      : braveKey
        ? "brave"
        : serperKey
          ? "serper"
          : "duckduckgo",
    error: hasKey
      ? "All search backends returned no results. The query may be too specific or the service may be temporarily down."
      : "No search API key configured. Add MINIMAX_API_KEY, BRAVE_API_KEY, or SERPER_API_KEY via /setup (Vercel env) or /secrets (per-user). DuckDuckGo's HTML endpoint is blocked from serverless IPs and cannot be used as a fallback.",
  };
}

// ────────────────────────────────────────────────────────────────────────
// MiniMax Token Plan web_search
// https://platform.minimax.io/docs/token-plan/mcp-guide
//
// POST https://api.minimax.io/v1/coding_plan/search
// Authorization: Bearer <MINIMAX_API_KEY>
// Body: { "q": "query", "num": 5 }   (NOT "query" + "count" — those are 400)
//
// Response: { organic: [{ title, link, snippet, date }], ... }
// ────────────────────────────────────────────────────────────────────────

async function searchMiniMax(
  query: string,
  numResults: number,
  apiKey: string
): Promise<SearchResult> {
  const url = "https://api.minimax.io/v1/coding_plan/search";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: query, // ⚠️ MiniMax uses 'q', NOT 'query' (verified 2026-08-10)
      num: Math.min(Math.max(1, numResults), 10), // 1-10
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MiniMax returned ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    organic?: Array<{ title?: string; link?: string; snippet?: string; date?: string }>;
    base_resp?: { status_code?: number; status_msg?: string };
  };

  // Check for MiniMax's base_resp error
  if (data.base_resp?.status_code && data.base_resp.status_code !== 0) {
    throw new Error(
      `MiniMax error ${data.base_resp.status_code}: ${data.base_resp.status_msg}`
    );
  }

  const results = (data.organic || [])
    .filter((r) => r.title && r.link)
    .slice(0, numResults)
    .map((r) => ({
      title: r.title || "",
      url: r.link || "",
      snippet: r.snippet || "",
      date: r.date,
    }));

  return {
    query,
    results,
    source: "minimax",
  };
}

// ──────────────────────────────────────────────
// Brave Search API (https://brave.com/search/api/)
// Free tier: 2,000 queries/month. Best privacy-respecting option.
// ──────────────────────────────────────────────

async function searchBrave(
  query: string,
  numResults: number,
  apiKey: string
): Promise<SearchResult> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${numResults}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Brave returned ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const results: SearchResult["results"] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webResults = (data as any)?.web?.results ?? [];
  for (const r of webResults) {
    if (results.length >= numResults) break;
    if (r.url && r.title) {
      results.push({
        title: String(r.title),
        url: String(r.url),
        snippet: String(r.description ?? "").slice(0, 300),
      });
    }
  }

  return { query, results, source: "brave" };
}

// ──────────────────────────────────────────────
// Serper (https://serper.dev/) — Google search results via API
// Free tier: 2,500 queries/month. Fast, structured JSON.
// ──────────────────────────────────────────────

async function searchSerper(
  query: string,
  numResults: number,
  apiKey: string
): Promise<SearchResult> {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num: numResults }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Serper returned ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const results: SearchResult["results"] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organic = (data as any)?.organic ?? [];
  for (const r of organic) {
    if (results.length >= numResults) break;
    if (r.link && r.title) {
      results.push({
        title: String(r.title),
        url: String(r.link),
        snippet: String(r.snippet ?? "").slice(0, 300),
      });
    }
  }

  return { query, results, source: "serper" };
}

// ──────────────────────────────────────────────
// DuckDuckGo HTML (no API key, but often blocked on serverless)
// Kept as a final fallback. May return 0 results if blocked.
// ──────────────────────────────────────────────

async function searchDuckDuckGo(
  query: string,
  numResults: number
): Promise<SearchResult> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(8000),
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`DuckDuckGo returned ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const results: SearchResult["results"] = [];

  $(".result").each((_, el) => {
    if (results.length >= numResults) return;
    const titleEl = $(el).find(".result__a");
    const snippetEl = $(el).find(".result__snippet");
    const title = titleEl.text().trim();
    let href = titleEl.attr("href") || "";
    // DuckDuckGo wraps URLs in a redirect
    if (href.startsWith("//duckduckgo.com/l/?uddg=")) {
      const match = href.match(/uddg=([^&]+)/);
      if (match) href = decodeURIComponent(match[1]);
    }
    const snippet = snippetEl.text().trim();
    if (title && href) {
      results.push({ title, url: href, snippet });
    }
  });

  return { query, results, source: "duckduckgo" };
}
