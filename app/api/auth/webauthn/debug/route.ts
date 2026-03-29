import { NextResponse } from 'next/server';
import { get } from '@vercel/blob';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const blobResult = await get('webauthn/credentials.json');
    if (!blobResult) return NextResponse.json({ error: 'blob not found via get()' });

    const res = await fetch(blobResult.downloadUrl, { cache: 'no-store' });
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
