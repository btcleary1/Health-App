import { NextResponse } from 'next/server';
import { getCredentials } from '@/lib/webauthn-store';

export const runtime = 'nodejs';

export async function GET() {
  const creds = await getCredentials();
  return NextResponse.json({
    count: creds.length,
    ids: creds.map(c => c.id.slice(0, 20)),
  });
}
