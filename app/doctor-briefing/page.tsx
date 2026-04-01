'use client';

import { useState, useEffect } from 'react';
import HealthHeader from '@/components/HealthHeader';
import HIPAAFooter from '@/components/HIPAAFooter';
import { Printer, Brain, Loader2, AlertTriangle, ClipboardList, HeartPulse, User } from 'lucide-react';
import { usePersonContext } from '@/lib/PersonContext';

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
  const { activeId, personQuery, persons } = usePersonContext();
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
    setIsSample(true);
    setAiSummary('');
    Promise.all([
      fetch(`/api/health-data/patient${personQuery}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/health-data/events${personQuery}`).then(r => r.json()).catch(() => ({})),
    ]).then(([pd, ev]) => {
      const hasPersons = persons.length > 0;
      const hasPatient = pd.patient?.name;
      const hasEvents = Array.isArray(ev.events) && ev.events.length > 0;

      if (hasPersons || hasPatient) {
        setPatientData({
          name: pd.patient?.name || '',
          age: null,
          ageGroup: pd.patient?.ageGroup || '',
          dob: pd.patient?.dob || '',
          primaryConcern: pd.patient?.primaryConcern || '',
          medications: pd.patient?.medications || [],
          careTeam: pd.patient?.careTeam || [],
          emergencyContact: pd.patient?.emergencyContact || '',
          allergies: pd.patient?.allergies || 'None known',
        });
        setEventsSummary(hasEvents ? eventsToSummary(ev.events) : []);
        const allTriggers = hasEvents
          ? [...new Set<string>(ev.events.flatMap((e: any) => e.triggers || []))]
          : [];
        setTriggerPatterns(allTriggers);
        setIsSample(false);
      } else if (hasEvents) {
        setEventsSummary(eventsToSummary(ev.events));
        const allTriggers = [...new Set<string>(ev.events.flatMap((e: any) => e.triggers || []))];
        if (allTriggers.length > 0) setTriggerPatterns(allTriggers);
        setIsSample(false);
      }
    });
  }, [activeId, personQuery, persons.length]);

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
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg,#050814 0%,#0B1120 60%,#0f172a 100%)' }}>
      <HealthHeader />

      <div className="max-w-3xl mx-auto px-4 py-6 pb-24 sm:pb-10">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-white">Doctor Briefing</h1>
            <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>Hand this to any new doctor at the start of the appointment</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={generateAISummary}
              disabled={loadingAI}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-60"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#C4B5FD' }}
            >
              {loadingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              AI Summary
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'linear-gradient(135deg,#3B82F6,#6366F1)', boxShadow: '0 2px 12px rgba(99,102,241,0.3)', color: 'white' }}
            >
              <Printer className="w-4 h-4" />
              Print / PDF
            </button>
          </div>
        </div>

        {isSample && (
          <div className="mb-4 rounded-2xl px-5 py-3 flex items-start gap-3 print:hidden" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)' }}>
            <span className="text-yellow-400 font-bold text-lg shrink-0">⚠</span>
            <div>
              <p className="text-sm font-semibold text-yellow-300">Sample Data Shown</p>
              <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>Add a profile and events on the dashboard and this briefing will use your real data.</p>
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-xl p-3 mb-4 text-sm print:hidden" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5' }}>{error}</div>
        )}

        {/* Briefing document */}
        <div className="rounded-2xl overflow-hidden print:rounded-none print:border-0 print:shadow-none" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="p-6 sm:p-8">

            {/* Header row */}
            <div className="flex items-start justify-between pb-4 mb-5" style={{ borderBottom: '2px solid #EF4444' }}>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#F87171' }}>Health Briefing Document</div>
                <h2 className="text-3xl font-bold text-white">{patientData.name}</h2>
                <div className="mt-1 text-sm" style={{ color: '#9CA3AF' }}>
                  {patientData.ageGroup ? patientData.ageGroup.charAt(0).toUpperCase() + patientData.ageGroup.slice(1) : (patientData.age ? `Age ${patientData.age}` : '')}
                  {patientData.dob ? ` \u00a0•\u00a0 DOB ${patientData.dob}` : ''}
                  {' \u00a0•\u00a0 '}
                  {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              {patientData.emergencyContact && (
                <div className="text-right shrink-0 ml-4">
                  <div className="rounded-xl px-4 py-3 text-center" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
                    <div className="text-xs font-bold uppercase" style={{ color: '#F87171' }}>Emergency Contact</div>
                    <div className="text-sm font-medium mt-1 text-white">{patientData.emergencyContact}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Primary concern */}
            <div className="rounded-xl p-4 mb-5" style={{ background: 'rgba(239,68,68,0.1)', borderLeft: '4px solid #EF4444' }}>
              <div className="flex gap-2 items-start">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
                <div>
                  <div className="font-bold text-sm uppercase mb-1" style={{ color: '#F87171' }}>Primary Concern</div>
                  <div className="text-white">{patientData.primaryConcern}</div>
                </div>
              </div>
            </div>

            {/* AI summary */}
            {aiSummary && (
              <div className="rounded-xl p-4 mb-5" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                <div className="flex gap-2 items-start">
                  <Brain className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#A78BFA' }} />
                  <div>
                    <div className="text-xs font-bold uppercase mb-1" style={{ color: '#A78BFA' }}>AI Clinical Summary</div>
                    <div className="text-sm" style={{ color: '#DDD6FE' }}>{aiSummary}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Medications + Care Team */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              <div>
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide mb-3 pb-1" style={{ color: '#9CA3AF', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <ClipboardList className="w-4 h-4" />Current Medications
                </div>
                <div className="space-y-2.5">
                  {patientData.medications.map((m: any, i: number) => (
                    <div key={i} className="text-sm">
                      <span className="font-semibold text-white">{m.name}</span>{' '}
                      <span style={{ color: '#9CA3AF' }}>{m.dosage} — {m.frequency}</span>
                      {m.reason && <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{m.reason}</div>}
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-sm">
                  <span className="font-semibold" style={{ color: '#D1D5DB' }}>Allergies:</span>{' '}
                  <span style={{ color: '#9CA3AF' }}>{patientData.allergies}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide mb-3 pb-1" style={{ color: '#9CA3AF', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <User className="w-4 h-4" />Care Team
                </div>
                <div className="space-y-2.5">
                  {patientData.careTeam.map((c: any, i: number) => (
                    <div key={i} className="text-sm">
                      <span className="font-semibold text-white">{c.name}</span>
                      <div style={{ color: '#9CA3AF' }}>{c.role}{c.phone ? ` \u00a0•\u00a0 ${c.phone}` : ''}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Event history table */}
            {eventsSummary.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide mb-3 pb-1" style={{ color: '#9CA3AF', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <HeartPulse className="w-4 h-4" />Event History (Recent)
                </div>
                <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <th className="text-left px-3 py-2 text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>Date</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>Type</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>Severity</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventsSummary.map((e, i) => (
                        <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: e.cpr ? 'rgba(239,68,68,0.08)' : 'transparent' }}>
                          <td className="px-3 py-2 whitespace-nowrap" style={{ color: '#D1D5DB' }}>{e.date}</td>
                          <td className="px-3 py-2">
                            <span className="font-medium text-white">{e.type}</span>
                            {e.cpr && <span className="ml-2 text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: '#EF4444', color: 'white' }}>CPR</span>}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`text-xs font-bold ${e.severity === 'CRITICAL' ? 'text-red-400' : e.severity === 'Moderate' ? 'text-orange-400' : 'text-green-400'}`}>{e.severity}</span>
                          </td>
                          <td className="px-3 py-2 text-xs" style={{ color: '#9CA3AF' }}>{e.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Triggers */}
            {triggerPatterns.length > 0 && (
              <div className="mb-5">
                <div className="font-bold text-xs uppercase tracking-wide mb-2 pb-1" style={{ color: '#9CA3AF', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Known Triggers</div>
                <ul className="space-y-1">
                  {triggerPatterns.map((t, i) => (
                    <li key={i} className="flex gap-2 text-sm" style={{ color: '#D1D5DB' }}>
                      <span className="font-bold text-red-400">!</span>{t}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Questions */}
            <div>
              <div className="font-bold text-xs uppercase tracking-wide mb-2 pb-1" style={{ color: '#9CA3AF', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                Questions We Need Answered
                {isSample && <span className="ml-2 font-normal normal-case" style={{ color: '#D97706' }}>(sample — replace with your own)</span>}
              </div>
              <ol className="space-y-1.5">
                {[
                  'Has genetic testing been done for relevant mutations?',
                  'Are there any medications we should absolutely avoid?',
                  'What did the most recent ECG or monitor show?',
                  'Should activity or sports restrictions change?',
                  'What warning signs should bring us to the ER immediately?',
                ].map((q, i) => (
                  <li key={i} className="flex gap-2 text-sm" style={{ color: '#D1D5DB' }}>
                    <span className="font-bold shrink-0" style={{ color: '#60A5FA' }}>{i + 1}.</span>{q}
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-8 pt-4 text-xs text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: '#4B5563' }}>
              Generated {new Date().toLocaleDateString()} &nbsp;•&nbsp; This document was prepared by the family and AI analysis. It does not replace clinical judgment.
            </div>
          </div>
        </div>
      </div>
      <HIPAAFooter />
    </div>
  );
}
