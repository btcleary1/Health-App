import { NextRequest, NextResponse } from 'next/server';
import { createUser, userCount } from '@/lib/users';
import { validatePassword } from '@/lib/password-rules';
import { setSessionCookie } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { email, name, password } = await req.json();

    if (!email || !name || !password) {
      return NextResponse.json({ error: 'Email, name, and password are required.' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const { valid, errors } = validatePassword(password);
    if (!valid) {
      return NextResponse.json({ error: `Password requirements not met: ${errors.join(', ')}.` }, { status: 400 });
    }

    // First registered user becomes admin automatically
    const count = await userCount();
    const role = count === 0 ? 'admin' : 'user';

    const user = await createUser(email, name, password, role);

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
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
