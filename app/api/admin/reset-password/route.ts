import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { getUserById, updatePassword } from '@/lib/users';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';

export const runtime = 'nodejs';

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  let pass = '';
  const bytes = randomBytes(12);
  for (let i = 0; i < 12; i++) {
    pass += chars[bytes[i] % chars.length];
  }
  return pass;
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'userId required.' }, { status: 400 });

  const user = await getUserById(userId);
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const tempPassword = generateTempPassword();
  await updatePassword(userId, tempPassword);

  // Send temp password via email — never return it in the response body
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Health Wiz AI <onboarding@resend.dev>',
      to: user.email,
      subject: 'Your Health Wiz AI temporary password',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
          <h2 style="color:#111827;">Temporary Password</h2>
          <p style="color:#6b7280;">An admin has reset your password. Use the temporary password below to log in, then change it immediately.</p>
          <div style="background:#f3f4f6;border-radius:12px;padding:16px;margin:16px 0;font-size:18px;font-family:monospace;letter-spacing:2px;">
            ${tempPassword}
          </div>
          <p style="color:#9ca3af;font-size:13px;">If you didn't request this, contact your administrator.</p>
        </div>
      `,
    });
  } catch {
    // Email failure shouldn't block the reset
  }

  return NextResponse.json({ success: true, email: user.email });
}
