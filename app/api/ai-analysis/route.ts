import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured. Add it to your .env.local file.' },
      { status: 500 }
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

  const systemPrompt = `You are an expert AI medical research assistant specializing in rare and complex pediatric cardiac conditions. You have deep knowledge of the latest medical literature, research, and case studies worldwide.

Your role is to:
1. Analyze this child's complete medical history with fresh eyes — looking for patterns, correlations, and details that overworked clinicians might overlook
2. Draw from the deepest medical knowledge available: cardiology, genetics, neurology, immunology, and rare disease research
3. Identify the most likely diagnoses based on the constellation of symptoms, triggers, and event patterns
4. Surface conditions that match the symptom profile but may not have been considered yet
5. Highlight specific details from the parent's notes that are clinically significant
6. Generate actionable questions the family can bring to each specialist
7. Prepare doctors for this case so they understand the urgency and complexity immediately

Be thorough, compassionate, and specific. Cite specific syndromes, gene mutations, and diagnostic tests by name. This family is desperate for answers — give them the most comprehensive analysis possible.

Format your response as valid JSON matching this structure exactly:
{
  "topDiagnoses": [
    {
      "name": "Condition name",
      "likelihood": "High/Medium/Low",
      "reasoning": "Detailed explanation of why this fits",
      "keyEvidence": ["specific symptom/trigger/pattern that points to this"],
      "missedClues": ["details from parent notes or event data that support this diagnosis"]
    }
  ],
  "whatDoctorsMayHaveMissed": [
    {
      "observation": "Specific overlooked detail",
      "significance": "Why this matters clinically",
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

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const text = content.text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse structured response from AI');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ analysis, model: response.model, usage: response.usage });
  } catch (error: any) {
    console.error('AI analysis error:', error);
    return NextResponse.json({ error: error.message || 'AI analysis failed' }, { status: 500 });
  }
}
