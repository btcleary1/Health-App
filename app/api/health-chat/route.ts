import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, Tool, ContentBlock, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages';
import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { checkRateLimit } from '@/lib/rate-limit';
import { r2Get, r2Put } from '@/lib/r2';
import {
  getEvents, saveEvents, getDoctorVisits, saveDoctorVisits, getNotes, saveNotes, getPatientInfo, getPersons,
  getLatestAnalysis, ownsPerson, type HealthNote,
} from '@/lib/health-data';
import { redactPiiFromText, validateDoctorName } from '@/lib/pii-validator';
import { removeEntries, type Kind, type LoggedItem } from '@/lib/health-chat-entries';
import { GUARDRAIL_RULES, noApology, screen, scrubReply, type Flag } from '@/lib/chat-guardrails';
import { screenSaved } from '@/lib/saved-text';

// Anything the chat saves gets the same check as text typed into the app's forms.
const refusedSave = (...vals: unknown[]) => vals.flat().map(screenSaved).find((r) => !r.ok) as { ok: false; error: string } | undefined;

export const runtime = 'nodejs';
export const maxDuration = 60;

// The Cleary Health chat, on every page. Every message passes the guardrail screen first. The AI can
// read this account's own records for the person being viewed, explain the latest Deep Medical
// Analysis, and log events, visits and notes (each shown with an Undo button). Chats are not saved:
// only counts of blocked messages (no text, no names) are kept.

type Msg = { role: 'user' | 'assistant'; content: string };
type ChatAction = { type: 'logged'; items: LoggedItem[] } | { type: 'removed'; items: LoggedItem[] } | { type: 'navigate'; path: string; title: string };

const MAX_TURNS = 20;
const MAX_CHARS = 2000;
const PAGES: Record<string, { path: string; title: string }> = {
  dashboard: { path: '/dashboard', title: 'Dashboard' },
  analysis: { path: '/ai-analysis', title: 'Deep Medical Analysis' },
  briefing: { path: '/doctor-briefing', title: 'Doctor briefing' },
  files: { path: '/uploads', title: 'Files' },
  settings: { path: '/settings', title: 'Settings' },
};
const EVENT_TYPES = ['arrhythmia', 'chest_pain', 'palpitations', 'shortness_breath', 'fatigue', 'dizziness', 'cardiac_arrest', 'other'] as const;
const SEVERITIES = ['mild', 'moderate', 'severe', 'critical'] as const;
const VISIT_TYPES = ['routine', 'emergency', 'follow_up'] as const;

const isDay = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const clean = (v: unknown, max = 500) => redactPiiFromText(String(v ?? '').trim().slice(0, max)).redacted;
const list = (v: unknown, max = 8) => (Array.isArray(v) ? v.map((x) => clean(x, 60)).filter(Boolean).slice(0, max) : []);
const newId = () => `${Date.now()}${randomBytes(3).toString('hex')}`;

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { messages?: Msg[]; personId?: string; today?: string } | null;
  const history = (Array.isArray(body?.messages) ? body!.messages : [])
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS * 2) }))
    .slice(-MAX_TURNS);
  while (history.length && history[0].role !== 'user') history.shift();
  const last = history[history.length - 1];
  if (!last || last.role !== 'user') return NextResponse.json({ error: 'Say something first.' }, { status: 400 });
  if (last.content.length > MAX_CHARS) return NextResponse.json({ reply: `That's a long one. Keep it under ${MAX_CHARS} characters.`, actions: [] });

  const personId = typeof body?.personId === 'string' && body.personId ? body.personId : 'primary';
  if (!(await ownsPerson(session.userId, personId))) return NextResponse.json({ error: 'That profile was not found.' }, { status: 404 });

  const serverToday = new Intl.DateTimeFormat('en-CA', { timeZone: process.env.APP_TIMEZONE || 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const today = isDay(body?.today) && Math.abs(Date.parse(body!.today!) - Date.parse(serverToday)) <= 86_400_000 ? body!.today! : serverToday;

  try {
    await checkRateLimit(`chat-${session.userId}`, 40, 'health-chat');
  } catch {
    return NextResponse.json({ reply: "That's a lot of messages at once. Give it a few minutes and try again.", actions: [] });
  }

  // Layer 1: guardrail screen. Blocked messages never reach the AI and are never saved.
  const blocked = screen(last.content);
  if (blocked) {
    await countFlag(blocked.flag);
    return NextResponse.json({ reply: blocked.reply, actions: [], flagged: blocked.flag });
  }

  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return NextResponse.json({ reply: "The chat isn't set up yet.", actions: [] });

  try {
    const persons = await getPersons(session.userId).catch(() => []);
    const patient = (await getPatientInfo(session.userId, personId).catch(() => null)) as { name?: string; ageGroup?: string; primaryConcern?: string } | null;
    const who = persons.find((p) => p.id === personId)?.name || patient?.name || 'the person';
    const out = await converse(new Anthropic({ apiKey: key }), history, {
      userId: session.userId,
      personId,
      today,
      who,
      ageGroup: patient?.ageGroup || persons.find((p) => p.id === personId)?.ageGroup || '',
      concern: patient?.primaryConcern || '',
    });
    return NextResponse.json(out);
  } catch (e) {
    console.error('Health chat error:', e);
    return NextResponse.json({ reply: "I'm having trouble right now. Try again in a minute.", actions: [], degraded: true });
  }
}

// ---------- The AI ----------

type Ctx = { userId: string; personId: string; today: string; who: string; ageGroup: string; concern: string };

function systemPrompt(c: Ctx) {
  return `You are the chat inside Cleary Health, a private app where a person keeps health records for themself or a family member and prepares for doctor appointments. You're an AI: clear, calm and brief. Today is ${c.today}.
You're helping with records for: ${c.who}${c.ageGroup ? ` (${c.ageGroup})` : ''}.${c.concern ? ` Main concern on file: ${c.concern}.` : ''}

What you do
- Log health events, doctor visits and notes when the person describes them. Use log_event for something that happened to the body (an episode, symptom, attack or fall), log_visit for an appointment, ER trip or telehealth call, and add_note for anything else worth remembering (an observation, a question for the doctor, a medicine that was given). Dates: today unless they say otherwise ("yesterday", a weekday, a date); never a future date. If something important is missing (when it happened, how bad), ask one short question instead of guessing. Never invent details.
- After logging, the app shows what was saved with an Undo button. Reply in one short line; don't repeat every field.
- Answer questions about this person's own records with get_records, and about the Deep Medical Analysis with get_analysis. Explain the analysis in plain words: what it lists, why, and what to ask the doctor. If there's no saved analysis, say so and suggest running one from the Analysis page.
- "Undo", "delete that": call remove_entries with the ids from the most recent log, or find them with get_records first. Only remove what they clearly asked to remove.
- To open a page, call open_page.
- Replies: short. Light markdown only (**bold**, short "-" lists). No headings, tables or emoji.

${GUARDRAIL_RULES}`;
}

const TOOLS: Tool[] = [
  {
    name: 'log_event',
    description: 'Save a health event (an episode or symptom that happened) to this person\'s records.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD' },
        time: { type: 'string', description: 'HH:MM 24-hour, if known' },
        type: { type: 'string', enum: [...EVENT_TYPES], description: "Closest match; 'other' if none fits" },
        severity: { type: 'string', enum: [...SEVERITIES] },
        symptoms: { type: 'array', items: { type: 'string' } },
        triggers: { type: 'array', items: { type: 'string' } },
        duration: { type: 'string', description: "e.g. '10 minutes'" },
        notes: { type: 'string', description: 'What happened, in the person\'s words' },
        heartRate: { type: 'number' },
        bloodPressure: { type: 'string', description: "e.g. '120/80'" },
        oxygen: { type: 'number', description: 'SpO2 percent' },
      },
      required: ['date', 'type', 'severity'],
    },
  },
  {
    name: 'log_visit',
    description: 'Save a doctor visit to this person\'s records. Doctor: first name or "Dr. Firstname" only.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD' },
        doctor: { type: 'string' },
        visitType: { type: 'string', enum: [...VISIT_TYPES] },
        diagnosis: { type: 'string', description: 'Only what the doctor said, if they said it' },
        doctorNotes: { type: 'string', description: 'What the doctor said or did' },
        personalNotes: { type: 'string', description: 'The person\'s own notes about the visit' },
        treatment: { type: 'array', items: { type: 'string' }, description: 'Tests ordered, treatments or medicine changes' },
        medicationsChanged: { type: 'boolean' },
      },
      required: ['date', 'visitType'],
    },
  },
  {
    name: 'add_note',
    description: 'Save a free-form note to this person\'s records.',
    input_schema: { type: 'object', properties: { date: { type: 'string', description: 'YYYY-MM-DD' }, text: { type: 'string' } }, required: ['text'] },
  },
  {
    name: 'get_records',
    description: 'Read this person\'s own events, visits and notes from the last N days (max 730), newest first, with ids.',
    input_schema: { type: 'object', properties: { kind: { type: 'string', enum: ['events', 'visits', 'notes', 'all'] }, days: { type: 'integer', minimum: 1, maximum: 730 } }, required: ['kind'] },
  },
  {
    name: 'get_analysis',
    description: 'Read the latest saved Deep Medical Analysis for this person (an AI research summary for appointment prep, not a diagnosis).',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'remove_entries',
    description: 'Delete entries from this person\'s records by kind and id. Only when the person clearly asks.',
    input_schema: {
      type: 'object',
      properties: { items: { type: 'array', maxItems: 10, items: { type: 'object', properties: { kind: { type: 'string', enum: ['event', 'visit', 'note'] }, id: { type: 'string' } }, required: ['kind', 'id'] } } },
      required: ['items'],
    },
  },
  {
    name: 'open_page',
    description: 'Open a page of the app.',
    input_schema: { type: 'object', properties: { page: { type: 'string', enum: Object.keys(PAGES) } }, required: ['page'] },
  },
];

async function converse(client: Anthropic, history: Msg[], ctx: Ctx) {
  const messages: MessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
  const actions: ChatAction[] = [];
  let reply = '';
  for (let round = 0; round < 6; round++) {
    const res = await client.messages.create({
      model: process.env.HEALTH_CHAT_MODEL || 'claude-sonnet-4-6',
      max_tokens: 900,
      system: systemPrompt(ctx),
      tools: TOOLS,
      messages,
    });
    const text = res.content.filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text').map((b) => b.text).join('\n').trim();
    if (text) reply = reply ? `${reply}\n\n${text}` : text;
    const uses = res.content.filter((b): b is Extract<ContentBlock, { type: 'tool_use' }> => b.type === 'tool_use');
    if (res.stop_reason !== 'tool_use' || !uses.length) break;
    messages.push({ role: 'assistant', content: res.content });
    const results: ToolResultBlockParam[] = [];
    for (const u of uses) {
      const r = await runTool(u.name, (u.input ?? {}) as Record<string, unknown>, ctx, actions).catch((e) => ({ ok: false, error: String(e?.message || e) }));
      results.push({ type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(r) });
    }
    messages.push({ role: 'user', content: results });
    reply = '';
  }
  return { reply: noApology(scrubReply(reply || 'Done.')), actions };
}

async function runTool(name: string, input: Record<string, unknown>, ctx: Ctx, actions: ChatAction[]) {
  const { userId, personId, today } = ctx;
  const day = (v: unknown) => (isDay(v) ? v : today);
  if (['log_event', 'log_visit', 'add_note'].includes(name) && actions.filter((a) => a.type === 'logged').length >= 3) {
    return { ok: false, error: 'Already logged several things this turn. Ask before logging more.' };
  }

  if (name === 'log_event') {
    const date = day(input.date);
    if (date > today) return { ok: false, error: 'That date is in the future.' };
    const type = (EVENT_TYPES as readonly string[]).includes(String(input.type)) ? String(input.type) : 'other';
    const severity = (SEVERITIES as readonly string[]).includes(String(input.severity)) ? String(input.severity) : 'mild';
    const num = (v: unknown, lo: number, hi: number) => (typeof v === 'number' && v >= lo && v <= hi ? Math.round(v) : undefined);
    const event = {
      id: newId(),
      date,
      time: typeof input.time === 'string' && /^\d{1,2}:\d{2}$/.test(input.time) ? input.time.padStart(5, '0') : '',
      type,
      severity,
      duration: clean(input.duration, 40),
      symptoms: list(input.symptoms),
      triggers: list(input.triggers),
      vitals: { heartRate: num(input.heartRate, 20, 300) ?? 0, bloodPressure: /^\d{2,3}\/\d{2,3}$/.test(String(input.bloodPressure ?? '')) ? String(input.bloodPressure) : '', oxygen: num(input.oxygen, 50, 100) ?? 0 },
      notes: clean(input.notes, 1000),
      resolved: false,
      source: 'ai-chat',
    };
    const refusedEvent = refusedSave(event.duration, event.symptoms, event.triggers, event.notes);
    if (refusedEvent) return { ok: false, error: refusedEvent.error };
    const events = (await getEvents(userId, personId)) as unknown[];
    await saveEvents(userId, [event, ...events], personId);
    const item: LoggedItem = { kind: 'event', id: event.id, date, title: `${type.replace('_', ' ')} · ${severity}`, detail: [event.time, event.duration, event.symptoms.join(', ')].filter(Boolean).join(' · ') };
    actions.push({ type: 'logged', items: [item] });
    return { ok: true, saved: { kind: 'event', id: event.id, date, type, severity }, note: 'Saved. The app shows it with an Undo button.' };
  }

  if (name === 'log_visit') {
    const date = day(input.date);
    if (date > today) return { ok: false, error: 'That date is in the future. Log the visit after it happens, or save a note about the appointment.' };
    const doctor = clean(input.doctor, 40);
    const bad = validateDoctorName(doctor);
    if (bad) return { ok: false, error: `${bad} Ask for just one name.` };
    const visit = {
      id: newId(),
      date,
      doctor,
      visitType: (VISIT_TYPES as readonly string[]).includes(String(input.visitType)) ? String(input.visitType) : 'routine',
      diagnosis: clean(input.diagnosis, 200) || undefined,
      doctorNotes: clean(input.doctorNotes, 1000),
      personalNotes: clean(input.personalNotes, 1000),
      treatment: list(input.treatment, 10),
      medicationsChanged: Boolean(input.medicationsChanged),
      cardiacEventsDuringVisit: 0,
      source: 'ai-chat',
    };
    const refusedVisit = refusedSave(visit.doctor, visit.diagnosis, visit.doctorNotes, visit.personalNotes, visit.treatment);
    if (refusedVisit) return { ok: false, error: refusedVisit.error };
    const visits = (await getDoctorVisits(userId, personId)) as unknown[];
    await saveDoctorVisits(userId, [visit, ...visits], personId);
    const item: LoggedItem = { kind: 'visit', id: visit.id, date, title: `${visit.visitType.replace('_', ' ')} visit${doctor ? ` · ${doctor}` : ''}`, detail: [visit.diagnosis, visit.treatment.join(', ')].filter(Boolean).join(' · ') };
    actions.push({ type: 'logged', items: [item] });
    return { ok: true, saved: { kind: 'visit', id: visit.id, date, doctor }, note: 'Saved. The app shows it with an Undo button.' };
  }

  if (name === 'add_note') {
    const text = clean(input.text, 1000);
    if (!text) return { ok: false, error: 'Empty note.' };
    const refusedNote = refusedSave(text);
    if (refusedNote) return { ok: false, error: refusedNote.error };
    const date = day(input.date);
    if (date > today) return { ok: false, error: 'That date is in the future.' };
    const note: HealthNote = { id: randomBytes(8).toString('hex'), date, text, source: 'ai-chat', createdAt: new Date().toISOString() };
    const notes = await getNotes(userId, personId);
    await saveNotes(userId, [note, ...notes], personId);
    const item: LoggedItem = { kind: 'note', id: note.id, date, title: 'Note', detail: text.length > 90 ? text.slice(0, 90) + '…' : text };
    actions.push({ type: 'logged', items: [item] });
    return { ok: true, saved: { kind: 'note', id: note.id, date }, note: 'Saved. The app shows it with an Undo button.' };
  }

  if (name === 'get_records') {
    const days = Math.min(730, Math.max(1, Number(input.days) || 90));
    const from = new Date(Date.parse(today) - (days - 1) * 86_400_000).toISOString().slice(0, 10);
    const kind = String(input.kind || 'all');
    const inRange = (d: unknown) => typeof d === 'string' && d >= from && d <= today;
    const out: Record<string, unknown> = { from, to: today };
    if (kind === 'events' || kind === 'all') out.events = ((await getEvents(userId, personId)) as any[]).filter((e) => inRange(e?.date)).slice(0, 60).map((e) => ({ id: e.id, date: e.date, time: e.time, type: e.type, severity: e.severity, duration: e.duration, symptoms: e.symptoms, triggers: e.triggers, vitals: e.vitals, notes: e.notes }));
    if (kind === 'visits' || kind === 'all') out.visits = ((await getDoctorVisits(userId, personId)) as any[]).filter((v) => inRange(v?.date)).slice(0, 40).map((v) => ({ id: v.id, date: v.date, doctor: v.doctor, visitType: v.visitType, diagnosis: v.diagnosis, doctorNotes: v.doctorNotes, personalNotes: v.personalNotes, treatment: v.treatment, medicationsChanged: v.medicationsChanged }));
    if (kind === 'notes' || kind === 'all') out.notes = (await getNotes(userId, personId)).filter((n) => inRange(n.date)).slice(0, 60).map((n) => ({ id: n.id, date: n.date, text: n.text }));
    const patient = (await getPatientInfo(userId, personId).catch(() => null)) as any;
    if (patient) out.profile = { ageGroup: patient.ageGroup, primaryConcern: patient.primaryConcern, medications: patient.medications, careTeamRoles: Array.isArray(patient.careTeam) ? patient.careTeam.map((c: any) => c?.role).filter(Boolean) : undefined };
    return out;
  }

  if (name === 'get_analysis') {
    const saved = await getLatestAnalysis(userId, personId);
    if (!saved) return { found: false, note: 'No analysis saved yet for this person. They can run one on the Analysis page.' };
    return { found: true, ranOn: saved.createdAt.slice(0, 10), focusArea: saved.focusArea, analysis: saved.analysis, reminder: 'AI research summary for appointment prep. Not a diagnosis. Attribute findings to the analysis and end with the not-medical-advice line.' };
  }

  if (name === 'remove_entries') {
    const items = (Array.isArray(input.items) ? input.items : []).slice(0, 10) as { kind?: string; id?: string }[];
    const removed = await removeEntries(userId, personId, items.map((i) => ({ kind: String(i.kind) as Kind, id: String(i.id) })));
    if (removed.length) actions.push({ type: 'removed', items: removed });
    return { ok: true, removed: removed.map((r) => `${r.kind} ${r.date} ${r.title}`), not_found: items.length - removed.length };
  }

  if (name === 'open_page') {
    const p = PAGES[String(input.page)];
    if (!p) return { ok: false, error: 'Unknown page.' };
    if (actions.some((a) => a.type === 'navigate')) return { ok: false, error: 'Already opening a page.' };
    actions.push({ type: 'navigate', ...p });
    return { ok: true, opened: p.title };
  }
  return { ok: false, error: 'Unknown tool.' };
}

// Counts of blocked messages by type (no message text, no names), for the owner.
async function countFlag(flag: Flag) {
  try {
    const k = 'health-chat/flags.json';
    const cur = (await r2Get<Record<string, number>>(k)) || {};
    cur[flag] = (cur[flag] || 0) + 1;
    await r2Put(k, JSON.stringify(cur));
  } catch {
    /* best-effort */
  }
}
