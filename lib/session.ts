import { createHmac, randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'health_session';
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET env var is not set.');
  return secret;
}

function b64url(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf) : buf;
  return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromB64url(s: string): string {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded + '='.repeat((4 - (padded.length % 4)) % 4), 'base64').toString('utf8');
}

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  iat: number;
  exp: number;
}

export function createSessionToken(payload: Omit<SessionPayload, 'iat' | 'exp'>): string {
  const now = Math.floor(Date.now() / 1000);
  const full: SessionPayload = { ...payload, iat: now, exp: now + SESSION_TTL };
  const data = b64url(JSON.stringify(full));
  const sig = createHmac('sha256', getSecret()).update(data).digest('hex');
  return `${data}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [data, sig] = token.split('.');
    if (!data || !sig) return null;
    const expected = createHmac('sha256', getSecret()).update(data).digest('hex');
    if (sig !== expected) return null;
    const payload: SessionPayload = JSON.parse(fromB64url(data));
    if (Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(req: NextRequest): SessionPayload | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function setSessionCookie(res: NextResponse, payload: Omit<SessionPayload, 'iat' | 'exp'>): void {
  const token = createSessionToken(payload);
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL,
    path: '/',
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
}
