import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const credCookie = req.cookies.get('webauthn_cred')?.value;
  if (!credCookie) {
    return NextResponse.json({ registered: false, message: 'No webauthn_cred cookie found' });
  }
  try {
    const cred = JSON.parse(credCookie);
    return NextResponse.json({
      registered: true,
      credId: cred.id?.slice(0, 20),
      counter: cred.counter,
      hasPublicKey: !!cred.publicKey,
    });
  } catch {
    return NextResponse.json({ registered: false, error: 'Invalid credential cookie' });
  }
}
