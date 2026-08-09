import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { getUserByEmail } from '@/lib/users';
import { sendWelcomeEmail } from '@/lib/email';

export const runtime = 'nodejs';

// Admin-only endpoint to retroactively send the welcome email to a given address.
// POST /api/admin/send-welcome  { email: "..." }
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Admin only.' }, { status: 403 });

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 });

  const user = await getUserByEmail(email);
  if (!user) return NextResponse.json({ error: 'No account found for that email.' }, { status: 404 });

  await sendWelcomeEmail(email, user.name);

  return NextResponse.json({ success: true, sentTo: email });
}
