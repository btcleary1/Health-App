import { HUMAN_CHECK_FAILED, isBotTrap, verifyHuman } from '@/lib/turnstile';
import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, verifyPassword, hashPassword, isBcryptHash, recordLogin } from '@/lib/users';
import { setSessionCookie } from '@/lib/session';
import { recordAgreement } from '@/lib/agreements';
import { checkRateLimit, recordFailure, clearFailures } from '@/lib/rate-limit';
import { logAudit, getClientIp } from '@/lib/audit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  try {
    await checkRateLimit(ip, 5, 'login');

    const { email, password, turnstile, website, agreed } = await req.json();
    // Bots: the hidden trap field, then Cloudflare's human check (Cleary suite baseline).
    if (isBotTrap(website)) return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 });
    if (!(await verifyHuman(turnstile, ip))) return NextResponse.json({ error: HUMAN_CHECK_FAILED }, { status: 400 });
    // Per-account limit too, so one account can't be guessed at from many addresses.
    const acct = String(email || '').trim().toLowerCase();
    if (acct) await checkRateLimit(acct, 10, 'login_acct');

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    const valid = user ? await verifyPassword(password, user.passwordHash) : false;

    if (!user || !valid) {
      await recordFailure(ip, 5, 'login');
      if (email) await recordFailure(String(email).trim().toLowerCase(), 10, 'login_acct');
      logAudit({ timestamp: new Date().toISOString(), userId: user?.userId ?? 'unknown', email: email ?? 'unknown', action: 'login_failure', ip });
      return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 });
    }

    // Silently upgrade legacy SHA-256 hash to bcrypt on successful login
    const upgradedHash = isBcryptHash(user.passwordHash) ? undefined : await hashPassword(password);
    await Promise.all([
      clearFailures(ip, 'login'),
      clearFailures(String(email).trim().toLowerCase(), 'login_acct'),
      recordLogin(user.userId, upgradedHash),
    ]);

    logAudit({ timestamp: new Date().toISOString(), userId: user.userId, email: user.email, action: 'login_success', ip });
    if (agreed === true) await recordAgreement(user.userId, ip).catch(() => {});

    const safeName = user.name.replace(/[^ -ÿ]/g, '').trim() || user.email;
    const res = NextResponse.json({ success: true, name: safeName });
    setSessionCookie(res, {
      userId: user.userId,
      email: user.email,
      name: safeName,
      role: user.role,
    });
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg.startsWith('Too many') ? 429 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
