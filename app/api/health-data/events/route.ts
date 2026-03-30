import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { getEvents, saveEvents } from '@/lib/health-data';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const events = await getEvents(session.userId);
  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { events } = await req.json();
  await saveEvents(session.userId, events);
  return NextResponse.json({ success: true });
}
