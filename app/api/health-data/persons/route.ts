import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { getPersons, savePersons, TrackedPerson } from '@/lib/health-data';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const persons = await getPersons(session.userId);
  return NextResponse.json({ persons });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, ageGroup, id, currentPersons } = await req.json();
  if (!name || !ageGroup) {
    return NextResponse.json({ error: 'Name and age group are required.' }, { status: 400 });
  }

  if (id) {
    // Update existing — client sends full current list as base
    const base: TrackedPerson[] = Array.isArray(currentPersons) ? currentPersons : await getPersons(session.userId);
    const updated = base.map(p => p.id === id ? { ...p, name: name.trim(), ageGroup } : p);
    await savePersons(session.userId, updated);
    return NextResponse.json({ success: true, persons: updated });
  }

  // Add new — use client-provided list to avoid CDN stale-read race condition
  const base: TrackedPerson[] = Array.isArray(currentPersons) ? currentPersons : await getPersons(session.userId);

  if (base.length >= 10) {
    return NextResponse.json({ error: 'Maximum of 10 people per account.' }, { status: 400 });
  }

  const newPerson: TrackedPerson = {
    id: randomBytes(8).toString('hex'),
    name: name.trim().split(/\s+/)[0], // first name only
    ageGroup,
  };
  const updated = [...base, newPerson];
  await savePersons(session.userId, updated);
  return NextResponse.json({ success: true, person: newPerson, persons: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Person ID required.' }, { status: 400 });

  const persons = await getPersons(session.userId);
  if (persons.length <= 1) {
    return NextResponse.json({ error: 'You must have at least one person to track.' }, { status: 400 });
  }

  const updated = persons.filter(p => p.id !== id);
  await savePersons(session.userId, updated);
  return NextResponse.json({ success: true, persons: updated });
}
