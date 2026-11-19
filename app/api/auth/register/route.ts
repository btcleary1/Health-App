import { HUMAN_CHECK_FAILED, isBotTrap, verifyHuman } from '@/lib/turnstile';
import { NextRequest, NextResponse } from 'next/server';
import { createUser, userCount, recordLogin } from '@/lib/users';
import { validatePassword } from '@/lib/password-rules';
import { setSessionCookie } from '@/lib/session';
import { checkRateLimit, recordFailure } from '@/lib/rate-limit';
import { logAudit, getClientIp } from '@/lib/audit';
import { sendWelcomeEmail } from '@/lib/email';
import { agreedVersion, recordAgreement } from '@/lib/agreements';
import { screenSaved } from '@/lib/saved-text';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  try {
    await checkRateLimit(ip, 5, 'register');

    const { email, name, password, agreed, healthConsent, turnstile, website } = await req.json();
    if (agreed !== true) return NextResponse.json({ error: 'Agree to the Terms of Service and Privacy Policy to create an account.' }, { status: 400 });
    if (healthConsent !== true) return NextResponse.json({ error: 'Check the health data consent box to create an account.' }, { status: 400 });
    if (isBotTrap(website)) return NextResponse.json({ error: 'Could not create your account.' }, { status: 400 });
    if (!(await verifyHuman(turnstile, ip))) return NextResponse.json({ error: HUMAN_CHECK_FAILED }, { status: 400 });

    if (!email || !name || !password) {
      return NextResponse.json({ error: 'Email, name, and password are required.' }, { status: 400 });
    }

    const savedName = screenSaved(String(name).slice(0, 80));
    if (!savedName.ok) return NextResponse.json({ error: savedName.error }, { status: 400 });

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
    logAudit({ timestamp: new Date().toISOString(), userId: user.userId, email: user.email, action: 'register', ip });
    await recordAgreement(user.userId, ip, { healthConsent: true }).catch(() => {});
    const tv = await agreedVersion(user.userId);

    // Send welcome email — fire and forget, don't block registration
    sendWelcomeEmail(email, name).catch(() => {});

    await recordLogin(user.userId);
    const res = NextResponse.json({ success: true, name: user.name });
    setSessionCookie(res, {
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
      tv,
    });
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith('Too many')) {
      return NextResponse.json({ error: msg }, { status: 429 });
    }
    await recordFailure(ip, 5, 'register');
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
