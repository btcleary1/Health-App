import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { getAllUsers, deleteUser } from '@/lib/users';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }
  const users = await getAllUsers();
  return NextResponse.json({ users });
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'userId required.' }, { status: 400 });
  if (userId === session.userId) {
    return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
  }
  await deleteUser(userId);
  return NextResponse.json({ success: true });
}
