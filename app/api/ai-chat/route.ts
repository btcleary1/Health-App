import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';

export const runtime = 'nodejs';
export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 500 });
  }

  const { message, history, analysis, patientData } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: 'Message is required.' }, { status: 400 });

  const systemPrompt = `You are a medical research assistant helping a family prepare for doctor appointments. You previously ran a deep analysis on this patient's health data.

PATIENT: ${patientData?.name ?? 'Unknown'}, ${patientData?.age ?? ''} ${patientData?.ageGroup ?? ''}
PRIMARY CONCERN: ${patientData?.primaryConcern ?? 'Not specified'}
MEDICATIONS: ${patientData?.medications?.map((m: any) => `${m.name} ${m.dosage} ${m.frequency}`).join(', ') || 'none'}

PRIOR ANALYSIS SUMMARY:
- Top diagnoses: ${analysis?.topDiagnoses?.map((d: any) => `${d.name} (${d.likelihood})`).join(', ') ?? 'see analysis'}
- Key observations: ${analysis?.whatDoctorsMayHaveMissed?.map((o: any) => o.observation).join('; ') ?? 'see analysis'}
- Red flags: ${analysis?.doctorBriefing?.redFlags?.join('; ') ?? 'none listed'}

Answer questions thoroughly but concisely. Reference specific findings from the analysis when relevant. Remind the user this is for appointment preparation only — not medical diagnosis. In emergencies, call 911.`;

  // Build conversation history for the API
  const messages: MessageParam[] = [
    ...(Array.isArray(history) ? history : []),
    { role: 'user', content: message.trim() },
  ];

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const reply = response.content[0].type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ reply });
  } catch (err: any) {
    const detail = err?.status ? `HTTP ${err.status}: ${err.message}` : (err.message || 'Unknown error');
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
