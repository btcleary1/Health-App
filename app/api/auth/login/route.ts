import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let step = 'init';
  try {
    step = 'parse_json';
    const text = await req.text();
    step = 'json_parse';
    const body = JSON.parse(text);
    step = 'check_passphrase';
    const passphrase = body?.passphrase ?? '';

    if (passphrase !== 'bc26') {
      return NextResponse.json({ error: 'Incorrect passphrase.' }, { status: 401 });
    }

    step = 'build_response';
    const res = NextResponse.json({ success: true });
    step = 'set_cookie';
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
    return NextResponse.json({ error: `Failed at step: ${step} — ${msg}` }, { status: 500 });
  }
}
