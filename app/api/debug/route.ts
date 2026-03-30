import { NextResponse } from 'next/server';
import { list, put } from '@vercel/blob';
import { getUserByEmail, hashPassword } from '@/lib/users';

export const runtime = 'nodejs';

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Check env vars
  results.hasSessionSecret = !!process.env.SESSION_SECRET;
  results.hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
  results.blobTokenPrefix = process.env.BLOB_READ_WRITE_TOKEN?.slice(0, 10) ?? 'not set';

  // 2. Try a blob write
  try {
    await put('health-app/debug-test.json', JSON.stringify({ ts: Date.now() }), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    });
    results.writeTest = 'success';
  } catch (e: any) {
    results.writeTest = `FAILED: ${e.message}`;
  }

  // 3. Try a blob list
  try {
    const { blobs } = await list({ prefix: 'health-app/' });
    results.listTest = 'success';
    results.blobCount = blobs.length;
    results.blobPaths = blobs.map(b => b.pathname);
  } catch (e: any) {
    results.listTest = `FAILED: ${e.message}`;
  }

  // 4. Try reading back the debug blob
  try {
    const { blobs } = await list({ prefix: 'health-app/debug-test.json' });
    if (blobs.length > 0) {
      const res = await fetch(blobs[0].url, {
        headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
      });
      results.readTest = res.ok ? 'success' : `FAILED: HTTP ${res.status}`;
    } else {
      results.readTest = 'blob not found after write';
    }
  } catch (e: any) {
    results.readTest = `FAILED: ${e.message}`;
  }

  // 5. Read user index and show emails (no passwords)
  try {
    const { blobs } = await list({ prefix: 'health-app/users-index.json' });
    if (blobs.length > 0) {
      const res = await fetch(blobs[0].url, {
        headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
      });
      if (res.ok) {
        const index = await res.json();
        results.userIndex = index;
      } else {
        results.userIndex = `fetch failed: HTTP ${res.status}`;
      }
    } else {
      results.userIndex = 'no index blob found';
    }
  } catch (e: any) {
    results.userIndex = `FAILED: ${e.message}`;
  }

  // 6. Test login lookup for a specific email (pass ?email=you@example.com)
  return NextResponse.json(results);
}

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const user = await getUserByEmail(email);
  if (!user) return NextResponse.json({ found: false, message: 'No user found with that email' });
  const hash = hashPassword(password);
  const match = user.passwordHash === hash;
  return NextResponse.json({
    found: true,
    email: user.email,
    role: user.role,
    storedHashPrefix: user.passwordHash.slice(0, 10),
    computedHashPrefix: hash.slice(0, 10),
    match,
  });
}
