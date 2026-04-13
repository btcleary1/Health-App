import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { getNotes, saveNotes, HealthNote } from '@/lib/health-data';
import { detectPiiInText } from '@/lib/pii-validator';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const personId = req.nextUrl.searchParams.get('personId') ?? undefined;
  const notes = await getNotes(session.userId, personId);
  return NextResponse.json({ notes });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const personId = req.nextUrl.searchParams.get('personId') ?? undefined;

  const body = await req.json();
  const { text, date, source = 'manual' } = body;

  if (!text?.trim()) return NextResponse.json({ error: 'Note text is required.' }, { status: 400 });

  const piiWarnings = detectPiiInText(text);
  if (piiWarnings.length > 0) {
    return NextResponse.json({ error: piiWarnings[0] }, { status: 400 });
  }

  const notes = await getNotes(session.userId, personId);
  const newNote: HealthNote = {
    id: randomBytes(8).toString('hex'),
    date: date ?? new Date().toISOString().split('T')[0],
    text: text.trim(),
    source,
    createdAt: new Date().toISOString(),
  };

  await saveNotes(session.userId, [newNote, ...notes], personId);
  return NextResponse.json({ note: newNote });
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const personId = req.nextUrl.searchParams.get('personId') ?? undefined;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const notes = await getNotes(session.userId, personId);
  await saveNotes(session.userId, notes.filter(n => n.id !== id), personId);
  return NextResponse.json({ success: true });
}
