import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { getAllUsers, getUserByEmail, hashPassword } from '@/lib/users';
import { r2List, r2Get, r2Put } from '@/lib/r2';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';

// GET /api/admin/recover
// Returns userIds that have orphaned health data in R2 (data exists but no matching user account).
// Used to identify recoverable accounts after admin-deletion.
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const users = await getAllUsers();
  const activeIds = new Set(users.map(u => u.userId));

  const [healthKeys, uploadKeys] = await Promise.all([
    r2List('health-data/'),
    r2List('health-uploads/'),
  ]);

  const orphaned = new Map<string, { healthFiles: number; uploadFiles: number }>();

  for (const key of healthKeys) {
    const userId = key.split('/')[1];
    if (userId && !activeIds.has(userId)) {
      const entry = orphaned.get(userId) ?? { healthFiles: 0, uploadFiles: 0 };
      entry.healthFiles++;
      orphaned.set(userId, entry);
    }
  }
  for (const key of uploadKeys) {
    const userId = key.split('/')[1];
    if (userId && !activeIds.has(userId)) {
      const entry = orphaned.get(userId) ?? { healthFiles: 0, uploadFiles: 0 };
      entry.uploadFiles++;
      orphaned.set(userId, entry);
    }
  }

  return NextResponse.json({
    orphanedAccounts: Array.from(orphaned.entries()).map(([userId, counts]) => ({
      userId,
      ...counts,
    })),
  });
}

// POST /api/admin/recover
// Re-creates a user account record linked to an orphaned userId so the user can log in again.
// Body: { email, name, userId }
// Returns a temporary password the admin can share with the user.
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const { email, name, userId } = await req.json();
  if (!email || !userId) {
    return NextResponse.json({ error: 'email and userId are required.' }, { status: 400 });
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: 'That email already has an active account.' }, { status: 409 });
  }

  const [healthKeys, uploadKeys] = await Promise.all([
    r2List(`health-data/${userId}/`),
    r2List(`health-uploads/${userId}/`),
  ]);

  if (healthKeys.length === 0 && uploadKeys.length === 0) {
    return NextResponse.json(
      { error: 'No data found in R2 for this userId — nothing to restore.' },
      { status: 404 },
    );
  }

  const tempPassword = randomBytes(8).toString('hex');

  const user = {
    userId,
    email: email.toLowerCase().trim(),
    name: (name || email).trim(),
    passwordHash: hashPassword(tempPassword),
    role: 'user' as const,
    createdAt: new Date().toISOString(),
  };

  await r2Put(`health-app/users/${userId}.json`, JSON.stringify(user));

  const INDEX = 'health-app/users-index.json';
  const index = (await r2Get<{ email: string; userId: string }[]>(INDEX)) ?? [];
  index.push({ email: user.email, userId });
  await r2Put(INDEX, JSON.stringify(index));

  return NextResponse.json({
    success: true,
    tempPassword,
    healthFiles: healthKeys.length,
    uploadFiles: uploadKeys.length,
  });
}
