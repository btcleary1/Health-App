import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { getAccountInfo, saveAccountInfo } from '@/lib/health-data';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const info = await getAccountInfo(session.userId);
  return NextResponse.json({ account: info });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { firstName } = await req.json();
  if (!firstName || typeof firstName !== 'string') {
    return NextResponse.json({ error: 'First name is required.' }, { status: 400 });
  }

  const cleaned = firstName.trim().split(/\s+/)[0]; // first name only
  if (cleaned.length < 1 || cleaned.length > 30) {
    return NextResponse.json({ error: 'First name must be 1–30 characters.' }, { status: 400 });
  }

  await saveAccountInfo(session.userId, { firstName: cleaned });
  return NextResponse.json({ success: true });
}
