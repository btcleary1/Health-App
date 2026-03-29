import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { signCredential } from '@/lib/webauthn-hmac';

export const runtime = 'nodejs';

const RP_ID = process.env.WEBAUTHN_RP_ID || 'health-app-blond-omega.vercel.app';
const ORIGIN = process.env.WEBAUTHN_ORIGIN || `https://${RP_ID}`;

export async function POST(req: NextRequest) {
  if (req.cookies.get('app_auth')?.value !== 'granted') {
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
    const credJson = JSON.stringify({
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64'),
      counter: credential.counter,
    });

    const backup = signCredential(credJson);
    const res = NextResponse.json({ success: true, backup });
    res.cookies.delete('webauthn_challenge');
    // Store credential in a long-lived httpOnly cookie
    res.cookies.set('webauthn_cred', credJson, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
    return res;
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
