import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';

export const runtime = 'nodejs';

const RP_ID = process.env.WEBAUTHN_RP_ID || 'health-app-blond-omega.vercel.app';

export async function POST(_req: NextRequest) {
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'preferred',
    // No allowCredentials — browser will find the resident key automatically
  });

  const res = NextResponse.json(options);
  res.cookies.set('webauthn_challenge', options.challenge, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 300,
    path: '/',
  });
  return res;
}
