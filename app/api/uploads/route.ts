import { put, del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { redactPiiFromText, detectPiiInText } from '@/lib/pii-validator';
import { getUploadManifest, saveUploadManifest } from '@/lib/health-data';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const files = await getUploadManifest(session.userId);
  return NextResponse.json({ files });
}

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

    // Reject PII in the note/metadata field
    const noteWarnings = detectPiiInText(note);
    if (noteWarnings.length > 0) {
      return NextResponse.json({ error: 'Note contains personal information (phone number or address). Please remove it before uploading.' }, { status: 400 });
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const blobPath = `health-uploads/${session.userId}/${timestamp}_${category}_${safeName}`;

    let uploadBody: File | Blob = file;
    let redactedCount = 0;

    // For plain-text files: redact PII from the content before storing
    if (file.type === 'text/plain') {
      const rawText = await file.text();
      const { redacted, changes } = redactPiiFromText(rawText);
      redactedCount = changes;
      uploadBody = new Blob([redacted], { type: 'text/plain' });
    }

    const blob = await put(blobPath, uploadBody, { access: 'private' });

    const fileRecord = {
      id: timestamp.toString(),
      originalName: file.name,
      category,
      note,
      size: file.size,
      type: file.type,
      url: blob.url,
      blobPath,
      uploadedAt: new Date().toISOString(),
    };

    // Persist metadata to manifest
    const existing = await getUploadManifest(session.userId) as typeof fileRecord[];
    await saveUploadManifest(session.userId, [fileRecord, ...existing]);

    return NextResponse.json({ success: true, redactedCount, file: fileRecord });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Upload failed: ' + msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { fileId } = await req.json();
  if (!fileId) return NextResponse.json({ error: 'fileId required' }, { status: 400 });

  const manifest = await getUploadManifest(session.userId) as { id: string; url: string; blobPath?: string }[];
  const target = manifest.find(f => f.id === fileId);
  if (!target) return NextResponse.json({ error: 'File not found' }, { status: 404 });

  // Delete the actual blob
  try { await del(target.url); } catch { /* ignore if already gone */ }

  // Remove from manifest
  const updated = manifest.filter(f => f.id !== fileId);
  await saveUploadManifest(session.userId, updated);

  return NextResponse.json({ success: true });
}
