import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { getCredentialsForUser, saveCredentialsForUser } from '@/lib/webauthn-store';
import { getSessionFromRequest } from '@/lib/session';

export const runtime = 'nodejs';

// Passkeys are tied to the exact site the person is on, so use the request's own host.
function getRpId(req: NextRequest): string {
  return req.nextUrl.hostname || 'localhost';
}
function getOrigin(req: NextRequest): string {
  return `${req.nextUrl.protocol}//${req.nextUrl.host}`;
}

export async function POST(req: NextRequest) {
  const RP_ID = getRpId(req);
  const ORIGIN = getOrigin(req);
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const challenge = req.cookies.get('webauthn_challenge')?.value;
  if (!challenge) {
    return NextResponse.json({ error: 'Challenge expired. Please try again.' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Verification failed.' }, { status: 400 });
    }

    const { credential } = verification.registrationInfo;
    // Save transports so auth-options can target this authenticator directly (no QR code)
    const transports: string[] =
      body.response?.transports ??
      (body.authenticatorAttachment === 'platform' ? ['internal'] : []);
    const newCred = {
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64'),
      counter: credential.counter,
      userId: session.userId,
      transports,
    };

    const existing = await getCredentialsForUser(session.userId);
    const others = existing.filter(c => c.id !== newCred.id);
    await saveCredentialsForUser(session.userId, [...others, newCred]);

    const res = NextResponse.json({ success: true });
    res.cookies.delete('webauthn_challenge');
    return res;
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
