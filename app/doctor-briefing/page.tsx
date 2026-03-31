'use client';

import { useState, useEffect } from 'react';
import HealthHeader from '@/components/HealthHeader';
import HIPAAFooter from '@/components/HIPAAFooter';
import { Printer, Brain, Loader2, AlertTriangle, ClipboardList, HeartPulse, User } from 'lucide-react';

const SAMPLE_PATIENT = {
  name: 'Ethan Alvarez', age: 7, dob: 'March 14, 2016',
  primaryConcern: 'Life-threatening cardiac arrhythmias requiring frequent CPR - suspected Long QT Syndrome',
  careTeam: [
    { name: 'Dr. S. Patel', role: 'Pediatric Cardiologist', phone: '555-0101' },
    { name: 'Dr. A. Nguyen', role: 'Pediatric Critical Care', phone: '555-0102' },
    { name: 'Dr. M. Johnson', role: 'Genetic Counselor', phone: '555-0103' },
  ],
  medications: [
    { name: 'Propranolol', dosage: '10mg', frequency: 'Three times daily', reason: 'Rate control / QT management' },
    { name: 'Mexiletine', dosage: '50mg', frequency: 'Every 8 hours', reason: 'Sodium channel blocker for arrhythmia' },
    { name: 'Emergency Epinephrine Auto-Injector', dosage: '0.15mg', frequency: 'As needed', reason: 'Emergency use only' },
  ],
  allergies: 'None known',
  emergencyContact: 'Maria Alvarez (mother) — 555-0200',
};

const SAMPLE_EVENTS_SUMMARY = [
  { date: 'Nov 20, 2023', type: 'Cardiac Arrest', severity: 'CRITICAL', cpr: true, notes: 'During PE class. CPR 8 min. Hospitalized 3 days. ICD scheduled.' },
  { date: 'Nov 18, 2023', type: 'Palpitations', severity: 'Mild', cpr: false, notes: 'At rest, bedtime. Self-resolved in 5 min.' },
  { date: 'Nov 15, 2023', type: 'Arrhythmia', severity: 'Moderate', cpr: false, notes: 'During math test (stress). HR 120, resolved with rest.' },
  { date: 'Nov 10, 2023', type: 'Chest Pain', severity: 'Moderate', cpr: false, notes: 'After emotional upset (argument). HR 110, resolved after calming.' },
];

function eventsToSummary(events: any[]) {
  return events.slice(-10).map(e => ({
    date: new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    type: e.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
    severity: e.severity === 'critical' ? 'CRITICAL' : e.severity.charAt(0).toUpperCase() + e.severity.slice(1),
    cpr: !!e.cprRequired,
    notes: [e.parentNotes?.duringEvent, e.notes].filter(Boolean).join(' ') || '—',
  }));
}

export default function DoctorBriefingPage() {
  const [aiSummary, setAiSummary] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [error, setError] = useState('');
  const [patientData, setPatientData] = useState<any>(SAMPLE_PATIENT);
  const [eventsSummary, setEventsSummary] = useState<any[]>(SAMPLE_EVENTS_SUMMARY);
  const [triggerPatterns, setTriggerPatterns] = useState<string[]>([
    'Physical exertion — especially sudden intense activity',
    'Emotional stress / anxiety (school tests, arguments)',
    'Transitions from rest to activity',
  ]);
  const [isSample, setIsSample] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/health-data/patient').then(r => r.json()).catch(() => ({})),
      fetch('/api/health-data/events').then(r => r.json()).catch(() => ({})),
    ]).then(([pd, ev]) => {
      const hasPatient = pd.patient?.name;
      const hasEvents = Array.isArray(ev.events) && ev.events.length > 0;
      if (hasPatient) setPatientData({ ...SAMPLE_PATIENT, ...pd.patient, medications: pd.patient.medications ?? SAMPLE_PATIENT.medications, careTeam: pd.patient.careTeam ?? SAMPLE_PATIENT.careTeam });
      if (hasEvents) {
        setEventsSummary(eventsToSummary(ev.events));
        const allTriggers = [...new Set<string>(ev.events.flatMap((e: any) => e.triggers || []))];
        if (allTriggers.length > 0) setTriggerPatterns(allTriggers);
      }
      if (hasPatient || hasEvents) setIsSample(false);
    });
  }, []);

  const generateAISummary = async () => {
    setLoadingAI(true);
    setError('');
    try {
      const res = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientData,
          events: eventsSummary,
          focusArea: 'Generate a 3-paragraph clinical briefing summary a new specialist doctor can read in 60 seconds to understand the most critical aspects of this case and what has been tried. Be clinical and precise.',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiSummary(data.analysis?.doctorBriefing?.oneLineSummary || 'Analysis complete — see full AI analysis page for details.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <HealthHeader />

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Doctor Briefing</h1>
            <p className="text-sm text-gray-500 mt-1">Hand this to any new doctor at the start of the appointment</p>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            <Printer className="w-4 h-4" />
            Print / Save PDF
          </button>
        </div>

        {isSample && (
          <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl px-5 py-3 flex items-start gap-3 print:hidden">
            <span className="text-amber-500 font-bold text-lg shrink-0">⚠</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">Sample Data Shown</p>
              <p className="text-xs text-amber-700 mt-0.5">Add your patient profile and events on the dashboard and this briefing will automatically use your real data.</p>
            </div>
          </div>
        )}
        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-red-700 text-sm print:hidden">{error}</div>}

        <div className="bg-white rounded-xl border border-gray-200 p-8 print:shadow-none print:border-0 print:rounded-none print:p-0">

          <div className="flex items-start justify-between border-b-2 border-red-600 pb-4 mb-6">
            <div>
              <div className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1">Patient Briefing Document</div>
              <h2 className="text-3xl font-bold text-gray-900">{patientData.name}</h2>
              <div className="text-gray-600 mt-1">Age {patientData.age} &nbsp;•&nbsp; DOB {patientData.dob} &nbsp;•&nbsp; {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
            </div>
            <div className="text-right">
              <div className="bg-red-100 border border-red-300 rounded-lg px-4 py-3 text-center">
                <div className="text-xs font-bold text-red-700 uppercase">Emergency Contact</div>
                <div className="text-sm text-red-900 font-medium mt-1">{patientData.emergencyContact}</div>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border-l-4 border-red-600 rounded-r-lg p-4 mb-6">
            <div className="flex gap-2 items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-red-800 text-sm uppercase mb-1">Primary Concern</div>
                <div className="text-red-900">{patientData.primaryConcern}</div>
              </div>
            </div>
          </div>

          {aiSummary && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              <div className="flex gap-2 items-start">
                <Brain className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-purple-700 uppercase mb-1">AI Clinical Summary</div>
                  <div className="text-purple-900 text-sm">{aiSummary}</div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div>
              <div className="flex items-center gap-2 font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide border-b border-gray-200 pb-1">
                <ClipboardList className="w-4 h-4" />Current Medications
              </div>
              <div className="space-y-2">
                {patientData.medications.map((m: any, i: number) => (
                  <div key={i} className="text-sm">
                    <span className="font-semibold text-gray-900">{m.name}</span>{' '}
                    <span className="text-gray-600">{m.dosage} — {m.frequency}</span>
                    <div className="text-xs text-gray-400">{m.reason}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-sm">
                <span className="font-semibold text-gray-700">Allergies:</span>{' '}
                <span className="text-gray-600">{patientData.allergies}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide border-b border-gray-200 pb-1">
                <User className="w-4 h-4" />Care Team
              </div>
              <div className="space-y-2">
                {patientData.careTeam.map((c: any, i: number) => (
                  <div key={i} className="text-sm">
                    <span className="font-semibold text-gray-900">{c.name}</span>
                    <div className="text-gray-500">{c.role} &nbsp;•&nbsp; {c.phone}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide border-b border-gray-200 pb-1">
              <HeartPulse className="w-4 h-4" />Event History (Recent)
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Severity</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody>
                {eventsSummary.map((e, i) => (
                  <tr key={i} className={`border-t border-gray-100 ${e.cpr ? 'bg-red-50' : ''}`}>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{e.date}</td>
                    <td className="px-3 py-2">
                      <span className="font-medium text-gray-900">{e.type}</span>
                      {e.cpr && <span className="ml-2 text-xs bg-red-600 text-white px-1.5 py-0.5 rounded font-bold">CPR</span>}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs font-bold ${e.severity === 'CRITICAL' ? 'text-red-700' : e.severity === 'Moderate' ? 'text-orange-600' : 'text-green-700'}`}>{e.severity}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{e.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mb-6">
            <div className="font-bold text-gray-800 mb-2 text-sm uppercase tracking-wide border-b border-gray-200 pb-1">Known Triggers</div>
            <ul className="space-y-1">
              {triggerPatterns.map((t, i) => <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-red-500 font-bold">!</span>{t}</li>)}
            </ul>
          </div>

          <div>
            <div className="font-bold text-gray-800 mb-2 text-sm uppercase tracking-wide border-b border-gray-200 pb-1">
              Questions We Need Answered
              {isSample && <span className="ml-2 text-xs font-normal text-amber-600 normal-case">(sample — replace with your own)</span>}
            </div>
            <ol className="space-y-1.5">
              {[
                'Has genetic testing been done for relevant mutations?',
                'Are there any medications we should absolutely avoid?',
                'What did the most recent ECG or monitor show?',
                'Should activity or sports restrictions change?',
                'What warning signs should bring us to the ER immediately?',
              ].map((q, i) => (
                <li key={i} className="text-sm text-gray-800 flex gap-2">
                  <span className="text-blue-600 font-bold shrink-0">{i + 1}.</span>{q}
                </li>
              ))}
            </ol>
          </div>

          <div className="border-t border-gray-200 mt-8 pt-4 text-xs text-gray-400 text-center">
            Generated {new Date().toLocaleDateString()} &nbsp;•&nbsp; This document was prepared by the family and AI analysis. It does not replace clinical judgment.
          </div>
        </div>
      </div>
      <HIPAAFooter />
    </div>
  );
}
