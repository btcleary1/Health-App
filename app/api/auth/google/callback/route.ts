import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createUser, userCount, markGoogleAuth } from '@/lib/users';
import { setSessionCookie } from '@/lib/session';
import { logAudit, getClientIp } from '@/lib/audit';

export const runtime = 'nodejs';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://healthwiz.vercel.app').trim();

async function exchangeCodeForTokens(code: string, codeVerifier: string): Promise<{ access_token: string; id_token: string }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${APP_URL}/api/auth/google/callback`,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed: ${text}`);
  }
  return res.json();
}

async function getGoogleUserInfo(accessToken: string): Promise<{ email: string; name: string; sub: string }> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch Google user info');
  return res.json();
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');
  const state = req.nextUrl.searchParams.get('state');
  const savedState = req.cookies.get('oauth_state')?.value;
  const codeVerifier = req.cookies.get('oauth_code_verifier')?.value;

  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}/login?error=google_cancelled`);
  }

  if (!codeVerifier || !state) {
    return NextResponse.redirect(`${APP_URL}/login?error=no_cookies`);
  }

  if (state !== savedState) {
    return NextResponse.redirect(`${APP_URL}/login?error=state_mismatch`);
  }

  try {
    const { access_token } = await exchangeCodeForTokens(code, codeVerifier);
    const googleUser = await getGoogleUserInfo(access_token);

    const ip = getClientIp(req);
    let user = await getUserByEmail(googleUser.email);

    if (!user) {
      const count = await userCount();
      const role = count === 0 ? 'admin' : 'user';
      const { randomBytes } = await import('crypto');
      const placeholderPassword = randomBytes(32).toString('hex');
      user = await createUser(googleUser.email, googleUser.name || googleUser.email.split('@')[0], placeholderPassword, role);
      logAudit({ timestamp: new Date().toISOString(), userId: user.userId, email: user.email, action: 'register', ip, details: 'google_oauth' });
    } else {
      logAudit({ timestamp: new Date().toISOString(), userId: user.userId, email: user.email, action: 'login_success', ip, details: 'google_oauth' });
    }

    await markGoogleAuth(user.userId);

    const safeName = user.name.replace(/[^\u0000-\u00FF]/g, '').trim() || user.email;
    const res = NextResponse.redirect(`${APP_URL}/dashboard`);
    setSessionCookie(res, {
      userId: user.userId,
      email: user.email,
      name: safeName,
      role: user.role,
    });
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = encodeURIComponent(msg.slice(0, 80));
    return NextResponse.redirect(`${APP_URL}/login?error=oauth_exception&detail=${code}`);
  }
}
