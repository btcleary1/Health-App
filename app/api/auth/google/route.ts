import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';

export const runtime = 'nodejs';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://healthwiz.vercel.app').trim();

function base64urlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(`${APP_URL}/login?error=google_not_configured`);
  }

  const redirectUri = `${APP_URL}/api/auth/google/callback`;
  const state = randomBytes(16).toString('hex');
  const codeVerifier = base64urlEncode(randomBytes(32));
  const codeChallenge = base64urlEncode(createHash('sha256').update(codeVerifier).digest());

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  res.cookies.set('oauth_state', state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 300, path: '/' });
  res.cookies.set('oauth_code_verifier', codeVerifier, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 300, path: '/' });
  return res;
}
