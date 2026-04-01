import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { getUserByEmail } from '@/lib/users';
import { Resend } from 'resend';

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

  const firstName = user.name.trim().split(/\s+/)[0];

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: 'Health Wiz <onboarding@resend.dev>',
    to: email,
    subject: 'Welcome to Health Wiz — You\'re all set',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Header -->
        <tr><td align="center" style="padding-bottom:32px;">
          <table cellpadding="0" cellspacing="0">
            <tr><td align="center" style="background:linear-gradient(135deg,#3B82F6,#6366F1);border-radius:20px;width:64px;height:64px;padding:0;">
              <img src="https://em-content.zobj.net/source/apple/354/heart-with-pulse_1f493.png" width="36" height="36" alt="❤️" style="display:block;margin:14px auto;" />
            </td></tr>
          </table>
          <h1 style="margin:20px 0 4px;font-size:24px;font-weight:700;color:#0F172A;letter-spacing:-0.5px;">Health Wiz</h1>
          <p style="margin:0;font-size:14px;color:#64748B;">Secure family health tracking</p>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#FFFFFF;border-radius:20px;border:1px solid #E2E8F0;padding:36px 36px 32px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

          <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0F172A;">Welcome, ${firstName}! 👋</h2>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
            Your Health Wiz account is ready. You now have a secure, private space to track health events, doctor visits, and get AI-powered insights — all in one place.
          </p>

          <!-- Steps -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr>
              <td style="padding:12px 16px;background:#F8FAFC;border-radius:12px;border:1px solid #E2E8F0;">
                <p style="margin:0;font-size:13px;color:#0F172A;"><strong style="color:#3B82F6;">① Set up your profile</strong><br>
                <span style="color:#64748B;">Head to Settings → add who you're tracking and your own first name.</span></p>
              </td>
            </tr>
            <tr><td style="height:8px;"></td></tr>
            <tr>
              <td style="padding:12px 16px;background:#F8FAFC;border-radius:12px;border:1px solid #E2E8F0;">
                <p style="margin:0;font-size:13px;color:#0F172A;"><strong style="color:#3B82F6;">② Log your first event</strong><br>
                <span style="color:#64748B;">On the Dashboard, tap "Add Event" to record any health episode — severity, vitals, and your notes.</span></p>
              </td>
            </tr>
            <tr><td style="height:8px;"></td></tr>
            <tr>
              <td style="padding:12px 16px;background:#F8FAFC;border-radius:12px;border:1px solid #E2E8F0;">
                <p style="margin:0;font-size:13px;color:#0F172A;"><strong style="color:#3B82F6;">③ Run AI Analysis</strong><br>
                <span style="color:#64748B;">Claude reviews your history and surfaces patterns, research questions, and talking points for your next appointment.</span></p>
              </td>
            </tr>
          </table>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="https://ethan-health.vercel.app/dashboard"
                style="display:inline-block;background:linear-gradient(135deg,#3B82F6,#6366F1);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:12px;box-shadow:0 4px 16px rgba(99,102,241,0.35);">
                Open Health Wiz →
              </a>
            </td></tr>
          </table>

        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding-top:28px;">
          <p style="margin:0 0 6px;font-size:12px;color:#94A3B8;">
            This is a private health tracking tool — not a medical device.<br>
            AI analysis is for research preparation only, not medical advice.
          </p>
          <p style="margin:0;font-size:12px;color:#CBD5E1;">
            © ${new Date().getFullYear()} Health Wiz · In an emergency, call <strong>911</strong>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  return NextResponse.json({ success: true, sentTo: email });
}
