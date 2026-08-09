import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, updatePassword } from '@/lib/users';
import { verifyResetCode } from '@/lib/reset-tokens';
import { validatePassword } from '@/lib/password-rules';
import { logAudit, getClientIp } from '@/lib/audit';
import { checkRateLimit, recordFailure } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  try {
    await checkRateLimit(ip, 5, 'reset-password');
    const { email, code, newPassword } = await req.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: 'Email, code, and new password are required.' }, { status: 400 });
    }

    const { valid, errors } = validatePassword(newPassword);
    if (!valid) {
      return NextResponse.json({ error: `Password requirements not met: ${errors.join(', ')}.` }, { status: 400 });
    }

    const [codeValid, user] = await Promise.all([
      verifyResetCode(email, code),
      getUserByEmail(email),
    ]);

    if (!codeValid) {
      await recordFailure(ip, 5, 'reset-password');
      return NextResponse.json({ error: 'Invalid or expired code. Please request a new one.' }, { status: 400 });
    }
    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

    await updatePassword(user.userId, newPassword);

    logAudit({ timestamp: new Date().toISOString(), userId: user.userId, email: user.email, action: 'password_reset_completed', ip });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
