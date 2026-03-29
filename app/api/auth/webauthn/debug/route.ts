import { NextResponse } from 'next/server';
import { list, getDownloadUrl } from '@vercel/blob';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const { blobs } = await list({ prefix: 'webauthn/' });
    const blob = blobs.find(b => b.pathname === 'webauthn/credentials.json');
    if (!blob) return NextResponse.json({ error: 'blob not found', blobCount: blobs.length });

    const downloadUrl = await getDownloadUrl(blob.url);
    const res = await fetch(downloadUrl, { cache: 'no-store' });
    const text = await res.text();

    return NextResponse.json({
      status: res.status,
      ok: res.ok,
      tokenPresent: !!process.env.BLOB_READ_WRITE_TOKEN,
      bodyPreview: text.slice(0, 300),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) });
  }
}
