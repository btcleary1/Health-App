import { NextRequest, NextResponse } from 'next/server';
import { saveCredentials } from '@/lib/webauthn-store';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (req.cookies.get('app_auth')?.value !== 'granted') {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  await saveCredentials([]);
  return NextResponse.json({ success: true });
}
