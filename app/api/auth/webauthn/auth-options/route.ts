import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';

export const runtime = 'nodejs';

const RP_ID = process.env.WEBAUTHN_RP_ID ||
  (process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname : 'localhost');

export async function POST(_req: NextRequest) {
  const options = await (generateAuthenticationOptions as any)({
    rpID: RP_ID,
    userVerification: 'required',
    hints: ['client-device'],           // iOS/macOS: prefer platform authenticator
    allowCredentials: [],               // empty = discoverable credentials only
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
