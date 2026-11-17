import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, setSessionCookie } from '@/lib/session';
import { agreedVersion, recordAgreement } from '@/lib/agreements';
import { getClientIp } from '@/lib/audit';
import { TERMS_VERSION } from '@/lib/legal';

export const runtime = 'nodejs';

// Records that the signed-in person agreed to the current Terms and Privacy Policy and gave
// explicit consent to collecting their health data (version and time), then re-issues the
// session so the agreement screen lifts right away.
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { agree?: boolean; healthConsent?: boolean; version?: string };
  if (body.agree !== true || body.healthConsent !== true) {
    return NextResponse.json({ error: 'Check both boxes to continue.' }, { status: 400 });
  }
  if (body.version !== TERMS_VERSION) {
    return NextResponse.json({ error: 'The Terms just changed. Reload the page and try again.' }, { status: 409 });
  }
  try {
    await recordAgreement(session.userId, getClientIp(req), { healthConsent: true });
  } catch {
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 500 });
  }
  const tv = await agreedVersion(session.userId);
  if (!tv) return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 500 });
  const res = NextResponse.json({ ok: true });
  setSessionCookie(res, { userId: session.userId, email: session.email, name: session.name, role: session.role, tv });
  return res;
}
