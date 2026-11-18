import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { ownsPerson } from '@/lib/health-data';
import { removeEntries, type Kind } from '@/lib/health-chat-entries';

export const runtime = 'nodejs';

// Undo for entries the chat just logged. Only this account's own entries, for a person it tracks.
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { personId?: string; items?: { kind?: string; id?: string }[] };
  const personId = typeof b.personId === 'string' && b.personId ? b.personId : 'primary';
  if (!(await ownsPerson(session.userId, personId))) return NextResponse.json({ error: 'That profile was not found.' }, { status: 404 });
  const items = (Array.isArray(b.items) ? b.items : [])
    .slice(0, 10)
    .filter((i) => ['event', 'visit', 'note'].includes(String(i?.kind)) && typeof i?.id === 'string')
    .map((i) => ({ kind: i.kind as Kind, id: i.id as string }));
  if (!items.length) return NextResponse.json({ error: 'Nothing to undo.' }, { status: 400 });
  const removed = await removeEntries(session.userId, personId, items);
  return NextResponse.json({ removed });
}
