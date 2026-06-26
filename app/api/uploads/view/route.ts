import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { getUploadManifest } from '@/lib/health-data';

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

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
    const res = await r2.send(
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: file.blobPath ?? file.url,
      })
    );
    if (!res.Body) return new NextResponse('File not found in storage', { status: 404 });

    const bytes = await res.Body.transformToByteArray();
    return new NextResponse(bytes, {
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
