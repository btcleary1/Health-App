import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { passphrase } = await req.json();
  const APP_PASSPHRASE = process.env.APP_PASSPHRASE || 'bc26';

  if (passphrase !== APP_PASSPHRASE) {
    return NextResponse.json({ error: 'Incorrect passphrase.' }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set('app_auth', 'granted', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  return res;
}
