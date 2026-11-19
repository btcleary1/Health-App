import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { checkRateLimit, recordFailure } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/audit';
import { r2GetBytes } from '@/lib/r2';
import { getUploadManifest, ownsPerson, saveLatestAnalysis } from '@/lib/health-data';
import { screenSaved } from '@/lib/saved-text';

export const runtime = 'nodejs';
export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

const ALLOWED_IMAGE_TYPES: ImageMediaType[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

function isImageMediaType(t: string): t is ImageMediaType {
  return ALLOWED_IMAGE_TYPES.includes(t as ImageMediaType);
}

async function fetchFileFromR2(r2Key: string, fileType: string): Promise<{ data: string; mediaType: string } | null> {
  const buf = await r2GetBytes(r2Key);
  if (!buf) return null;
  return { data: buf.toString('base64'), mediaType: fileType || 'application/octet-stream' };
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

  const ip = getClientIp(req);
  try {
    await checkRateLimit(ip, 10, 'ai-analysis');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Too many requests.';
    return new Response(JSON.stringify({ error: msg }), { status: 429, headers: { 'Content-Type': 'application/json' } });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const body = await req.json();
  const { patientData, events, doctorVisits, notes, focusArea, uploadedFiles, personId } = body;

  const focus = screenSaved(typeof focusArea === 'string' ? focusArea.slice(0, 300) : '');
  if (!focus.ok) {
    return new Response(JSON.stringify({ error: focus.error }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { addressAs, context } = getPatientContext(patientData);

  const visitsText = Array.isArray(doctorVisits) && doctorVisits.length > 0
    ? doctorVisits.slice(-5).map((v: any) =>
        `[${v.date}] ${v.visitType?.replace('_', ' ')} with ${v.doctor || 'unknown doctor'}` +
        (v.diagnosis ? ` | Diagnosis: ${v.diagnosis}` : '') +
        (v.doctorNotes ? ` | Doctor notes: ${v.doctorNotes}` : '') +
        (v.personalNotes ? ` | Personal notes: ${v.personalNotes}` : '') +
        (v.treatment?.length ? ` | Treatment: ${v.treatment.join(', ')}` : '') +
        (v.medicationsChanged ? ' | Medications changed' : '')
      ).join('\n')
    : 'No doctor visits recorded';

  const eventsText = Array.isArray(events) && events.length > 0
    ? events.slice(-10).map((e: any) =>
        `[${e.date}${e.time ? ' ' + e.time : ''}] ${e.type} — severity: ${e.severity}` +
        (e.symptoms?.length ? ` | symptoms: ${e.symptoms.join(', ')}` : '') +
        (e.triggers?.length ? ` | triggers: ${e.triggers.join(', ')}` : '') +
        (e.vitals ? ` | vitals: HR ${e.vitals.heartRate}, BP ${e.vitals.bloodPressure}, O2 ${e.vitals.oxygen}%` : '') +
        (e.parentNotes?.duringEvent ? ` | notes: ${e.parentNotes.duringEvent}` : '') +
        (e.notes ? ` | notes: ${e.notes}` : '')
      ).join('\n')
    : 'No health events recorded';

  const notesText = Array.isArray(notes) && notes.length > 0
    ? notes.slice(-20).map((n: any) =>
        `[${n.date}] ${n.text}${n.source === 'ai-chat' ? ' (from AI chat)' : ''}`
      ).join('\n')
    : null;

  const prompt = `You are a medical research assistant helping prepare for doctor appointments. Analyze ALL the data below thoroughly and return ONLY a valid, complete JSON object — no markdown fences, no text before or after the JSON.

PATIENT: ${addressAs}, ${context}
CONCERN: ${patientData?.primaryConcern || 'Not specified'}
MEDICATIONS: ${patientData?.medications?.map((m: any) => `${m.name} ${m.dosage} ${m.frequency}`).join(', ') || 'none'}
CARE TEAM: ${patientData?.careTeam?.map((c: any) => `${c.name} (${c.role})`).join(', ') || 'none'}

DOCTOR VISITS (most recent first):
${visitsText}

HEALTH EVENTS (most recent first):
${eventsText}

${notesText ? `CAREGIVER NOTES (observations outside of visits/events):\n${notesText}\n` : ''}${focusArea ? `FOCUS AREA: ${focusArea}\n` : ''}${uploadedFiles?.length > 0 ? `UPLOADED DOCUMENTS: ${uploadedFiles.map((f: any) => `${f.category} — ${f.originalName}${f.note ? ` (${f.note})` : ''}`).join('; ')}` : ''}

${uploadedFiles?.length > 0 ? 'The uploaded medical documents/screenshots are attached above as images. Extract ALL biometric data, lab values, test results, measurements, diagnoses, and clinical findings visible in the images and incorporate them into your analysis. These are the most important source of clinical data.\n' : ''}
Base your analysis on ALL the above data. Be specific — reference actual dates, doctor names, diagnoses, and values from the records above. Do not give generic advice.

Return EXACTLY this JSON (max 3 items per array, strings under 100 chars):
{"topDiagnoses":[{"name":"","likelihood":"High/Medium/Low","reasoning":"","keyEvidence":[""],"missedClues":[""]}],"whatDoctorsMayHaveMissed":[{"observation":"","significance":""}],"recommendedTests":[{"test":"","reason":"","urgency":"Immediate/Soon/Routine","specialist":""}],"triggerPatterns":{"identified":[""],"avoidanceRecommendations":[""]},"doctorBriefing":{"oneLineSummary":"","criticalHistory":[""],"questionsToAsk":[""],"redFlags":[""],"medicationsToDiscuss":[""]},"patientGuidance":{"immediateActions":[""],"monitoringTips":[""],"supportNote":""}}

IMPORTANT: For appointment prep only — not medical diagnosis. All findings are topics to discuss with the care team.`;

  // Build the message content array — prepend file blocks before the text prompt
  const contentBlocks: NonNullable<MessageParam['content']> = [];

  if (Array.isArray(uploadedFiles) && uploadedFiles.length > 0) {
    // Resolve allowed keys from the user's own manifest — never trust client-supplied paths
    const manifest: any[] = await getUploadManifest(session.userId, body.personId);
    const allowedKeys = new Set(manifest.map((f: any) => f.blobPath ?? f.url));

    const filesToProcess = uploadedFiles.slice(0, 20).filter((file: any) => {
      const r2Key: string = file.url || file.blobPath || '';
      return r2Key && allowedKeys.has(r2Key);
    });

    // Fetch all files in parallel
    const fetched = await Promise.all(
      filesToProcess.map((file: any) => fetchFileFromR2(file.url || file.blobPath, file.type || ''))
    );

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      const result = fetched[i];
      if (!result) continue;
      const fileType: string = file.type || '';

      if (fileType.startsWith('image/') && isImageMediaType(result.mediaType)) {
        contentBlocks.push({
          type: 'image',
          source: { type: 'base64', media_type: result.mediaType, data: result.data },
        });
      } else if (fileType === 'application/pdf') {
        contentBlocks.push({
          type: 'text',
          text: `[PDF document attached: ${file.originalName}${file.note ? ` — ${file.note}` : ''}, category: ${file.category}. Extract all data from this document.]`,
        });
        try {
          (contentBlocks as any[]).push({
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: result.data },
          });
        } catch { /* unsupported — text description above covers it */ }
      } else if (fileType === 'text/plain') {
        const text = Buffer.from(result.data, 'base64').toString('utf8');
        contentBlocks.push({ type: 'text', text: `[Text file: ${file.originalName}]\n${text.slice(0, 3000)}` });
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
    // Keep the latest analysis for this person so the chat can answer questions about it anywhere in the app.
    if (await ownsPerson(session.userId, personId).catch(() => false)) {
      await saveLatestAnalysis(session.userId, { analysis, createdAt: new Date().toISOString(), focusArea: typeof focusArea === 'string' ? focusArea.slice(0, 300) : undefined, model: message.model }, personId).catch(() => null);
    }
    return new Response(JSON.stringify({ analysis, model: message.model }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    await recordFailure(ip, 10, 'ai-analysis');
    return new Response(JSON.stringify({ error: 'Analysis failed. Please try again.' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
