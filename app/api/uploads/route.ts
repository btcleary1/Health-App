import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});
const BUCKET = () => process.env.R2_BUCKET!;
import { getSessionFromRequest } from '@/lib/session';
import { redactPiiFromText, detectPiiInText } from '@/lib/pii-validator';
import { getUploadManifest, saveUploadManifest } from '@/lib/health-data';

export const runtime = 'nodejs';

const MAX_PER_UPLOAD = 15;
const MAX_TOTAL = 500;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'];

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const personId = req.nextUrl.searchParams.get('personId') ?? undefined;
  const files = await getUploadManifest(session.userId, personId);
  return NextResponse.json({ files });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const personId = req.nextUrl.searchParams.get('personId') ?? undefined;

  try {
    const formData = await req.formData();
    const category = (formData.get('category') as string) || 'general';
    const note = (formData.get('note') as string) || '';

    // Reject PII in note
    const noteWarnings = detectPiiInText(note);
    if (noteWarnings.length > 0) {
      return NextResponse.json({ error: 'Note contains personal information (phone number or address). Please remove it before uploading.' }, { status: 400 });
    }

    // Support both multi-file ('files') and legacy single-file ('file') fields
    const multiFiles = formData.getAll('files') as File[];
    const singleFile = formData.get('file') as File | null;
    const allFiles = multiFiles.length > 0 ? multiFiles : singleFile ? [singleFile] : [];

    if (allFiles.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }
    if (allFiles.length > MAX_PER_UPLOAD) {
      return NextResponse.json({ error: `Upload up to ${MAX_PER_UPLOAD} files at a time.` }, { status: 400 });
    }

    const totalSize = allFiles.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'Total upload size exceeds 50MB limit.' }, { status: 413 });
    }

    // Check total cap
    const existing = await getUploadManifest(session.userId, personId) as any[];
    const slots = MAX_TOTAL - existing.length;
    if (slots <= 0) {
      return NextResponse.json({ error: `Maximum ${MAX_TOTAL} files reached for this profile.` }, { status: 400 });
    }

    const toProcess = allFiles.slice(0, slots);
    const uploaded: any[] = [];
    const errors: string[] = [];

    for (const file of toProcess) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: unsupported type (use JPEG, PNG, GIF, WebP, PDF, or TXT)`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: too large (max 10MB per file)`);
        continue;
      }

      const fileId = require('crypto').randomBytes(16).toString('hex');
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const blobPath = `health-uploads/${session.userId}/${fileId}_${category}_${safeName}`;

      let uploadBody: Blob = file;
      let redactedCount = 0;

      if (file.type === 'text/plain') {
        const rawText = await file.text();
        const { redacted, changes } = redactPiiFromText(rawText);
        redactedCount = changes;
        uploadBody = new Blob([redacted], { type: 'text/plain' });
      }

      const arrayBuffer = await uploadBody.arrayBuffer();
      await r2.send(new PutObjectCommand({
        Bucket: BUCKET(),
        Key: blobPath,
        Body: Buffer.from(arrayBuffer),
        ContentType: file.type,
      }));

      uploaded.push({
        id: fileId,
        originalName: file.name,
        category,
        note,
        size: file.size,
        type: file.type,
        url: blobPath,
        blobPath,
        uploadedAt: new Date().toISOString(),
        redactedCount,
      });
    }

    if (uploaded.length === 0) {
      return NextResponse.json({ error: errors[0] ?? 'Upload failed' }, { status: 400 });
    }

    const updatedManifest = [...uploaded, ...existing];
    await saveUploadManifest(session.userId, updatedManifest, personId);

    // Legacy single-file response shape + multi-file shape
    return NextResponse.json({
      success: true,
      file: uploaded[0],       // backward compat
      files: uploaded,          // multi-file
      redactedCount: uploaded.reduce((s, f) => s + (f.redactedCount ?? 0), 0),
      errors,
      total: updatedManifest.length,
    });
  } catch {
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const personId = req.nextUrl.searchParams.get('personId') ?? undefined;

  const { fileId } = await req.json();
  if (!fileId) return NextResponse.json({ error: 'fileId required' }, { status: 400 });

  const manifest = await getUploadManifest(session.userId, personId) as { id: string; url: string; blobPath?: string }[];
  const target = manifest.find(f => f.id === fileId);
  if (!target) return NextResponse.json({ error: 'File not found' }, { status: 404 });

  try {
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: target.blobPath ?? target.url }));
  } catch { /* ignore if already gone */ }

  const updated = manifest.filter(f => f.id !== fileId);
  await saveUploadManifest(session.userId, updated, personId);

  return NextResponse.json({ success: true });
}
