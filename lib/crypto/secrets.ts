// @ts-nocheck
// Cryptographic helpers for secret storage
// AES-256-GCM with per-user key derived from JWT_SECRET + userId
// Each secret has its own random IV, GCM auth tag prevents tampering

import crypto from "crypto";

const ALGO = "aes-256-gcm";
const KEY_LEN = 32; // 256 bits
const IV_LEN = 12; // 96 bits, recommended for GCM

/**
 * Derive a per-user encryption key from JWT_SECRET + userId using scrypt.
 * The key is deterministic per (secret, user) but unique across users.
 */
function deriveKey(userId: string): Buffer {
  const secret = process.env.JWT_SECRET || "agentic-os-default-secret";
  // scrypt makes brute-force hard even if JWT_SECRET leaks partially
  return crypto.scryptSync(secret + ":" + userId, "agentic-os-secret-salt", KEY_LEN);
}

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string; // base64
  authTag: string; // base64
  keyVersion: number;
}

const CURRENT_KEY_VERSION = 1;

/**
 * Encrypt a plaintext secret for a specific user.
 * Returns the ciphertext + IV + auth tag (all base64-encoded).
 */
export function encryptSecret(plaintext: string, userId: string): EncryptedPayload {
  const key = deriveKey(userId);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    keyVersion: CURRENT_KEY_VERSION,
  };
}

/**
 * Decrypt a secret for a specific user. Throws on tampering.
 */
export function decryptSecret(payload: EncryptedPayload, userId: string): string {
  const key = deriveKey(userId);
  const iv = Buffer.from(payload.iv, "base64");
  const authTag = Buffer.from(payload.authTag, "base64");
  const ciphertext = Buffer.from(payload.ciphertext, "base64");

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Generate a cryptographically secure random token (for share links, etc.)
 */
export function generateToken(bytes: number = 16): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Hash a string (for fingerprints, not for auth — use bcrypt for that)
 */
export function fingerprintSecret(value: string): string {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex")
    .slice(0, 12);
}
