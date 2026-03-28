import { NextResponse } from 'next/server';
import { getCredentials } from '@/lib/webauthn-store';

export const runtime = 'nodejs';

export async function GET() {
  const creds = await getCredentials();
  return NextResponse.json({ registered: creds.length > 0, count: creds.length });
}
