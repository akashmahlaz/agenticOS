// /api/secrets/[name] — get (with value), update, or delete a secret
// GET: returns the decrypted value
// PATCH: update metadata
// DELETE: remove the secret

import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSecret, setSecret, deleteSecret } from "@/lib/secrets/manager";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await params;
  const secret = await getSecret(userId, name);
  if (!secret) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    secret: {
      id: secret.id,
      name: secret.name,
      value: secret.value,
      service: secret.service,
      description: secret.description,
      tags: secret.tags,
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await params;
  const body = await req.json();
  const { value, service, description, tags } = body;

  // Get current to preserve fields
  const current = await getSecret(userId, name);
  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const newValue = value !== undefined ? value : current.value;
  const secret = await setSecret(userId, name, newValue, {
    service: service ?? current.service,
    description: description ?? current.description,
    tags: tags ?? current.tags,
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
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await params;
  const result = await deleteSecret(userId, name);
  if (!result.deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
