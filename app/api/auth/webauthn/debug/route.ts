import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const { blobs } = await list({ prefix: 'webauthn/' });
    return NextResponse.json({
      blobCount: blobs.length,
      blobs: blobs.map(b => ({
        pathname: b.pathname,
        size: b.size,
        hasDownloadUrl: !!b.downloadUrl,
        downloadUrlPreview: b.downloadUrl?.slice(0, 60),
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
