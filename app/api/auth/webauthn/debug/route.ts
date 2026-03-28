import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN ?? '';
    const { blobs } = await list({ prefix: 'webauthn/' });
    const blob = blobs.find(b => b.pathname === 'webauthn/credentials.json');

    if (!blob) return NextResponse.json({ error: 'no blob found', blobCount: blobs.length });

    // Try downloadUrl (pre-signed) first, fall back to bearer token
    const downloadUrl = (blob as any).downloadUrl ?? blob.url;
    const res = await fetch(downloadUrl, { cache: 'no-store' });
    const text = await res.text();

    return NextResponse.json({
      status: res.status,
      ok: res.ok,
      usedDownloadUrl: !!(blob as any).downloadUrl,
      tokenPresent: !!token,
      tokenLength: token.length,
      bodyPreview: text.slice(0, 300),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) });
  }
}
