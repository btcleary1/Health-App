'use client';

import { useState, useEffect } from 'react';
import HealthHeader from '@/components/HealthHeader';
import HIPAAFooter from '@/components/HIPAAFooter';
import { Brain, Loader2, ChevronDown, ChevronUp, AlertTriangle, Search, ClipboardList, Lightbulb, HeartPulse, Shield, Send, BookmarkPlus, Check } from 'lucide-react';
import { usePersonContext } from '@/lib/PersonContext';

const SAMPLE_PATIENT_DATA = {
  name: 'Ethan Alvarez',
  age: 7,
  primaryConcern: 'Life-threatening cardiac arrhythmias requiring frequent CPR - suspected Long QT Syndrome',
  careTeam: [
    { name: 'Dr. S. Patel', role: 'Pediatric Cardiologist' },
    { name: 'Dr. A. Nguyen', role: 'Pediatric Critical Care' },
    { name: 'Dr. M. Johnson', role: 'Genetic Counselor' },
  ],
  medications: [
    { name: 'Propranolol', dosage: '10mg', frequency: 'Three times daily' },
    { name: 'Mexiletine', dosage: '50mg', frequency: 'Every 8 hours' },
    { name: 'Emergency Epinephrine Auto-Injector', dosage: '0.15mg', frequency: 'As needed' },
  ],
};

const SAMPLE_EVENTS = [
  { id: '1', date: '2023-11-20', time: '14:30', type: 'cardiac_arrest', severity: 'critical', duration: '45 minutes', triggers: ['physical exertion'], symptoms: ['sudden collapse', 'no pulse', 'unresponsive'], vitals: { heartRate: 0, bloodPressure: '0/0', oxygen: 85 }, cprRequired: true, cprDuration: '8 minutes', parentNotes: { beforeEvent: 'Child was excited about PE class, had normal breakfast, seemed healthy', duringEvent: 'Suddenly collapsed during running exercise, turned blue, no breathing, immediately started CPR', afterEvent: 'Child was confused but responsive after EMS arrived, transported to hospital', activitiesPrior: 'PE class - running laps', emotionalState: 'Happy and energetic before event', medicationsGiven: 'Emergency epinephrine by EMS' } },
  { id: '2', date: '2023-11-18', time: '22:15', type: 'palpitations', severity: 'mild', duration: '5 minutes', triggers: ['lying down'], symptoms: ['racing heart'], vitals: { heartRate: 88, bloodPressure: '125/82', oxygen: 99 }, parentNotes: { beforeEvent: 'Watching bedtime story, calm and relaxed', duringEvent: 'Complained of heart racing, seemed anxious', afterEvent: 'Symptoms resolved on their own, fell asleep normally', activitiesPrior: 'Quiet evening routine', emotionalState: 'Calm before, slightly anxious during' } },
  { id: '3', date: '2023-11-15', time: '10:30', type: 'arrhythmia', severity: 'moderate', duration: '15 minutes', triggers: ['stress'], symptoms: ['irregular heartbeat', 'dizziness'], vitals: { heartRate: 120, bloodPressure: '140/90', oxygen: 96 }, parentNotes: { beforeEvent: 'Stressed about upcoming math test, seemed anxious', duringEvent: 'Complained of heart fluttering, looked pale', afterEvent: 'Symptoms subsided after resting', activitiesPrior: 'Taking math test at school', emotionalState: 'Anxious before, scared during' } },
  { id: '5', date: '2023-11-10', time: '19:20', type: 'chest_pain', severity: 'moderate', duration: '20 minutes', triggers: ['emotional upset'], symptoms: ['chest tightness', 'shortness of breath'], vitals: { heartRate: 110, bloodPressure: '135/85', oxygen: 97 }, parentNotes: { beforeEvent: 'Had argument with sibling, was upset and crying', duringEvent: 'Complained of chest feeling tight, breathing difficulty', afterEvent: 'Symptoms improved after calming down', activitiesPrior: 'Family disagreement', emotionalState: 'Upset before, scared during' } },
];

interface Analysis {
  topDiagnoses: { name: string; likelihood: string; reasoning: string; keyEvidence: string[]; missedClues: string[] }[];
  whatDoctorsMayHaveMissed: { observation: string; significance: string }[];
  recommendedTests: { test: string; reason: string; urgency: string; specialist: string }[];
  similarCasesAndResearch: { title: string; relevance: string; source: string }[];
  triggerPatterns: { identified: string[]; avoidanceRecommendations: string[] };
  doctorBriefing: { oneLineSummary: string; criticalHistory: string[]; questionsToAsk: string[]; redFlags: string[]; medicationsToDiscuss: string[] };
  patientGuidance: { immediateActions: string[]; monitoringTips: string[]; supportNote: string };
}

function Section({ title, icon, children, defaultOpen = true }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-3 font-semibold text-white text-[15px]">{icon}{title}</div>
        {open
          ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: '#6B7280' }} />
          : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: '#6B7280' }} />}
      </button>
      {open && (
        <div className="px-5 pb-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

const likelihoodColor = (l: string) =>
  l === 'High'
    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
    : l === 'Medium'
    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
    : 'bg-green-500/20 text-green-300 border border-green-500/30';

const urgencyColor = (u: string) =>
  u === 'Immediate'
    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
    : u === 'Soon'
    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30';

export default function AIAnalysisPage() {
  const { activeId, personQuery, persons, activePerson } = usePersonContext();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState('');
  const [focusArea, setFocusArea] = useState('');
  const [patientData, setPatientData] = useState<any>(SAMPLE_PATIENT_DATA);
  const [events, setEvents] = useState<any[]>(SAMPLE_EVENTS);
  const [doctorVisits, setDoctorVisits] = useState<any[]>([]);
  const [isSample, setIsSample] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [savedNotes, setSavedNotes] = useState<Set<number>>(new Set());

  useEffect(() => {
    setAnalysis(null);
    setIsSample(true);
    Promise.all([
      fetch(`/api/health-data/patient${personQuery}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/health-data/events${personQuery}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/health-data/visits${personQuery}`).then(r => r.json()).catch(() => ({ visits: [] })),
      fetch(`/api/uploads${personQuery}`).then(r => r.json()).catch(() => ({ files: [] })),
      fetch(`/api/health-data/notes${personQuery}`).then(r => r.json()).catch(() => ({ notes: [] })),
    ]).then(([pd, ev, vis, up, nt]) => {
      const hasPersons = persons.length > 0;
      const hasPatient = pd.patient?.name;
      const hasEvents = Array.isArray(ev.events) && ev.events.length > 0;
      const hasVisits = Array.isArray(vis.visits) && vis.visits.length > 0;
      if (hasPatient || hasPersons) {
        // If no full patient profile yet, seed basic info from the persons list
        const basePatient = hasPatient ? pd.patient : (activePerson ? { name: activePerson.name, ageGroup: activePerson.ageGroup } : {});
        setPatientData(basePatient);
        setEvents(hasEvents ? ev.events : []);
        setDoctorVisits(hasVisits ? vis.visits : []);
        setIsSample(false);
      } else if (hasEvents || hasVisits) {
        setEvents(hasEvents ? ev.events : []);
        setDoctorVisits(hasVisits ? vis.visits : []);
        setIsSample(false);
      }
      if (Array.isArray(up.files) && up.files.length > 0) setUploadedFiles(up.files);
      if (Array.isArray(nt.notes) && nt.notes.length > 0) setNotes(nt.notes);
    });
  }, [activeId, personQuery, persons.length]);

  const runAnalysis = async () => {
    setLoading(true);
    setError('');
    setAnalysis(null);
    try {
      const res = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientData, events, doctorVisits, notes, focusArea, uploadedFiles }),
      });
      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error('Analysis timed out or returned an invalid response. Please try again.');
      }
      if (!res.ok || data.error) throw new Error(data.error || 'Analysis failed.');
      setAnalysis(data.analysis);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const sendChat = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const userMessage = chatInput.trim();
    setChatInput('');
    setChatError('');
    const newHistory = [...chatHistory, { role: 'user' as const, content: userMessage }];
    setChatHistory(newHistory);
    setChatLoading(true);
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: chatHistory.map(m => ({ role: m.role, content: m.content })),
          analysis,
          patientData,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Chat failed.');
      setChatHistory([...newHistory, { role: 'assistant', content: data.reply }]);
    } catch (e: any) {
      setChatError(e.message);
      setChatHistory(newHistory); // keep user message, remove failed assistant
    } finally {
      setChatLoading(false);
    }
  };

  const saveAsNote = async (text: string, index: number) => {
    const noteText = text.length > 1000 ? text.slice(0, 1000) + '…' : text;
    try {
      const res = await fetch(`/api/health-data/notes${personQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: noteText, source: 'ai-chat' }),
      });
      if (res.ok) setSavedNotes(prev => new Set([...prev, index]));
    } catch { /* silent */ }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg,#050814 0%,#0B1120 60%,#0f172a 100%)' }}>
      <HealthHeader />
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24 sm:pb-10">

        {isSample && (
          <div className="mb-4 rounded-2xl px-5 py-3 flex items-start gap-3" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)' }}>
            <span className="text-yellow-400 font-bold text-lg shrink-0">⚠</span>
            <div>
              <p className="text-sm font-semibold text-yellow-300">Sample Data — Analysis is running on demo data</p>
              <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>Add a profile and events on the dashboard and this analysis will automatically use your real data.</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl shrink-0" style={{ background: 'linear-gradient(135deg,#8B5CF6,#6366F1)', boxShadow: '0 2px 12px rgba(139,92,246,0.4)' }}>
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">AI Medical Research</h1>
              <p className="text-xs" style={{ color: '#6B7280' }}>Powered by Claude AI</p>
            </div>
          </div>
          <p className="text-sm mt-3" style={{ color: '#9CA3AF' }}>
            Claude reviews the complete health history and generates research questions, conditions to explore, and talking points to help you prepare for doctor appointments.
          </p>
          <div className="mt-3 rounded-xl px-4 py-3" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)' }}>
            <p className="text-xs leading-relaxed" style={{ color: '#D97706' }}>
              <strong>Research preparation tool only.</strong> Not a medical device. Does not provide diagnoses or medical advice. All output is for appointment preparation — review with your licensed healthcare provider. In an emergency, call <strong>911</strong>.
            </p>
          </div>
        </div>

        {/* Run analysis card */}
        <div className="rounded-2xl p-5 mb-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: '#D1D5DB' }}>
              Focus area <span className="font-normal" style={{ color: '#6B7280' }}>(optional)</span>
            </label>
            <input
              type="text"
              value={focusArea}
              onChange={e => setFocusArea(e.target.value)}
              placeholder="e.g. Why do events happen during emotional stress? What genetic conditions fit?"
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>
          {uploadedFiles.length > 0 && (
            <div className="mb-4 flex items-center gap-2 text-xs rounded-xl px-3 py-2" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: '#C4B5FD' }}>
              <Brain className="w-3.5 h-3.5 shrink-0" />
              {uploadedFiles.length} uploaded file{uploadedFiles.length !== 1 ? 's' : ''} will be read and included in the analysis
            </div>
          )}
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 text-white rounded-xl font-semibold text-sm sm:text-base transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg,#8B5CF6,#6366F1)', boxShadow: loading ? 'none' : '0 4px 20px rgba(139,92,246,0.35)' }}
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing {isSample ? 'demo' : patientData.name}&apos;s full history with Claude AI...</>
            ) : (
              <><Brain className="w-5 h-5" /> Run Deep Medical Analysis{!isSample && patientData.name ? ` for ${patientData.name}` : ''}</>
            )}
          </button>
          {loading && (
            <p className="text-center text-xs mt-3" style={{ color: '#6B7280' }}>
              Claude is reading all events{notes.length > 0 ? `, ${notes.length} note${notes.length !== 1 ? 's' : ''}` : ''}, visits, medications{uploadedFiles.length > 0 ? `, and ${uploadedFiles.length} uploaded file${uploadedFiles.length !== 1 ? 's' : ''}` : ''} — this takes 15–30 seconds
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-xl p-4 mb-5 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {analysis && (
          <div>
            {/* Clinical summary banner */}
            <div className="rounded-2xl p-4 mb-5" style={{ background: 'rgba(239,68,68,0.12)', borderLeft: '3px solid #EF4444', borderRight: '1px solid rgba(239,68,68,0.2)', borderTop: '1px solid rgba(239,68,68,0.2)', borderBottom: '1px solid rgba(239,68,68,0.2)' }}>
              <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#F87171' }}>Clinical Summary</div>
              <div className="font-semibold text-white">{analysis.doctorBriefing?.oneLineSummary}</div>
            </div>

            <Section title="Conditions to Research & Discuss with Your Doctor" icon={<Search className="w-5 h-5" style={{ color: '#A78BFA' }} />}>
              <div className="space-y-3 pt-4">
                {analysis.topDiagnoses?.map((d, i) => (
                  <div key={i} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="font-semibold text-white">{d.name}</div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${likelihoodColor(d.likelihood)}`}>{d.likelihood}</span>
                    </div>
                    <p className="text-sm mb-3" style={{ color: '#9CA3AF' }}>{d.reasoning}</p>
                    {d.keyEvidence?.length > 0 && (
                      <div className="mb-2">
                        <div className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Key Evidence:</div>
                        <ul className="space-y-0.5">{d.keyEvidence.map((e, j) => <li key={j} className="flex gap-2 text-sm" style={{ color: '#D1D5DB' }}><span style={{ color: '#A78BFA' }}>•</span>{e}</li>)}</ul>
                      </div>
                    )}
                    {d.missedClues?.length > 0 && (
                      <div className="rounded-lg p-3" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)' }}>
                        <div className="text-xs font-semibold mb-1" style={{ color: '#FCD34D' }}>Supporting details from your notes:</div>
                        <ul className="space-y-0.5">{d.missedClues.map((c, j) => <li key={j} className="flex gap-2 text-sm" style={{ color: '#FDE68A' }}><span>→</span>{c}</li>)}</ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Observations to Raise with Your Care Team" icon={<AlertTriangle className="w-5 h-5 text-orange-400" />}>
              <div className="space-y-3 pt-4">
                {analysis.whatDoctorsMayHaveMissed?.map((item, i) => (
                  <div key={i} className="rounded-xl p-4" style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}>
                    <div className="font-semibold mb-1" style={{ color: '#FED7AA' }}>{item.observation}</div>
                    <div className="text-sm" style={{ color: '#FDBA74' }}>{item.significance}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Tests to Ask Your Doctor About" icon={<ClipboardList className="w-5 h-5 text-blue-400" />}>
              <div className="space-y-3 pt-4">
                {analysis.recommendedTests?.map((t, i) => (
                  <div key={i} className="flex gap-4 items-start pb-3 last:pb-0" style={{ borderBottom: i < (analysis.recommendedTests?.length ?? 1) - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg shrink-0 mt-0.5 ${urgencyColor(t.urgency)}`}>{t.urgency}</span>
                    <div>
                      <div className="font-semibold text-white">{t.test}</div>
                      <div className="text-sm" style={{ color: '#9CA3AF' }}>{t.reason}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Order via: {t.specialist}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {analysis.similarCasesAndResearch?.length > 0 && (
              <Section title="Similar Cases & Research" icon={<Lightbulb className="w-5 h-5 text-yellow-400" />} defaultOpen={false}>
                <div className="space-y-3 pt-4">
                  {analysis.similarCasesAndResearch.map((r, i) => (
                    <div key={i} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="font-semibold text-white mb-1">{r.title}</div>
                      <div className="text-sm mb-1" style={{ color: '#9CA3AF' }}>{r.relevance}</div>
                      {r.source && <div className="text-xs italic" style={{ color: '#6B7280' }}>{r.source}</div>}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            <Section title="Trigger Patterns & Avoidance" icon={<HeartPulse className="w-5 h-5 text-red-400" />} defaultOpen={false}>
              <div className="pt-4 space-y-4">
                {analysis.triggerPatterns?.identified?.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold mb-2" style={{ color: '#D1D5DB' }}>Identified Patterns:</div>
                    <ul className="space-y-1">{analysis.triggerPatterns.identified.map((p, i) => <li key={i} className="flex gap-2 text-sm" style={{ color: '#9CA3AF' }}><span className="text-red-400">•</span>{p}</li>)}</ul>
                  </div>
                )}
                {analysis.triggerPatterns?.avoidanceRecommendations?.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold mb-2" style={{ color: '#D1D5DB' }}>Avoidance Recommendations:</div>
                    <ul className="space-y-1">{analysis.triggerPatterns.avoidanceRecommendations.map((r, i) => <li key={i} className="flex gap-2 text-sm" style={{ color: '#9CA3AF' }}><span className="text-orange-400">→</span>{r}</li>)}</ul>
                  </div>
                )}
              </div>
            </Section>

            <Section title="Doctor Briefing — Questions to Ask" icon={<Shield className="w-5 h-5 text-green-400" />}>
              <div className="pt-4 space-y-4">
                {analysis.doctorBriefing?.criticalHistory?.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold mb-2" style={{ color: '#D1D5DB' }}>Critical History (share with every new doctor):</div>
                    <ul className="space-y-1">{analysis.doctorBriefing.criticalHistory.map((h, i) => <li key={i} className="flex gap-2 text-sm" style={{ color: '#9CA3AF' }}><span className="text-blue-400">•</span>{h}</li>)}</ul>
                  </div>
                )}
                {analysis.doctorBriefing?.questionsToAsk?.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold mb-2" style={{ color: '#D1D5DB' }}>Questions to Ask This Doctor:</div>
                    <ul className="space-y-2">{analysis.doctorBriefing.questionsToAsk.map((q, i) => (
                      <li key={i} className="rounded-xl p-3 text-sm" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#93C5FD' }}>&ldquo;{q}&rdquo;</li>
                    ))}</ul>
                  </div>
                )}
                {analysis.doctorBriefing?.redFlags?.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold mb-2" style={{ color: '#FCA5A5' }}>Red Flags — Seek Care Immediately If:</div>
                    <ul className="space-y-1">{analysis.doctorBriefing.redFlags.map((f, i) => <li key={i} className="flex gap-2 text-sm" style={{ color: '#FCA5A5' }}><span className="text-red-400 shrink-0">!</span>{f}</li>)}</ul>
                  </div>
                )}
                {analysis.doctorBriefing?.medicationsToDiscuss?.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold mb-2" style={{ color: '#D1D5DB' }}>Medications to Discuss:</div>
                    <ul className="space-y-1">{analysis.doctorBriefing.medicationsToDiscuss.map((m, i) => <li key={i} className="flex gap-2 text-sm" style={{ color: '#9CA3AF' }}><span>💊</span>{m}</li>)}</ul>
                  </div>
                )}
              </div>
            </Section>

            {/* Patient guidance */}
            <div className="rounded-2xl p-5 mt-2" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <div className="text-sm font-semibold mb-3" style={{ color: '#93C5FD' }}>Action Plan — {isSample ? 'Demo Patient' : patientData.name}&apos;s Health</div>
              {analysis.patientGuidance?.immediateActions?.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-bold mb-1" style={{ color: '#60A5FA' }}>RIGHT NOW:</div>
                  <ul className="space-y-1">{analysis.patientGuidance.immediateActions.map((a, i) => <li key={i} className="flex gap-2 text-sm" style={{ color: '#BFDBFE' }}><span>→</span>{a}</li>)}</ul>
                </div>
              )}
              {analysis.patientGuidance?.monitoringTips?.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-bold mb-1" style={{ color: '#60A5FA' }}>TRACK FOR NEXT APPOINTMENT:</div>
                  <ul className="space-y-1">{analysis.patientGuidance.monitoringTips.map((t, i) => <li key={i} className="flex gap-2 text-sm" style={{ color: '#BFDBFE' }}><span>•</span>{t}</li>)}</ul>
                </div>
              )}
              {analysis.patientGuidance?.supportNote && (
                <p className="text-sm italic" style={{ color: '#93C5FD' }}>{analysis.patientGuidance.supportNote}</p>
              )}
            </div>

            {/* AI Chat */}
            <div className="mt-6 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.05)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(139,92,246,0.2)' }}>
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4" style={{ color: '#A78BFA' }} />
                  <span className="font-semibold text-white text-sm">Ask a follow-up question</span>
                </div>
                <p className="text-xs mt-1" style={{ color: '#6B7280' }}>Ask Claude anything about this analysis. Responses can be saved as notes to your dashboard.</p>
              </div>

              {/* Chat messages */}
              {chatHistory.length > 0 && (
                <div className="px-5 py-4 space-y-4 max-h-96 overflow-y-auto">
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className="rounded-2xl px-4 py-3 max-w-[85%] text-sm"
                        style={msg.role === 'user'
                          ? { background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)', color: '#E0E7FF' }
                          : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#D1D5DB' }}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        {msg.role === 'assistant' && (
                          <button
                            onClick={() => saveAsNote(msg.content, i)}
                            disabled={savedNotes.has(i)}
                            className="flex items-center gap-1 text-xs mt-2 transition-colors disabled:opacity-60"
                            style={{ color: savedNotes.has(i) ? '#4ADE80' : '#818CF8' }}
                          >
                            {savedNotes.has(i)
                              ? <><Check className="w-3 h-3" /> Saved to notes</>
                              : <><BookmarkPlus className="w-3 h-3" /> Save as note</>}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#A78BFA' }} />
                        <span className="text-xs" style={{ color: '#6B7280' }}>Claude is thinking…</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {chatError && (
                <div className="mx-5 mb-3 rounded-xl px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5' }}>
                  {chatError}
                </div>
              )}

              {/* Input */}
              <form onSubmit={sendChat} className="px-5 py-4 flex gap-3" style={{ borderTop: chatHistory.length > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="e.g. What does QTc of 520ms mean? Should we ask about genetic testing?"
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-purple-500/40"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || chatLoading}
                  className="px-4 py-2.5 rounded-xl font-medium text-sm text-white flex items-center gap-2 transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#7C3AED,#6366F1)', boxShadow: '0 2px 12px rgba(124,58,237,0.3)' }}
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Ask</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
      <HIPAAFooter />
    </div>
  );
}
