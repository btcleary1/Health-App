import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { getUserById, updatePassword, verifyPassword } from '@/lib/users';
import { validatePassword } from '@/lib/password-rules';
import { checkRateLimit, recordFailure, clearFailures } from '@/lib/rate-limit';
import { logAudit, getClientIp } from '@/lib/audit';

export const runtime = 'nodejs';

// Changes the logged-in person's own password (the current one is required).
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const ip = getClientIp(req);
  try {
    await checkRateLimit(ip, 5, 'change-password');
    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Enter your current and new password.' }, { status: 400 });
    }
    const { valid, errors } = validatePassword(newPassword);
    if (!valid) return NextResponse.json({ error: `Password requirements not met: ${errors.join(', ')}.` }, { status: 400 });

    const user = await getUserById(session.userId);
    if (!user?.passwordHash || !(await verifyPassword(currentPassword, user.passwordHash))) {
      await recordFailure(ip, 5, 'change-password');
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
    }

    await Promise.all([updatePassword(user.userId, newPassword), clearFailures(ip, 'change-password')]);
    logAudit({ timestamp: new Date().toISOString(), userId: user.userId, email: user.email, action: 'password_changed', ip });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith('Too many')) return NextResponse.json({ error: msg }, { status: 429 });
    return NextResponse.json({ error: 'An error occurred.' }, { status: 500 });
  }
}
