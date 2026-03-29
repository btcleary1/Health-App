import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { getCredentials, saveCredentials } from '@/lib/webauthn-store';

export const runtime = 'nodejs';

const RP_ID = process.env.WEBAUTHN_RP_ID || 'health-app-blond-omega.vercel.app';
const ORIGIN = process.env.WEBAUTHN_ORIGIN || `https://${RP_ID}`;

export async function POST(req: NextRequest) {
  const challenge = req.cookies.get('webauthn_challenge')?.value;
  if (!challenge) {
    return NextResponse.json({ error: 'Challenge expired. Please try again.' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const creds = await getCredentials();
    const stored = creds.find(c => c.id === body.id);

    if (!stored) {
      return NextResponse.json({
        error: 'Passkey not recognized.',
        debug: { credCount: creds.length, storedIds: creds.map(c => c.id.slice(0, 20)), incomingId: body.id?.slice(0, 20) },
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
    await saveCredentials(creds);

    const res = NextResponse.json({ success: true });
    res.cookies.set('app_auth', 'granted', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    res.cookies.delete('webauthn_challenge');
    return res;
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
