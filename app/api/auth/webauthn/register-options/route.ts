import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';

export const runtime = 'nodejs';

const RP_ID = process.env.WEBAUTHN_RP_ID || 'health-app-blond-omega.vercel.app';

export async function POST(req: NextRequest) {
  if (req.cookies.get('app_auth')?.value !== 'granted') {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const options = await generateRegistrationOptions({
    rpName: 'Health Wiz',
    rpID: RP_ID,
    userID: new TextEncoder().encode('healthwiz-owner'),
    userName: 'healthwiz',
    userDisplayName: 'Health Wiz',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
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
