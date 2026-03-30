import { NextResponse } from 'next/server';
import { list, put } from '@vercel/blob';

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

  return NextResponse.json(results);
}
