import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getUserByEmail } from '@/lib/users';
import { getCredentialsForUser } from '@/lib/webauthn-store';

export const runtime = 'nodejs';

// Passkeys are tied to the exact site the person is on, so use the request's own host.
function getRpId(req: NextRequest): string {
  return req.nextUrl.hostname || 'localhost';
}

export async function POST(req: NextRequest) {
  const RP_ID = getRpId(req);
  // If email is provided, look up that user's credentials so we can target their
  // specific authenticator — this prevents the cross-device QR code from appearing.
  let allowCredentials: { id: string; transports?: string[] }[] | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    if (body.email) {
      const user = await getUserByEmail(body.email);
      if (user) {
        const creds = await getCredentialsForUser(user.userId);
        const validCreds = creds.filter(c => /^[A-Za-z0-9\-_]+$/.test(c.id));
        if (validCreds.length > 0) {
          allowCredentials = validCreds.map(c => ({
            id: c.id,
            ...(c.transports?.length ? { transports: c.transports as any } : {}),
          }));
        }
      }
    }
  } catch { /* fall through to discoverable mode */ }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'required',
    allowCredentials: allowCredentials ?? [],
  } as any);

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
