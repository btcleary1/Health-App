import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = JSON.parse(await req.text());
    const passphrase = body?.passphrase ?? '';

    if (passphrase !== 'bc26') {
      return NextResponse.json({ error: 'Incorrect passphrase.' }, { status: 401 });
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set('app_auth', 'granted', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
