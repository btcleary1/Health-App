import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const registered = !!req.cookies.get('webauthn_cred')?.value;
  return NextResponse.json({ registered, count: registered ? 1 : 0 });
}
