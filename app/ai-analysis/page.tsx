'use client';

import { useState, useEffect } from 'react';
import HealthHeader from '@/components/HealthHeader';
import HIPAAFooter from '@/components/HIPAAFooter';
import { Brain, Loader2, ChevronDown, ChevronUp, AlertTriangle, Search, ClipboardList, Lightbulb, HeartPulse, Shield } from 'lucide-react';
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
  whatDoctorsMayHaveMissed: { observation: string; significance: string; source: string }[];
  recommendedTests: { test: string; reason: string; urgency: string; specialist: string }[];
  similarCasesAndResearch: { title: string; relevance: string; source: string }[];
  triggerPatterns: { identified: string[]; avoidanceRecommendations: string[] };
  doctorBriefing: { oneLineSummary: string; criticalHistory: string[]; questionsToAsk: string[]; redFlags: string[]; medicationsToDiscuss: string[] };
  parentGuidance: { immediateActions: string[]; monitoringTips: string[]; emotionalSupport: string };
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
  const { activeId, personQuery, persons } = usePersonContext();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState('');
  const [focusArea, setFocusArea] = useState('');
  const [patientData, setPatientData] = useState<any>(SAMPLE_PATIENT_DATA);
  const [events, setEvents] = useState<any[]>(SAMPLE_EVENTS);
  const [isSample, setIsSample] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

  useEffect(() => {
    setAnalysis(null);
    setIsSample(true);
    Promise.all([
      fetch(`/api/health-data/patient${personQuery}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/health-data/events${personQuery}`).then(r => r.json()).catch(() => ({})),
      fetch('/api/uploads').then(r => r.json()).catch(() => ({ files: [] })),
    ]).then(([pd, ev, up]) => {
      const hasPersons = persons.length > 0;
      const hasPatient = pd.patient?.name;
      const hasEvents = Array.isArray(ev.events) && ev.events.length > 0;
      if (hasPatient || hasPersons) {
        setPatientData(hasPatient ? pd.patient : {});
        setEvents(hasEvents ? ev.events : []);
        setIsSample(false);
      } else if (hasEvents) {
        setEvents(ev.events);
        setIsSample(false);
      }
      if (Array.isArray(up.files) && up.files.length > 0) setUploadedFiles(up.files);
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
        body: JSON.stringify({ patientData, events, focusArea, uploadedFiles }),
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
              <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing {patientData.name}&apos;s full history with Claude AI...</>
            ) : (
              <><Brain className="w-5 h-5" /> Run Deep Medical Analysis</>
            )}
          </button>
          {loading && (
            <p className="text-center text-xs mt-3" style={{ color: '#6B7280' }}>
              Claude is reading all events, notes, triggers, medications{uploadedFiles.length > 0 ? `, and ${uploadedFiles.length} uploaded file${uploadedFiles.length !== 1 ? 's' : ''}` : ''} — this takes 15–30 seconds
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
                    <div className="text-sm mb-1" style={{ color: '#FDBA74' }}>{item.significance}</div>
                    <div className="text-xs" style={{ color: '#9CA3AF' }}>From: {item.source}</div>
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

            <Section title="Similar Cases & Research" icon={<Lightbulb className="w-5 h-5 text-yellow-400" />} defaultOpen={false}>
              <div className="space-y-3 pt-4">
                {analysis.similarCasesAndResearch?.map((r, i) => (
                  <div key={i} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="font-semibold text-white mb-1">{r.title}</div>
                    <div className="text-sm mb-1" style={{ color: '#9CA3AF' }}>{r.relevance}</div>
                    <div className="text-xs italic" style={{ color: '#6B7280' }}>{r.source}</div>
                  </div>
                ))}
              </div>
            </Section>

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
                {analysis.doctorBriefing?.medicationsToDiscuss?.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold mb-2" style={{ color: '#D1D5DB' }}>Medications to Discuss:</div>
                    <ul className="space-y-1">{analysis.doctorBriefing.medicationsToDiscuss.map((m, i) => <li key={i} className="flex gap-2 text-sm" style={{ color: '#9CA3AF' }}><span>💊</span>{m}</li>)}</ul>
                  </div>
                )}
              </div>
            </Section>

            {/* Parent guidance */}
            <div className="rounded-2xl p-5 mt-2" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <div className="text-sm font-semibold mb-3" style={{ color: '#93C5FD' }}>For You — {patientData.name}&apos;s Health</div>
              {analysis.parentGuidance?.immediateActions?.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-bold mb-1" style={{ color: '#60A5FA' }}>RIGHT NOW:</div>
                  <ul className="space-y-1">{analysis.parentGuidance.immediateActions.map((a, i) => <li key={i} className="flex gap-2 text-sm" style={{ color: '#BFDBFE' }}><span>→</span>{a}</li>)}</ul>
                </div>
              )}
              {analysis.parentGuidance?.monitoringTips?.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-bold mb-1" style={{ color: '#60A5FA' }}>TRACK FOR NEXT APPOINTMENT:</div>
                  <ul className="space-y-1">{analysis.parentGuidance.monitoringTips.map((t, i) => <li key={i} className="flex gap-2 text-sm" style={{ color: '#BFDBFE' }}><span>•</span>{t}</li>)}</ul>
                </div>
              )}
              {analysis.parentGuidance?.emotionalSupport && (
                <p className="text-sm italic" style={{ color: '#93C5FD' }}>{analysis.parentGuidance.emotionalSupport}</p>
              )}
            </div>
          </div>
        )}
      </div>
      <HIPAAFooter />
    </div>
  );
}
