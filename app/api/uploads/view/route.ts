import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { getUploadManifest } from '@/lib/health-data';
import { r2GetBytes } from '@/lib/r2';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  const fileId = req.nextUrl.searchParams.get('id');
  const personId = req.nextUrl.searchParams.get('personId') ?? undefined;
  if (!fileId) return new NextResponse('Missing id', { status: 400 });

  const manifest = (await getUploadManifest(session.userId, personId)) as any[];
  const file = manifest.find((f: any) => f.id === fileId);
  if (!file) return new NextResponse('Not found', { status: 404 });

  try {
    const bytes = await r2GetBytes(file.blobPath ?? file.url);
    if (!bytes) return new NextResponse('File not found in storage', { status: 404 });

    return new NextResponse(bytes as unknown as BodyInit, {
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${encodeURIComponent(file.originalName)}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return new NextResponse('Failed to fetch file', { status: 500 });
  }
}
