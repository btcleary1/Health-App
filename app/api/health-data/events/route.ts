import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { getEvents, saveEvents } from '@/lib/health-data';
import { checkTexts, newStrings } from '@/lib/saved-text';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const personId = req.nextUrl.searchParams.get('personId') ?? undefined;
  const events = await getEvents(session.userId, personId);
  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const personId = req.nextUrl.searchParams.get('personId') ?? undefined;
  const { events } = await req.json();
  const saved = await checkTexts(newStrings(events, await getEvents(session.userId, personId)), 'events');
  if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: 400 });
  await saveEvents(session.userId, events, personId);
  return NextResponse.json({ success: true });
}
