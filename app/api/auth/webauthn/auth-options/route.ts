import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';

export const runtime = 'nodejs';

const RP_ID = process.env.WEBAUTHN_RP_ID || 'healthwiz.vercel.app';

export async function POST(_req: NextRequest) {
  const options = await (generateAuthenticationOptions as any)({
    rpID: RP_ID,
    userVerification: 'required',
    hints: ['client-device'],  // tell iOS to use Face ID / Touch ID, not security key
  });

  const res = NextResponse.json(options);
  res.cookies.set('webauthn_challenge', options.challenge, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 300,
    path: '/',
  });
  return res;
}
