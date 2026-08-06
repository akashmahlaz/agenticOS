// Integration key resolver — checks user secret first, then Vercel env
// Order: user-specific secret (per-account) > server-wide Vercel env (default)
// This lets the user override the default OR fall back to a shared key

import { getSecret } from "@/lib/secrets/manager";

export type KeyName = "ROCKETREACH_API_KEY" | "GITHUB_TOKEN" | "VERCEL_TOKEN";

/**
 * Resolve an API key. Tries (in order):
 * 1. User's encrypted secret (allows per-account override)
 * 2. Server-wide env var (Vercel-set, available to all users)
 */
export async function resolveKey(
  userId: string,
  keyName: KeyName
): Promise<string | null> {
  // 1. User secret
  try {
    const secret = await getSecret(userId, keyName);
    if (secret?.value) return secret.value;
  } catch {
    // ignore — fall through to env
  }

  // 2. Vercel env (server-side default)
  const envVal = process.env[keyName];
  if (envVal && envVal.length > 0) return envVal;

  return null;
}

/**
 * Resolve the source of a key (for the agent to know if it's user-level or default).
 */
export async function resolveKeyWithSource(
  userId: string,
  keyName: KeyName
): Promise<{ value: string; source: "user-secret" | "server-env" } | null> {
  try {
    const secret = await getSecret(userId, keyName);
    if (secret?.value) return { value: secret.value, source: "user-secret" };
  } catch {
    // ignore
  }
  const envVal = process.env[keyName];
  if (envVal && envVal.length > 0) {
    return { value: envVal, source: "server-env" };
  }
  return null;
}
