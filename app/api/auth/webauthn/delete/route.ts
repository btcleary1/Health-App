import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (req.cookies.get('app_auth')?.value !== 'granted') {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const res = NextResponse.json({ success: true });
  res.cookies.set('webauthn_cred', '', { maxAge: 0, path: '/' });
  return res;
}
