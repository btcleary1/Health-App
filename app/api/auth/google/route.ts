import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'Google login not configured.' }, { status: 500 });
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://healthwiz.vercel.app'}/api/auth/google/callback`;
  const state = randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state,
  });

  const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  response.cookies.set('oauth_state', state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600 });
  return response;
}
