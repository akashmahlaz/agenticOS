// Secret manager — encrypted storage for user secrets (API keys, tokens, etc.)
// Tools exposed to the agent: secret_list, secret_get, secret_set, secret_delete

import { db } from "../db";
import { encryptSecret, decryptSecret } from "../crypto/secrets";

export interface SecretSummary {
  id: string;
  name: string;
  description: string | null;
  service: string | null;
  tags: string[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  hasValue: boolean;
  createdAt: Date;
  updatedAt: Date;
  // fingerprint is a hash of the value, used for change detection
  fingerprint: string | null;
}

export interface SecretWithValue extends SecretSummary {
  value: string;
}

/**
 * List all secrets for a user (without values).
 */
export async function listSecrets(userId: string): Promise<SecretSummary[]> {
  const secrets = await db.secret.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  return secrets.map((s: any) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    service: s.service,
    tags: s.tags,
    lastUsedAt: s.lastUsedAt,
    expiresAt: s.expiresAt,
    hasValue: true,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    fingerprint: s.ciphertext.slice(0, 8), // First few chars of ciphertext as fingerprint
  }));
}

/**
 * Get a specific secret by name, with its decrypted value.
 * Updates lastUsedAt.
 */
export async function getSecret(
  userId: string,
  name: string
): Promise<SecretWithValue | null> {
  const secret = await db.secret.findUnique({
    where: { userId_name: { userId, name } },
  });

  if (!secret) return null;

  // Decrypt
  const value = decryptSecret(
    {
      ciphertext: secret.ciphertext,
      iv: secret.iv,
      authTag: secret.authTag,
      keyVersion: secret.keyVersion,
    },
    userId
  );

  // Fire-and-forget update of lastUsedAt
  db.secret
    .update({ where: { id: secret.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return {
    id: secret.id,
    name: secret.name,
    description: secret.description,
    service: secret.service,
    tags: secret.tags,
    lastUsedAt: secret.lastUsedAt,
    expiresAt: secret.expiresAt,
    hasValue: true,
    createdAt: secret.createdAt,
    updatedAt: secret.updatedAt,
    fingerprint: secret.ciphertext.slice(0, 8),
    value,
  };
}

/**
 * Create or update a secret.
 */
export async function setSecret(
  userId: string,
  name: string,
  value: string,
  options: {
    description?: string;
    service?: string;
    tags?: string[];
    expiresAt?: Date;
  } = {}
) {
  const encrypted = encryptSecret(value, userId);

  return db.secret.upsert({
    where: { userId_name: { userId, name } },
    create: {
      userId,
      name,
      description: options.description,
      service: options.service,
      tags: options.tags || [],
      expiresAt: options.expiresAt,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      keyVersion: encrypted.keyVersion,
    },
    update: {
      description: options.description,
      service: options.service,
      tags: options.tags || [],
      expiresAt: options.expiresAt,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      keyVersion: encrypted.keyVersion,
    },
  });
}

/**
 * Delete a secret.
 */
export async function deleteSecret(userId: string, name: string) {
  try {
    await db.secret.delete({ where: { userId_name: { userId, name } } });
    return { deleted: true };
  } catch {
    return { deleted: false };
  }
}

/**
 * Resolve a secret for use in code/commands. The agent can ask for a secret
 * by its logical name (e.g. "OPENAI_API_KEY") and get the value back.
 */
export async function resolveSecret(userId: string, name: string): Promise<string | null> {
  const secret = await getSecret(userId, name);
  return secret?.value || null;
}

/**
 * Resolve multiple secrets at once (for env injection).
 */
export async function resolveSecrets(
  userId: string,
  names: string[]
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const name of names) {
    const value = await resolveSecret(userId, name);
    if (value) result[name] = value;
  }
  return result;
}
