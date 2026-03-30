import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const category = (formData.get('category') as string) || 'general';
    const note = (formData.get('note') as string) || '';

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed.' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `health-uploads/${session.userId}/${timestamp}_${category}_${safeName}`;

    const blob = await put(filename, file, { access: 'private' });

    return NextResponse.json({
      success: true,
      file: {
        id: timestamp.toString(),
        originalName: file.name,
        category,
        note,
        size: file.size,
        type: file.type,
        url: blob.url,
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Upload failed: ' + msg }, { status: 500 });
  }
}
