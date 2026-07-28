import { r2Get, r2Put, r2Del } from './r2';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';

const PREFIX = 'health-app/reset-tokens/';
const TTL_MS = 15 * 60 * 1000;

interface ResetToken {
  email: string;
  codeHash: string; // SHA-256 of the 6-digit code — not stored in plaintext
  expiresAt: number;
}

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export async function createResetCode(email: string): Promise<string> {
  const code = randomBytes(3).reduce((acc, b) => acc * 256 + b, 0).toString().slice(-6).padStart(6, '0');
  const record: ResetToken = {
    email: email.toLowerCase(),
    codeHash: hashCode(code),
    expiresAt: Date.now() + TTL_MS,
  };
  const key = Buffer.from(email.toLowerCase()).toString('hex');
  await r2Put(`${PREFIX}${key}.json`, JSON.stringify(record));
  return code;
}

export async function verifyResetCode(email: string, code: string): Promise<boolean> {
  const key = Buffer.from(email.toLowerCase()).toString('hex');
  const path = `${PREFIX}${key}.json`;
  const record = await r2Get<ResetToken>(path);
  if (!record) return false;
  if (record.email !== email.toLowerCase()) return false;
  if (Date.now() > record.expiresAt) return false;

  // Constant-time comparison to prevent timing oracle
  const expected = Buffer.from(record.codeHash, 'hex');
  const provided = Buffer.from(hashCode(code), 'hex');
  if (expected.length !== provided.length) return false;
  if (!timingSafeEqual(expected, provided)) return false;

  await r2Del(path);
  return true;
}
