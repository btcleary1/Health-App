import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, clearSessionCookie } from '@/lib/session';
import { deleteUser } from '@/lib/users';
import { r2Del, r2List } from '@/lib/r2';
import { deleteCredentialsForUser } from '@/lib/webauthn-store';
import { logAudit, getClientIp } from '@/lib/audit';

export const runtime = 'nodejs';

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { userId, email } = session;

  // Delete all health data blobs for this user
  const healthKeys = await r2List(`health-data/${userId}/`);
  if (healthKeys.length > 0) await r2Del(healthKeys);

  // Delete WebAuthn credentials
  await deleteCredentialsForUser(userId);

  // Delete uploads
  const uploadKeys = await r2List(`health-uploads/${userId}/`);
  if (uploadKeys.length > 0) await r2Del(uploadKeys);

  // Delete user record + remove from index
  await deleteUser(userId);

  logAudit({ timestamp: new Date().toISOString(), userId, email, action: 'account_deleted', ip: getClientIp(req) });

  const res = NextResponse.json({ success: true });
  clearSessionCookie(res);
  return res;
}
