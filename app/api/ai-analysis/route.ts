import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured. Add it to your .env.local file.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const body = await req.json();
  const { patientData, events, focusArea } = body;

  const eventsText = events?.length
    ? events.map((e: any) => `
- ${e.date} ${e.time}: ${e.type.replace(/_/g, ' ')} (${e.severity})
  Symptoms: ${e.symptoms?.join(', ')}
  Triggers: ${e.triggers?.join(', ') || 'none noted'}
  Vitals: HR ${e.vitals?.heartRate}, BP ${e.vitals?.bloodPressure}, O2 ${e.vitals?.oxygen}%
  Duration: ${e.duration}
  ${e.cprRequired ? `CPR REQUIRED: ${e.cprDuration}` : ''}
  Parent notes before: ${e.parentNotes?.beforeEvent || 'none'}
  Parent notes during: ${e.parentNotes?.duringEvent || 'none'}
  Parent notes after: ${e.parentNotes?.afterEvent || 'none'}
  Activities prior: ${e.parentNotes?.activitiesPrior || 'none'}
  Emotional state: ${e.parentNotes?.emotionalState || 'none'}
  Medications given: ${e.parentNotes?.medicationsGiven || 'none'}`).join('\n')
    : 'No events recorded yet.';

  const systemPrompt = `You are an expert AI medical research assistant. Your role is to help families prepare for doctor appointments by organizing health information and generating research questions — NOT to diagnose, treat, or replace clinical judgment.

IMPORTANT: You are a research preparation tool. All output must be framed as topics to discuss with the care team, not as diagnoses or clinical recommendations. Never state that a condition is definitively present. Always frame findings as research questions for the treating physician.

Your role is to:
1. Organize the patient's health history and identify patterns worth discussing with the care team
2. Research medical conditions that share similar symptom profiles — for the family to explore with their doctor
3. Highlight observations from parent notes that may be worth raising at the next appointment
4. Generate specific, informed questions the family can bring to each specialist
5. Summarize the case so new care team members can quickly understand the history
6. Identify tests that the family might ask their doctor about

Be thorough, compassionate, and specific. Cite specific syndromes, gene mutations, and diagnostic tests by name — always framed as "conditions to discuss with your doctor" or "questions to ask." This family needs help preparing for appointments and navigating the medical system.

CRITICAL DISCLAIMER: This analysis is for research preparation and appointment planning only. It does not constitute medical advice, diagnosis, or treatment. All findings must be reviewed and validated by a licensed healthcare professional.

Format your response as valid JSON matching this structure exactly:
{
  "topDiagnoses": [
    {
      "name": "Condition name (to discuss with doctor)",
      "likelihood": "High/Medium/Low match to symptom profile",
      "reasoning": "Detailed explanation of why this condition shares features with the patient's history — for discussion with the care team",
      "keyEvidence": ["specific symptom/trigger/pattern worth raising with the doctor"],
      "missedClues": ["details from parent notes that may be worth highlighting at the next appointment"]
    }
  ],
  "whatDoctorsMayHaveMissed": [
    {
      "observation": "Observation worth raising with the care team",
      "significance": "Why this may be clinically relevant — to confirm with the doctor",
      "source": "Which event/note this came from"
    }
  ],
  "recommendedTests": [
    {
      "test": "Test name",
      "reason": "What it rules in or out",
      "urgency": "Immediate/Soon/Routine",
      "specialist": "Who orders this"
    }
  ],
  "similarCasesAndResearch": [
    {
      "title": "Similar case or research finding",
      "relevance": "How it relates to this patient",
      "source": "Medical literature reference or known case pattern"
    }
  ],
  "triggerPatterns": {
    "identified": ["Pattern found in event data"],
    "avoidanceRecommendations": ["Specific thing to avoid and why"]
  },
  "doctorBriefing": {
    "oneLineSummary": "Urgent single-sentence clinical summary",
    "criticalHistory": ["Most critical historical facts for a new doctor"],
    "questionsToAsk": ["Specific question to raise with this specialist"],
    "redFlags": ["Immediate warning signs to watch for"],
    "medicationsToDiscuss": ["Medication or class of medication to ask about"]
  },
  "parentGuidance": {
    "immediateActions": ["What to do right now"],
    "monitoringTips": ["What to track and document for next appointment"],
    "emotionalSupport": "Brief acknowledgment of how hard this is"
  }
}`;

  const userPrompt = `Please analyze this pediatric cardiac patient's complete history:

PATIENT: ${patientData?.name || 'Child'}, Age ${patientData?.age || 'unknown'}
PRIMARY CONCERN: ${patientData?.primaryConcern || 'Cardiac symptoms'}
CURRENT MEDICATIONS: ${patientData?.medications?.map((m: any) => `${m.name} ${m.dosage} ${m.frequency}`).join(', ') || 'None listed'}
LAST VISIT: ${patientData?.lastVisit || 'Unknown'}
NEXT APPOINTMENT: ${patientData?.nextAppointment || 'Unknown'}
CARE TEAM: ${patientData?.careTeam?.map((c: any) => `${c.name} (${c.role})`).join(', ') || 'None listed'}

COMPLETE EVENT HISTORY (${events?.length || 0} events):
${eventsText}

${focusArea ? `SPECIFIC FOCUS FOR THIS ANALYSIS: ${focusArea}` : ''}

Please analyze every detail — especially the parent notes about what was happening before, during, and after each event. Look for patterns across events. Identify what is being missed. Give this family the best medical knowledge available.`;

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  const run = async () => {
    try {
      const stream = client.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      let fullText = '';
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          fullText += event.delta.text;
        }
        // Send newlines to keep the connection alive while Claude generates.
        // JSON.parse ignores leading whitespace, so the client can still call res.json().
        await writer.write(encoder.encode('\n'));
      }

      const finalMessage = await stream.finalMessage();

      const stripped = fullText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      const start = stripped.indexOf('{');
      const end = stripped.lastIndexOf('}');
      if (start === -1 || end === -1) {
        throw new Error('Could not find JSON in AI response');
      }

      let analysis;
      try {
        analysis = JSON.parse(stripped.slice(start, end + 1));
      } catch {
        throw new Error('AI returned malformed JSON. Try again.');
      }

      await writer.write(
        encoder.encode(JSON.stringify({ analysis, model: finalMessage.model, usage: finalMessage.usage }))
      );
    } catch (error: any) {
      console.error('AI analysis error:', error);
      await writer.write(encoder.encode(JSON.stringify({ error: error.message || 'AI analysis failed' })));
    } finally {
      await writer.close();
    }
  };

  run();

  return new Response(readable, {
    headers: { 'Content-Type': 'application/json' },
  });
}
