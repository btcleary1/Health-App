import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { getPatientInfo, savePatientInfo } from '@/lib/health-data';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const info = await getPatientInfo(session.userId);
  return NextResponse.json({ patient: info });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { patient } = await req.json();
  await savePatientInfo(session.userId, patient);
  return NextResponse.json({ success: true });
}
