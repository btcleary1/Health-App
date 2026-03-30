import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/users';
import { verifyResetCode } from '@/lib/reset-tokens';
import { validatePassword } from '@/lib/password-rules';
import { put } from '@vercel/blob';
import { createHash } from 'crypto';
import { logAudit, getClientIp } from '@/lib/audit';

export const runtime = 'nodejs';

function hashPassword(password: string): string {
  const salt = process.env.SESSION_SECRET ?? 'health-app-salt';
  return createHash('sha256').update(salt + password).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const { email, code, newPassword } = await req.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: 'Email, code, and new password are required.' }, { status: 400 });
    }

    const { valid, errors } = validatePassword(newPassword);
    if (!valid) {
      return NextResponse.json({ error: `Password requirements not met: ${errors.join(', ')}.` }, { status: 400 });
    }

    const codeValid = await verifyResetCode(email, code);
    if (!codeValid) {
      return NextResponse.json({ error: 'Invalid or expired code. Please request a new one.' }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

    const updated = { ...user, passwordHash: hashPassword(newPassword) };
    await put(`health-app/users/${user.userId}.json`, JSON.stringify(updated), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    });

    logAudit({ timestamp: new Date().toISOString(), userId: user.userId, email: user.email, action: 'password_reset_completed', ip: getClientIp(req) });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
