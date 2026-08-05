// @ts-nocheck
// /api/secrets — list & create user secrets
// GET: list all (no values)
// POST: create a new secret

import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth";
import { listSecrets, setSecret } from "@/lib/secrets/manager";

export async function GET(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const secrets = await listSecrets(userId);
  return NextResponse.json({ secrets });
}

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, value, service, description, tags } = body;

  if (!name || !value) {
    return NextResponse.json({ error: "Name and value required" }, { status: 400 });
  }

  if (name.length > 100 || value.length > 10_000) {
    return NextResponse.json({ error: "Name or value too long" }, { status: 400 });
  }

  try {
    const secret = await setSecret(userId, name, value, {
      service,
      description,
      tags,
    });
    return NextResponse.json({
      secret: {
        id: secret.id,
        name: secret.name,
        service: secret.service,
        description: secret.description,
        tags: secret.tags,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
