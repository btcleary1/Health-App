import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { getCredentials } from '@/lib/webauthn-store';

export const runtime = 'nodejs';

const RP_ID = process.env.WEBAUTHN_RP_ID || 'health-app-blond-omega.vercel.app';

export async function POST(req: NextRequest) {
  if (req.cookies.get('app_auth')?.value !== 'granted') {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const existing = await getCredentials();

  const options = await generateRegistrationOptions({
    rpName: 'Health Wiz',
    rpID: RP_ID,
    userID: new TextEncoder().encode('healthwiz-owner'),
    userName: 'healthwiz',
    userDisplayName: 'Health Wiz',
    excludeCredentials: existing.map(c => ({ id: c.id, type: 'public-key' })),
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'required',
      authenticatorAttachment: 'platform',
    },
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
