// GitHub API client — for code work, repo management, PRs, issues
// API: https://api.github.com
// Auth: Bearer <token> header (fine-grained PAT recommended)

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  default_branch: string;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
}

export interface GitHubFileContent {
  name: string;
  path: string;
  type: "file" | "dir" | "symlink" | "submodule";
  size: number;
  content?: string; // base64-encoded
  encoding?: string;
  html_url: string;
}

export interface GitHubSearchCodeResult {
  total_count: number;
  items: Array<{
    name: string;
    path: string;
    repository: { full_name: string; html_url: string };
    html_url: string;
    text_matches?: Array<{ fragment: string }>;
  }>;
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: "open" | "closed";
  body: string | null;
  html_url: string;
  created_at: string;
  user: { login: string; avatar_url: string } | null;
}

export interface GitHubClient {
  listRepos(): Promise<GitHubRepo[]>;
  getRepo(owner: string, repo: string): Promise<GitHubRepo>;
  getFile(owner: string, repo: string, path: string, ref?: string): Promise<GitHubFileContent>;
  listFiles(owner: string, repo: string, path?: string, ref?: string): Promise<GitHubFileContent[]>;
  searchCode(q: string): Promise<GitHubSearchCodeResult>;
  listIssues(owner: string, repo: string, state?: "open" | "closed" | "all"): Promise<GitHubIssue[]>;
  createIssue(
    owner: string,
    repo: string,
    title: string,
    body: string
  ): Promise<GitHubIssue>;
  searchUsers(q: string): Promise<Array<{ login: string; name: string | null; html_url: string }>>;
}

/**
 * Create a GitHub client with the given token.
 */
export function createGitHub(token: string): GitHubClient {
  const baseUrl = "https://api.github.com";
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        ...headers,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers || {}),
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`GitHub ${path} failed (${res.status}): ${err}`);
    }
    return (await res.json()) as T;
  }

  return {
    async listRepos(): Promise<GitHubRepo[]> {
      // List the authenticated user's repos
      const data = await call<Array<Record<string, unknown>>>(
        "/user/repos?per_page=50&sort=updated"
      );
      return data.map((r) => ({
        id: r.id as number,
        name: r.name as string,
        full_name: r.full_name as string,
        description: (r.description as string | null) ?? null,
        private: r.private as boolean,
        default_branch: r.default_branch as string,
        html_url: r.html_url as string,
        language: (r.language as string | null) ?? null,
        stargazers_count: r.stargazers_count as number,
        updated_at: r.updated_at as string,
      }));
    },

    async getRepo(owner, repo): Promise<GitHubRepo> {
      const r = await call<Record<string, unknown>>(
        `/repos/${owner}/${repo}`
      );
      return {
        id: r.id as number,
        name: r.name as string,
        full_name: r.full_name as string,
        description: (r.description as string | null) ?? null,
        private: r.private as boolean,
        default_branch: r.default_branch as string,
        html_url: r.html_url as string,
        language: (r.language as string | null) ?? null,
        stargazers_count: r.stargazers_count as number,
        updated_at: r.updated_at as string,
      };
    },

    async getFile(owner, repo, path, ref): Promise<GitHubFileContent> {
      const qs = ref ? `?ref=${encodeURIComponent(ref)}` : "";
      return call<GitHubFileContent>(
        `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}${qs}`
      );
    },

    async listFiles(owner, repo, path = "", ref): Promise<GitHubFileContent[]> {
      const qs = ref ? `?ref=${encodeURIComponent(ref)}` : "";
      const url = path
        ? `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}${qs}`
        : `/repos/${owner}/${repo}/contents${qs}`;
      return call<GitHubFileContent[]>(url);
    },

    async searchCode(q): Promise<GitHubSearchCodeResult> {
      return call<GitHubSearchCodeResult>(
        `/search/code?q=${encodeURIComponent(q)}&per_page=20`
      );
    },

    async listIssues(owner, repo, state = "open"): Promise<GitHubIssue[]> {
      return call<GitHubIssue[]>(
        `/repos/${owner}/${repo}/issues?state=${state}&per_page=30`
      );
    },

    async createIssue(owner, repo, title, body): Promise<GitHubIssue> {
      return call<GitHubIssue>(`/repos/${owner}/${repo}/issues`, {
        method: "POST",
        body: JSON.stringify({ title, body }),
      });
    },

    async searchUsers(q): Promise<Array<{ login: string; name: string | null; html_url: string }>> {
      const data = await call<{
        items: Array<{ login: string; name: string | null; html_url: string }>;
      }>(`/search/users?q=${encodeURIComponent(q)}&per_page=20`);
      return data.items;
    },
  };
}
