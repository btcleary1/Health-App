import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, hashPassword } from '@/lib/users';
import { setSessionCookie } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    if (!user || user.passwordHash !== hashPassword(password)) {
      return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 });
    }

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
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
