import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { getPatientInfo, savePatientInfo } from '@/lib/health-data';
import { validateFirstName } from '@/lib/pii-validator';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const personId = req.nextUrl.searchParams.get('personId') ?? undefined;
  const info = await getPatientInfo(session.userId, personId);
  return NextResponse.json({ patient: info });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const personId = req.nextUrl.searchParams.get('personId') ?? undefined;
  const { patient } = await req.json();

  // Server-side PII validation: only first names allowed
  if (patient?.name !== undefined) {
    const nameError = validateFirstName(patient.name);
    if (nameError) {
      return NextResponse.json({ error: nameError }, { status: 400 });
    }
    // Strip to single word for safety
    patient.name = patient.name.trim().split(/\s+/)[0];
  }

  await savePatientInfo(session.userId, patient, personId);
  return NextResponse.json({ success: true });
}
