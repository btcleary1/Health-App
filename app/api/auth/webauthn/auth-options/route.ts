import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';

export const runtime = 'nodejs';

// Passkeys are tied to the exact site the person is on, so use the request's own host.
function getRpId(req: NextRequest): string {
  return req.nextUrl.hostname || 'localhost';
}

// Step 1 of logging in with Face ID. No email is asked for and nothing about accounts is revealed:
// the device offers whichever passkey it holds for this site (a discoverable passkey).
export async function POST(req: NextRequest) {
  const RP_ID = getRpId(req);
  // If email is provided, look up that user's credentials so we can target their
  // specific authenticator — this prevents the cross-device QR code from appearing.
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'required',
    allowCredentials: [],
  } as any);

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
