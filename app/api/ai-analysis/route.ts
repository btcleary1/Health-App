import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const body = await req.json();
  const { patientData, events, focusArea } = body;

  const eventsText = events?.length
    ? events.map((e: any) =>
        `- ${e.date} ${e.time}: ${e.type.replace(/_/g, ' ')} (${e.severity}) | symptoms: ${e.symptoms?.join(', ')} | triggers: ${e.triggers?.join(', ') || 'none'} | HR:${e.vitals?.heartRate} BP:${e.vitals?.bloodPressure} O2:${e.vitals?.oxygen}% | CPR:${e.cprRequired ? 'YES ' + e.cprDuration : 'no'} | notes: ${e.parentNotes?.beforeEvent || ''} / ${e.parentNotes?.duringEvent || ''} / ${e.parentNotes?.afterEvent || ''}`
      ).join('\n')
    : 'No events recorded.';

  const prompt = `You are a medical research assistant helping a family prepare for doctor appointments. Analyze this patient's history and return ONLY valid JSON — no markdown, no explanation outside the JSON.

PATIENT: ${patientData?.name || 'Child'}, Age ${patientData?.age}
CONCERN: ${patientData?.primaryConcern}
MEDICATIONS: ${patientData?.medications?.map((m: any) => `${m.name} ${m.dosage} ${m.frequency}`).join(', ') || 'none'}
CARE TEAM: ${patientData?.careTeam?.map((c: any) => `${c.name} (${c.role})`).join(', ') || 'none'}
EVENTS (${events?.length || 0}):
${eventsText}
${focusArea ? `FOCUS: ${focusArea}` : ''}

Return this JSON structure (be concise — 2-3 items per array max):
{
  "topDiagnoses": [{"name":"","likelihood":"High/Medium/Low","reasoning":"","keyEvidence":[],"missedClues":[]}],
  "whatDoctorsMayHaveMissed": [{"observation":"","significance":"","source":""}],
  "recommendedTests": [{"test":"","reason":"","urgency":"Immediate/Soon/Routine","specialist":""}],
  "similarCasesAndResearch": [{"title":"","relevance":"","source":""}],
  "triggerPatterns": {"identified":[],"avoidanceRecommendations":[]},
  "doctorBriefing": {"oneLineSummary":"","criticalHistory":[],"questionsToAsk":[],"redFlags":[],"medicationsToDiscuss":[]},
  "parentGuidance": {"immediateActions":[],"monitoringTips":[],"emotionalSupport":""}
}

IMPORTANT: This is for appointment preparation only, not medical diagnosis. All findings are topics to discuss with the care team.`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
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
    return new Response(JSON.stringify({ error: err.message || 'AI analysis failed.' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
