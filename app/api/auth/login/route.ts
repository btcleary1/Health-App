import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, hashPassword } from '@/lib/users';
import { setSessionCookie } from '@/lib/session';
import { checkRateLimit, recordFailure, clearFailures } from '@/lib/rate-limit';

export const runtime = 'nodejs';

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  try {
    // Check rate limit before doing anything
    await checkRateLimit(ip);

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    if (!user || user.passwordHash !== hashPassword(password)) {
      await recordFailure(ip);
      return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 });
    }

    // Successful login — clear failure count
    await clearFailures(ip);

    const res = NextResponse.json({ success: true, name: user.name });
    setSessionCookie(res, {
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg.startsWith('Too many') ? 429 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
