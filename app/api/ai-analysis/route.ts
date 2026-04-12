import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import {
  S3Client,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

export const runtime = 'nodejs';
export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

const ALLOWED_IMAGE_TYPES: ImageMediaType[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

function isImageMediaType(t: string): t is ImageMediaType {
  return ALLOWED_IMAGE_TYPES.includes(t as ImageMediaType);
}

// file.url is now an R2 key (e.g. "health-uploads/userId/filename.jpg")
async function fetchFileFromR2(r2Key: string, fileType: string): Promise<{ data: string; mediaType: string } | null> {
  try {
    const res = await r2.send(new GetObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: r2Key,
    }));
    if (!res.Body) return null;
    const bytes = await res.Body.transformToByteArray();
    const data = Buffer.from(bytes).toString('base64');
    const mediaType = res.ContentType || fileType || 'application/octet-stream';
    return { data, mediaType };
  } catch {
    return null;
  }
}

// Determine how to address the patient based on their age group
function getPatientContext(patientData: any): { addressAs: string; context: string } {
  const ageGroup = patientData?.ageGroup || '';
  const name = patientData?.name || 'the patient';
  switch (ageGroup) {
    case 'infant':
    case 'toddler':
      return { addressAs: name, context: `infant/toddler patient (${patientData?.age || 'young child'})` };
    case 'child':
      return { addressAs: name, context: `pediatric patient (${patientData?.age || 'child'})` };
    case 'teenager':
      return { addressAs: name, context: `teenage patient (${patientData?.age || 'teenager'})` };
    case 'adult':
    case 'senior':
    default:
      return { addressAs: name, context: `adult patient (${patientData?.age || 'adult'})` };
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const body = await req.json();
  const { patientData, events, focusArea, uploadedFiles } = body;

  const { addressAs, context } = getPatientContext(patientData);

  const prompt = `You are a medical research assistant helping prepare for doctor appointments. Return ONLY a valid, complete JSON object — no markdown fences, no text before or after the JSON.

PATIENT: ${addressAs}, ${context}
CONCERN: ${patientData?.primaryConcern || 'Not specified'}
MEDICATIONS: ${patientData?.medications?.map((m: any) => `${m.name} ${m.dosage} ${m.frequency}`).join(', ') || 'none'}
CARE TEAM: ${patientData?.careTeam?.map((c: any) => `${c.name} (${c.role})`).join(', ') || 'none'}
RECENT EVENTS (last 5): ${events?.slice(-5).map((e: any) => `${e.date} ${e.type} sev:${e.severity}`).join('; ') || 'none'}
${focusArea ? `FOCUS: ${focusArea}` : ''}
${uploadedFiles?.length > 0 ? `UPLOADED DOCUMENTS: ${uploadedFiles.map((f: any) => `${f.category} — ${f.originalName}${f.note ? ` (${f.note})` : ''}`).join('; ')}` : ''}

${uploadedFiles?.length > 0 ? 'The uploaded medical documents are attached above. Extract all biometric data, lab values, test results, measurements, and clinical findings visible in the documents and incorporate them into your analysis.\n' : ''}
Return EXACTLY this JSON (max 2 items per array, strings under 80 chars):
{"topDiagnoses":[{"name":"","likelihood":"High/Medium/Low","reasoning":"","keyEvidence":[""],"missedClues":[""]}],"whatDoctorsMayHaveMissed":[{"observation":"","significance":""}],"recommendedTests":[{"test":"","reason":"","urgency":"Immediate/Soon/Routine","specialist":""}],"triggerPatterns":{"identified":[""],"avoidanceRecommendations":[""]},"doctorBriefing":{"oneLineSummary":"","criticalHistory":[""],"questionsToAsk":[""],"redFlags":[""],"medicationsToDiscuss":[""]},"patientGuidance":{"immediateActions":[""],"monitoringTips":[""],"supportNote":""}}

IMPORTANT: For appointment prep only — not medical diagnosis. All findings are topics to discuss with the care team.`;

  // Build the message content array — prepend file blocks before the text prompt
  const contentBlocks: NonNullable<MessageParam['content']> = [];

  if (Array.isArray(uploadedFiles) && uploadedFiles.length > 0) {
    const filesToProcess = uploadedFiles.slice(0, 5);
    for (const file of filesToProcess) {
      const fileType: string = file.type || '';
      // file.url is an R2 key path; fall back to file.blobPath for compatibility
      const r2Key: string = file.url || file.blobPath || '';
      if (!r2Key) continue;

      if (fileType.startsWith('image/')) {
        const fetched = await fetchFileFromR2(r2Key, fileType);
        if (fetched && isImageMediaType(fetched.mediaType)) {
          contentBlocks.push({
            type: 'image',
            source: { type: 'base64', media_type: fetched.mediaType, data: fetched.data },
          });
        }
      } else if (fileType === 'application/pdf') {
        const fetched = await fetchFileFromR2(r2Key, fileType);
        if (fetched) {
          contentBlocks.push({
            type: 'text',
            text: `[PDF document attached: ${file.originalName}${file.note ? ` — ${file.note}` : ''}, category: ${file.category}. Extract all data from this document.]`,
          });
          try {
            (contentBlocks as any[]).push({
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: fetched.data },
            });
          } catch { /* unsupported — text description above covers it */ }
        }
      } else if (fileType === 'text/plain') {
        try {
          const fetched = await fetchFileFromR2(r2Key, fileType);
          if (fetched) {
            const text = Buffer.from(fetched.data, 'base64').toString('utf8');
            contentBlocks.push({ type: 'text', text: `[Text file: ${file.originalName}]\n${text.slice(0, 3000)}` });
          }
        } catch { /* skip */ }
      }
    }
  }

  // Always add the text prompt last
  contentBlocks.push({ type: 'text', text: prompt });

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: contentBlocks }],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
    const start = rawText.indexOf('{');
    const end = rawText.lastIndexOf('}');
    if (start === -1 || end === -1) {
      return new Response(JSON.stringify({ error: 'Could not parse AI response. Try again.' }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      });
    }
    const analysis = JSON.parse(rawText.slice(start, end + 1));
    return new Response(JSON.stringify({ analysis, model: message.model }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    const detail = err?.status ? `HTTP ${err.status}: ${err.message}` : (err.message || 'Unknown error');
    return new Response(JSON.stringify({ error: detail }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
