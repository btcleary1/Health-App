import { NextRequest, NextResponse } from 'next/server';

const PASSPHRASE = 'bc26';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const passphrase = body?.passphrase ?? '';

    if (passphrase !== PASSPHRASE) {
      return NextResponse.json({ error: 'Incorrect passphrase.' }, { status: 401 });
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set('app_auth', 'granted', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return res;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}
