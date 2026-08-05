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

// ──────────────────────────────────────────────
// Web search — uses DuckDuckGo HTML (no API key)
// ──────────────────────────────────────────────

export interface SearchResult {
  query: string;
  results: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  source: "duckduckgo" | "google" | "bing";
}

export async function searchWeb(
  query: string,
  numResults: number = 5
): Promise<SearchResult> {
  try {
    return await searchDuckDuckGo(query, numResults);
  } catch (err) {
    console.error("[search] DuckDuckGo failed:", err);
    return {
      query,
      results: [],
      source: "duckduckgo",
    };
  }
}

async function searchDuckDuckGo(
  query: string,
  numResults: number
): Promise<SearchResult> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; agenticOS/1.0; +https://agentic-os.vercel.app)",
      Accept: "text/html",
    },
    signal: AbortSignal.timeout(8000),
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

  return {
    query,
    results,
    source: "duckduckgo",
  };
}
