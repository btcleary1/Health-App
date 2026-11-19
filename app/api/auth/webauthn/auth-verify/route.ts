import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { findCredentialForLogin, updateCredentialCounter } from '@/lib/webauthn-store';
import { getUserById, recordLogin } from '@/lib/users';
import { setSessionCookie } from '@/lib/session';
import { agreedVersion } from '@/lib/agreements';

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
  const challenge = req.cookies.get('webauthn_challenge')?.value;
  if (!challenge) {
    return NextResponse.json({ error: 'Challenge expired. Please try again.' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const stored = await findCredentialForLogin(body?.id, body?.response?.userHandle);

    if (!stored) {
      // The phone still holds a passkey the server no longer has (removed in Settings, or
      // from an older setup). Tell the client so it can ask the phone to drop it.
      return NextResponse.json(
        {
          error: "This phone's passkey is out of date. Log in with Google or email, and we'll set up Face ID again.",
          code: 'unknown_credential',
          credentialId: typeof body?.id === 'string' ? body.id : undefined,
          rpId: RP_ID,
        },
        { status: 404 },
      );
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

    await updateCredentialCounter(stored.id, verification.authenticationInfo.newCounter, stored.userId);

    // Look up the user who owns this credential
    const user = await getUserById(stored.userId);
    if (!user) {
      return NextResponse.json({ error: 'User account not found.' }, { status: 400 });
    }

    await recordLogin(user.userId);
    const tv = await agreedVersion(user.userId);
    const res = NextResponse.json({ success: true });
    setSessionCookie(res, {
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
      tv,
    });
    res.cookies.delete('webauthn_challenge');
    return res;
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
