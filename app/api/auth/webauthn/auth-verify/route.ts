import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';

export const runtime = 'nodejs';

const RP_ID = process.env.WEBAUTHN_RP_ID || 'health-app-blond-omega.vercel.app';
const ORIGIN = process.env.WEBAUTHN_ORIGIN || `https://${RP_ID}`;

export async function POST(req: NextRequest) {
  const challenge = req.cookies.get('webauthn_challenge')?.value;
  if (!challenge) {
    return NextResponse.json({ error: 'Challenge expired. Please try again.' }, { status: 400 });
  }

  const credCookie = req.cookies.get('webauthn_cred')?.value;
  if (!credCookie) {
    return NextResponse.json({ error: 'No passkey registered on this device.' }, { status: 400 });
  }

  try {
    const stored = JSON.parse(credCookie) as { id: string; publicKey: string; counter: number };
    const body = await req.json();

    if (body.id !== stored.id) {
      return NextResponse.json({
        error: 'Passkey not recognized.',
        debug: { storedId: stored.id.slice(0, 20), incomingId: body.id?.slice(0, 20) },
      }, { status: 400 });
    }

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: stored.id,
        publicKey: new Uint8Array(Buffer.from(stored.publicKey, 'base64')),
        counter: stored.counter,
      },
      requireUserVerification: false,
    });

    if (!verification.verified) {
      return NextResponse.json({ error: 'Verification failed.' }, { status: 400 });
    }

    // Update counter
    stored.counter = verification.authenticationInfo.newCounter;
    const res = NextResponse.json({ success: true });
    res.cookies.set('app_auth', 'granted', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    res.cookies.set('webauthn_cred', JSON.stringify(stored), {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
    res.cookies.delete('webauthn_challenge');
    return res;
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
