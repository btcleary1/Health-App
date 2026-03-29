import { NextRequest, NextResponse } from 'next/server';
import { verifyCredentialToken } from '@/lib/webauthn-hmac';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { backup } = await req.json();
    if (!backup) return NextResponse.json({ error: 'No backup provided' }, { status: 400 });

    const credJson = verifyCredentialToken(backup);
    if (!credJson) return NextResponse.json({ error: 'Invalid backup token' }, { status: 400 });

    // Valid — re-set the credential cookie
    const res = NextResponse.json({ success: true });
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
