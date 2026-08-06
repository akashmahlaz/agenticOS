// POST /api/admin/setup — save integration keys to Vercel env vars
// These become available to server-side code (Lead Gen, Developer sub-agents)
// so the user doesn't have to set them up per-account.

import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth";

interface SetupRequest {
  keys: Record<string, string>;
}

const ALLOWED_KEYS = [
  "ROCKETREACH_API_KEY",
  "GITHUB_TOKEN",
  "VERCEL_TOKEN",
  "OPENAI_API_KEY",
];

export async function POST(req: Request) {
  // Only authenticated users (advisory) can set these.
  // In a real app, gate this to admins only.
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as SetupRequest;
  if (!body.keys || typeof body.keys !== "object") {
    return NextResponse.json({ error: "No keys provided" }, { status: 400 });
  }

  const vercelToken = process.env.VERCEL_TOKEN;
  const vercelProjectId = process.env.VERCEL_PROJECT_ID;
  const vercelTeamId = process.env.VERCEL_TEAM_ID;

  if (!vercelToken || !vercelProjectId) {
    return NextResponse.json(
      { error: "Server is not configured to manage Vercel env vars" },
      { status: 500 }
    );
  }

  const results: Array<{ key: string; ok: boolean; error?: string }> = [];

  for (const [key, value] of Object.entries(body.keys)) {
    if (!ALLOWED_KEYS.includes(key)) {
      results.push({ key, ok: false, error: "Key not allowed" });
      continue;
    }
    if (!value || typeof value !== "string" || value.length < 8) {
      results.push({ key, ok: false, error: "Invalid value" });
      continue;
    }

    try {
      // Upsert env var via Vercel API
      const listRes = await fetch(
        `https://api.vercel.com/v10/projects/${vercelProjectId}/env${
          vercelTeamId ? `?teamId=${vercelTeamId}` : ""
        }`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${vercelToken}` },
        }
      );
      if (!listRes.ok) {
        results.push({ key, ok: false, error: "Failed to list env vars" });
        continue;
      }
      const list = (await listRes.json()) as { envs?: Array<{ id: string; key: string }> };
      const existing = list.envs?.find((e) => e.key === key);

      if (existing) {
        // Update
        const url = `https://api.vercel.com/v10/projects/${vercelProjectId}/env/${existing.id}${
          vercelTeamId ? `?teamId=${vercelTeamId}` : ""
        }`;
        const updateRes = await fetch(url, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${vercelToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ value }),
        });
        results.push({
          key,
          ok: updateRes.ok,
          error: updateRes.ok ? undefined : "Failed to update",
        });
      } else {
        // Create
        const url = `https://api.vercel.com/v10/projects/${vercelProjectId}/env${
          vercelTeamId ? `?teamId=${vercelTeamId}` : ""
        }`;
        const createRes = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${vercelToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            key,
            value,
            type: "encrypted",
            target: ["production", "preview", "development"],
          }),
        });
        results.push({
          key,
          ok: createRes.ok,
          error: createRes.ok ? undefined : "Failed to create",
        });
      }
    } catch (err) {
      results.push({ key, ok: false, error: (err as Error).message });
    }
  }

  return NextResponse.json({ results });
}

export async function GET() {
  // Show which keys are configured (not their values)
  const vercelToken = process.env.VERCEL_TOKEN;
  const vercelProjectId = process.env.VERCEL_PROJECT_ID;

  if (!vercelToken || !vercelProjectId) {
    return NextResponse.json(
      { error: "Server not configured for Vercel" },
      { status: 500 }
    );
  }

  try {
    const list = await fetch(
      `https://api.vercel.com/v9/projects/${vercelProjectId}/env`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${vercelToken}` },
      }
    );
    const data = (await list.json()) as { envs?: Array<{ key: string; target: string[] }> };
    const configured: Record<string, { present: boolean; targets: string[] }> = {};
    for (const k of ALLOWED_KEYS) {
      const e = data.envs?.find((x) => x.key === k);
      configured[k] = {
        present: Boolean(e),
        targets: e?.target ?? [],
      };
    }
    return NextResponse.json({ configured });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
