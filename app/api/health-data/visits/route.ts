import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { getDoctorVisits, saveDoctorVisits } from '@/lib/health-data';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const visits = await getDoctorVisits(session.userId);
  return NextResponse.json({ visits });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { visits } = await req.json();
  await saveDoctorVisits(session.userId, visits);
  return NextResponse.json({ success: true });
}
