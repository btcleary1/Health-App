import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN ?? '';
    const { blobs } = await list({ prefix: 'webauthn/' });
    const blob = blobs.find(b => b.pathname === 'webauthn/credentials.json');

    if (!blob) return NextResponse.json({ error: 'no blob found', blobCount: blobs.length });

    // Try fetching with bearer token
    const res = await fetch(blob.url, {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    const text = await res.text();

    return NextResponse.json({
      status: res.status,
      ok: res.ok,
      blobUrl: blob.url.slice(0, 60),
      downloadUrl: blob.downloadUrl?.slice(0, 60),
      tokenPresent: !!token,
      tokenLength: token.length,
      bodyPreview: text.slice(0, 200),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) });
  }
}
