'use client';

import { useState, useEffect } from 'react';
import HealthHeader from '@/components/HealthHeader';
import HIPAAFooter from '@/components/HIPAAFooter';
import { Brain, Loader2, ChevronDown, ChevronUp, AlertTriangle, Search, ClipboardList, Lightbulb, HeartPulse, Shield } from 'lucide-react';

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
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50">
        <div className="flex items-center gap-3 font-semibold text-gray-900">{icon}{title}</div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-gray-100">{children}</div>}
    </div>
  );
}

const likelihoodColor = (l: string) => l === 'High' ? 'bg-red-100 text-red-700' : l === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';
const urgencyColor = (u: string) => u === 'Immediate' ? 'bg-red-100 text-red-700' : u === 'Soon' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700';

export default function AIAnalysisPage() {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState('');
  const [focusArea, setFocusArea] = useState('');
  const [patientData, setPatientData] = useState<any>(SAMPLE_PATIENT_DATA);
  const [events, setEvents] = useState<any[]>(SAMPLE_EVENTS);
  const [isSample, setIsSample] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/health-data/patient').then(r => r.json()).catch(() => ({})),
      fetch('/api/health-data/events').then(r => r.json()).catch(() => ({})),
      fetch('/api/uploads').then(r => r.json()).catch(() => ({ files: [] })),
    ]).then(([pd, ev, up]) => {
      const hasPatient = pd.patient?.name;
      const hasEvents = Array.isArray(ev.events) && ev.events.length > 0;
      if (hasPatient) {
        setPatientData(pd.patient);
        setEvents(hasEvents ? ev.events : []);
        setIsSample(false);
      } else if (hasEvents) {
        setEvents(ev.events);
        setIsSample(false);
      }
      if (Array.isArray(up.files) && up.files.length > 0) setUploadedFiles(up.files);
    });
  }, []);

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
    <div className="min-h-screen bg-gray-50">
      <HealthHeader />
      <div className="max-w-4xl mx-auto px-4 py-8">

        {isSample && (
          <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl px-5 py-3 flex items-start gap-3">
            <span className="text-amber-500 font-bold text-lg shrink-0">⚠</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">Sample Data — Analysis is running on demo data</p>
              <p className="text-xs text-amber-700 mt-0.5">Add a profile and events on the dashboard and this analysis will automatically use your real data.</p>
            </div>
          </div>
        )}

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-7 h-7 text-purple-600 shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">AI Medical Research Analysis</h1>
          </div>
          <p className="text-gray-600">
            Claude reviews the complete health history and generates research questions, conditions to explore, and talking points to help you prepare for doctor appointments.
          </p>
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Research preparation tool only.</strong> This is not a medical device and does not provide diagnoses, clinical recommendations, or medical advice. All output is for appointment preparation — review everything with your licensed healthcare provider before acting on it. In an emergency, call <strong>911</strong>.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Focus area for this analysis <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={focusArea}
              onChange={e => setFocusArea(e.target.value)}
              placeholder="e.g. Why do events happen during emotional stress? What genetic conditions fit? Is the current medication right?"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm text-gray-900 bg-white"
            />
          </div>
          {uploadedFiles.length > 0 && (
            <div className="mb-4 flex items-center gap-2 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
              <Brain className="w-3.5 h-3.5 shrink-0" />
              {uploadedFiles.length} uploaded file{uploadedFiles.length !== 1 ? 's' : ''} will be read and included in the analysis
            </div>
          )}
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm sm:text-base transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing {patientData.name}&apos;s full history with Claude AI...</>
            ) : (
              <><Brain className="w-5 h-5" /> Run Deep Medical Analysis</>
            )}
          </button>
          {loading && (
            <p className="text-center text-sm text-gray-500 mt-3">
              Claude is reading all events, notes, triggers, medications{uploadedFiles.length > 0 ? `, and ${uploadedFiles.length} uploaded file${uploadedFiles.length !== 1 ? 's' : ''}` : ''} — this takes 15–30 seconds
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {analysis && (
          <div>
            <div className="bg-red-50 border-l-4 border-red-500 rounded-r-xl p-4 mb-6">
              <div className="text-xs font-bold text-red-500 uppercase mb-1">Clinical Summary</div>
              <div className="text-red-900 font-semibold">{analysis.doctorBriefing?.oneLineSummary}</div>
            </div>

            <Section title="Conditions to Research & Discuss with Your Doctor" icon={<Search className="w-5 h-5 text-purple-600" />}>
              <div className="space-y-4 pt-4">
                {analysis.topDiagnoses?.map((d, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-semibold text-gray-900">{d.name}</div>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${likelihoodColor(d.likelihood)}`}>{d.likelihood}</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{d.reasoning}</p>
                    {d.keyEvidence?.length > 0 && (
                      <div className="mb-2">
                        <div className="text-xs font-semibold text-gray-500 mb-1">Key Evidence:</div>
                        <ul className="text-sm text-gray-600 space-y-0.5">{d.keyEvidence.map((e, j) => <li key={j} className="flex gap-2"><span className="text-purple-500">•</span>{e}</li>)}</ul>
                      </div>
                    )}
                    {d.missedClues?.length > 0 && (
                      <div className="bg-yellow-50 rounded p-2">
                        <div className="text-xs font-semibold text-yellow-700 mb-1">Details from parent notes supporting this:</div>
                        <ul className="text-sm text-yellow-800 space-y-0.5">{d.missedClues.map((c, j) => <li key={j} className="flex gap-2"><span>→</span>{c}</li>)}</ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Observations to Raise with Your Care Team" icon={<AlertTriangle className="w-5 h-5 text-orange-500" />}>
              <div className="space-y-3 pt-4">
                {analysis.whatDoctorsMayHaveMissed?.map((item, i) => (
                  <div key={i} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="font-semibold text-orange-900 mb-1">{item.observation}</div>
                    <div className="text-sm text-orange-800 mb-1">{item.significance}</div>
                    <div className="text-xs text-orange-600">From: {item.source}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Tests to Ask Your Doctor About" icon={<ClipboardList className="w-5 h-5 text-blue-600" />}>
              <div className="space-y-3 pt-4">
                {analysis.recommendedTests?.map((t, i) => (
                  <div key={i} className="flex gap-4 items-start border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <span className={`text-xs font-bold px-2 py-1 rounded shrink-0 mt-0.5 ${urgencyColor(t.urgency)}`}>{t.urgency}</span>
                    <div>
                      <div className="font-semibold text-gray-900">{t.test}</div>
                      <div className="text-sm text-gray-600">{t.reason}</div>
                      <div className="text-xs text-gray-400 mt-0.5">Order via: {t.specialist}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Similar Cases & Research" icon={<Lightbulb className="w-5 h-5 text-yellow-500" />} defaultOpen={false}>
              <div className="space-y-3 pt-4">
                {analysis.similarCasesAndResearch?.map((r, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4">
                    <div className="font-semibold text-gray-900 mb-1">{r.title}</div>
                    <div className="text-sm text-gray-700 mb-1">{r.relevance}</div>
                    <div className="text-xs text-gray-500 italic">{r.source}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Trigger Patterns & Avoidance" icon={<HeartPulse className="w-5 h-5 text-red-500" />} defaultOpen={false}>
              <div className="pt-4 space-y-4">
                {analysis.triggerPatterns?.identified?.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-2">Identified Patterns:</div>
                    <ul className="space-y-1">{analysis.triggerPatterns.identified.map((p, i) => <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-red-500">•</span>{p}</li>)}</ul>
                  </div>
                )}
                {analysis.triggerPatterns?.avoidanceRecommendations?.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-2">Avoidance Recommendations:</div>
                    <ul className="space-y-1">{analysis.triggerPatterns.avoidanceRecommendations.map((r, i) => <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-orange-500">→</span>{r}</li>)}</ul>
                  </div>
                )}
              </div>
            </Section>

            <Section title="Doctor Briefing — Questions to Ask" icon={<Shield className="w-5 h-5 text-green-600" />}>
              <div className="pt-4 space-y-4">
                {analysis.doctorBriefing?.criticalHistory?.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-2">Critical History (share with every new doctor):</div>
                    <ul className="space-y-1">{analysis.doctorBriefing.criticalHistory.map((h, i) => <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-blue-500">•</span>{h}</li>)}</ul>
                  </div>
                )}
                {analysis.doctorBriefing?.questionsToAsk?.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-2">Questions to Ask This Doctor:</div>
                    <ul className="space-y-2">{analysis.doctorBriefing.questionsToAsk.map((q, i) => <li key={i} className="bg-blue-50 border border-blue-200 rounded p-2 text-sm text-blue-900">"{q}"</li>)}</ul>
                  </div>
                )}
                {analysis.doctorBriefing?.medicationsToDiscuss?.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-2">Medications to Discuss:</div>
                    <ul className="space-y-1">{analysis.doctorBriefing.medicationsToDiscuss.map((m, i) => <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-green-500">💊</span>{m}</li>)}</ul>
                  </div>
                )}
              </div>
            </Section>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mt-4">
              <div className="text-sm font-semibold text-blue-800 mb-3">For You, As {patientData.name}&apos;s Parent</div>
              {analysis.parentGuidance?.immediateActions?.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-bold text-blue-700 mb-1">RIGHT NOW:</div>
                  <ul className="space-y-1">{analysis.parentGuidance.immediateActions.map((a, i) => <li key={i} className="text-sm text-blue-800 flex gap-2"><span>→</span>{a}</li>)}</ul>
                </div>
              )}
              {analysis.parentGuidance?.monitoringTips?.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-bold text-blue-700 mb-1">TRACK FOR NEXT APPOINTMENT:</div>
                  <ul className="space-y-1">{analysis.parentGuidance.monitoringTips.map((t, i) => <li key={i} className="text-sm text-blue-800 flex gap-2"><span>•</span>{t}</li>)}</ul>
                </div>
              )}
              {analysis.parentGuidance?.emotionalSupport && (
                <p className="text-sm text-blue-700 italic">{analysis.parentGuidance.emotionalSupport}</p>
              )}
            </div>
          </div>
        )}
      </div>
      <HIPAAFooter />
    </div>
  );
}
