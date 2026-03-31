'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import HealthHeader from '@/components/HealthHeader';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine, Legend } from 'recharts';
import { detectPiiInText } from '@/lib/pii-validator';

interface CareTeamMember {
  name: string;
  role: string;
  specialty?: string;
}

interface IncidentReport {
  date: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  status: 'resolved' | 'investigating' | 'monitoring';
}

interface Patient {
  name: string;
  age: number;
  primaryConcern: string;
  lastVisit: string;
  nextAppointment: string;
  careTeam: CareTeamMember[];
  medications: {
    name: string;
    dosage: string;
    frequency: string;
  }[];
  recentActivity: {
    date: string;
    type: string;
    details: string;
  }[];
  incidentReports: IncidentReport[];
}

interface CardiacEvent {
  id: string;
  date: string;
  time: string;
  type: 'arrhythmia' | 'chest_pain' | 'palpitations' | 'shortness_breath' | 'fatigue' | 'dizziness' | 'cardiac_arrest' | 'other';
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  duration: string;
  triggers?: string[];
  symptoms: string[];
  vitals: {
    heartRate?: number;
    bloodPressure?: string;
    oxygen?: number;
  };
  notes: string;
  resolved: boolean;
  cprRequired?: boolean;
  cprDuration?: string;
  medicalResponse?: {
    calledEMS: boolean;
    emsResponseTime: string;
    hospitalTransport: boolean;
    defibrillatorUsed: boolean;
  };
  parentNotes?: {
    beforeEvent: string;
    duringEvent: string;
    afterEvent: string;
    observations: string;
    emotionalState: string;
    activitiesPrior: string;
    medicationsGiven: string;
    followUpActions: string;
  };
}

interface DoctorVisit {
  id: string;
  date: string;
  doctor: string;
  visitType: 'routine' | 'emergency' | 'follow_up';
  personalNotes: string;
  doctorNotes: string;
  diagnosis?: string;
  treatment: string[];
  medicationsChanged: boolean;
  cardiacEventsDuringVisit: number;
}

interface TrendAnalysis {
  overallTrend: 'improving' | 'stable' | 'declining';
  eventFrequency: number;
  severityTrend: 'decreasing' | 'stable' | 'increasing';
  primaryTriggers: string[];
  recommendations: string[];
  aiAnalysis: string;
  lastUpdated: string;
}

// --- Sample / demo data shown when no real data has been entered yet ---
const SAMPLE_PATIENT: Patient = {
  name: 'Ethan Alvarez',
  age: 7,
  primaryConcern: 'Life-threatening cardiac arrhythmias requiring frequent CPR - suspected Long QT Syndrome',
  lastVisit: '2 days ago',
  nextAppointment: 'Tomorrow',
  careTeam: [
    { name: 'Dr. S. Patel', role: 'Pediatric Cardiologist', specialty: 'Electrophysiology & Sudden Cardiac Death Prevention' },
    { name: 'Dr. A. Nguyen', role: 'Pediatric Critical Care', specialty: 'Emergency Medicine & Resuscitation' },
    { name: 'Dr. M. Johnson', role: 'Genetic Counselor', specialty: 'Inherited Cardiac Conditions' },
  ],
  medications: [
    { name: 'Propranolol', dosage: '10mg', frequency: 'Three times daily' },
    { name: 'Mexiletine', dosage: '50mg', frequency: 'Every 8 hours' },
    { name: 'Emergency Epinephrine Auto-Injector', dosage: '0.15mg', frequency: 'As needed for cardiac arrest' },
  ],
  recentActivity: [
    { date: '2023-11-15', type: 'Appointment', details: 'Follow-up with Dr. Patel' },
    { date: '2023-11-10', type: 'Medication', details: 'Prescription refill: Propranolol' },
  ],
  incidentReports: [
    { date: '2023-11-12', type: 'Medication Reaction', severity: 'medium', description: 'Mild rash appeared after starting new medication', status: 'monitoring' },
    { date: '2023-10-28', type: 'Symptom Flare-up', severity: 'high', description: 'Increased neuroinflammatory symptoms reported', status: 'investigating' },
  ],
};

const SAMPLE_DOCTOR_VISITS: DoctorVisit[] = [
  { id: 'v1', date: '2023-11-21', doctor: 'Dr. S. Patel', visitType: 'emergency', personalNotes: 'Follow-up after cardiac arrest', doctorNotes: 'ICD implantation scheduled. Mexiletine dose reviewed.', treatment: ['ICD scheduling', 'Medication review'], medicationsChanged: true, cardiacEventsDuringVisit: 0 },
  { id: 'v2', date: '2023-11-16', doctor: 'Dr. A. Nguyen', visitType: 'follow_up', personalNotes: 'Check-in after arrhythmia at school', doctorNotes: 'ECG reviewed. Stress management discussed.', treatment: ['ECG', 'Stress management referral'], medicationsChanged: false, cardiacEventsDuringVisit: 0 },
  { id: 'v3', date: '2023-11-11', doctor: 'Dr. S. Patel', visitType: 'routine', personalNotes: 'Monthly cardiology check', doctorNotes: 'Propranolol dose maintained. QTc stable.', treatment: ['Holter monitor review'], medicationsChanged: false, cardiacEventsDuringVisit: 1 },
];

export default function HealthDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showNewEventForm, setShowNewEventForm] = useState(false);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1week' | '1month' | '3months' | '6months'>('1month');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<CardiacEvent['parentNotes']>({
    beforeEvent: '', duringEvent: '', afterEvent: '',
    observations: '', emotionalState: '', activitiesPrior: '',
    medicationsGiven: '', followUpActions: ''
  });
  const [dataLoading, setDataLoading] = useState(true);
  const [allCardiacEvents, setAllCardiacEvents] = useState<CardiacEvent[]>([]);
  const [patientInfo, setPatientInfo] = useState<Patient>(SAMPLE_PATIENT);
  const [isPatientSample, setIsPatientSample] = useState(true);
  const [doctorVisitsData, setDoctorVisitsData] = useState<DoctorVisit[]>(SAMPLE_DOCTOR_VISITS);
  const [isVisitsSample, setIsVisitsSample] = useState(true);
  const [newEvent, setNewEvent] = useState<Partial<CardiacEvent>>({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    type: 'other',
    severity: 'mild',
    duration: '',
    symptoms: [],
    triggers: [],
    vitals: { heartRate: 0, bloodPressure: '', oxygen: 0 },
    notes: '',
    cprRequired: false,
    parentNotes: {
      beforeEvent: '',
      duringEvent: '',
      afterEvent: '',
      observations: '',
      emotionalState: '',
      activitiesPrior: '',
      medicationsGiven: '',
      followUpActions: ''
    }
  });

  useEffect(() => {
    setMounted(true);
    const loadAll = async () => {
      await Promise.all([
        fetch('/api/health-data/events').then(r => r.json()).then(data => {
          if (Array.isArray(data.events) && data.events.length > 0) {
            setAllCardiacEvents(data.events as CardiacEvent[]);
          }
        }).catch(() => {}),
        fetch('/api/health-data/patient').then(r => r.json()).then(data => {
          if (data.patient && data.patient.name) {
            setPatientInfo({ ...SAMPLE_PATIENT, ...data.patient } as Patient);
            setIsPatientSample(false);
          }
        }).catch(() => {}),
        fetch('/api/health-data/visits').then(r => r.json()).then(data => {
          if (Array.isArray(data.visits) && data.visits.length > 0) {
            setDoctorVisitsData(data.visits as DoctorVisit[]);
            setIsVisitsSample(false);
          }
        }).catch(() => {}),
      ]);
      setDataLoading(false);
    };
    loadAll();
  }, []);

  const [toastMessage, setToastMessage] = useState('');
  const [piiWarning, setPiiWarning] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleMessageClick = (memberName: string) => {
    showToast(`Message to ${memberName} — messaging coming soon`);
  };

  const handleViewDetails = (incidentType: string, incidentDate: string) => {
    showToast(`${incidentType} details from ${incidentDate} — expanded view coming soon`);
  };

  const handleAddCardiacEvent = () => {
    setShowNewEventForm(true);
  };

  const handleAddVisitNotes = () => {
    setShowVisitForm(true);
  };

  const blankEventForm: Partial<CardiacEvent> = {
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    type: 'other',
    severity: 'mild',
    duration: '',
    symptoms: [],
    triggers: [],
    vitals: { heartRate: 0, bloodPressure: '', oxygen: 0 },
    notes: '',
    cprRequired: false,
    parentNotes: {
      beforeEvent: '', duringEvent: '', afterEvent: '',
      observations: '', emotionalState: '', activitiesPrior: '',
      medicationsGiven: '', followUpActions: ''
    }
  };

  const handleSaveEvent = () => {
    // Scan all notes fields for PII patterns
    const allNoteText = [
      newEvent.notes,
      newEvent.parentNotes?.activitiesPrior,
      newEvent.parentNotes?.emotionalState,
      newEvent.parentNotes?.beforeEvent,
      newEvent.parentNotes?.duringEvent,
      newEvent.parentNotes?.medicationsGiven,
      newEvent.parentNotes?.afterEvent,
      newEvent.parentNotes?.observations,
      newEvent.parentNotes?.followUpActions,
    ].filter(Boolean).join(' ');
    const piiWarnings = detectPiiInText(allNoteText);
    if (piiWarnings.length > 0) {
      setPiiWarning(piiWarnings[0]);
      return; // block save until user removes PII
    }
    setPiiWarning('');

    const eventToSave: CardiacEvent = {
      id: Date.now().toString(),
      date: newEvent.date || blankEventForm.date!,
      time: newEvent.time || blankEventForm.time!,
      type: newEvent.type || 'other',
      severity: newEvent.severity || 'mild',
      duration: newEvent.duration || '',
      symptoms: newEvent.symptoms || [],
      triggers: newEvent.triggers || [],
      vitals: newEvent.vitals || { heartRate: 0, bloodPressure: '', oxygen: 0 },
      notes: newEvent.notes || '',
      resolved: false,
      cprRequired: newEvent.cprRequired,
      cprDuration: newEvent.cprDuration,
      medicalResponse: newEvent.medicalResponse,
      parentNotes: newEvent.parentNotes,
    };
    setAllCardiacEvents(prev => {
      const updated = [eventToSave, ...prev];
      fetch('/api/health-data/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: updated }),
      }).catch(() => {});
      return updated;
    });
    setShowNewEventForm(false);
    setNewEvent(blankEventForm);
  };

  const handleOpenEditNotes = (event: CardiacEvent) => {
    setEditingEventId(event.id);
    setEditingNotes(event.parentNotes || {
      beforeEvent: '', duringEvent: '', afterEvent: '',
      observations: '', emotionalState: '', activitiesPrior: '',
      medicationsGiven: '', followUpActions: ''
    });
  };

  const handleSaveEditedNotes = () => {
    // PII scan
    const allText = Object.values(editingNotes || {}).filter(Boolean).join(' ');
    const warnings = detectPiiInText(allText);
    if (warnings.length > 0) {
      setPiiWarning(warnings[0]);
      return;
    }
    setPiiWarning('');

    setAllCardiacEvents(prev => {
      const updated = prev.map(e => e.id === editingEventId ? { ...e, parentNotes: editingNotes } : e);
      fetch('/api/health-data/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: updated }),
      }).catch(() => {});
      return updated;
    });
    setEditingEventId(null);
  };

  const handleCancelEvent = () => {
    setShowNewEventForm(false);
    setPiiWarning('');
  };

  const updateNewEvent = (field: string, value: any) => {
    setNewEvent(prev => ({ ...prev, [field]: value }));
  };

  const updateParentNotes = (field: string, value: string) => {
    setNewEvent(prev => ({
      ...prev,
      parentNotes: { ...(prev.parentNotes || {}), [field]: value } as any
    }));
  };

  const handleAnalyzeWithAI = () => {
    router.push('/ai-analysis');
  };

  if (!mounted || dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HealthHeader />
        <div className="flex items-center justify-center pt-32">
          <div className="text-center text-gray-400">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading your health data…</p>
          </div>
        </div>
      </div>
    );
  }


  const getFilteredData = () => {
    const now = new Date();
    const startDate = new Date(now);
    
    switch (selectedTimeRange) {
      case '1week':
        startDate.setDate(now.getDate() - 7);
        break;
      case '1month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
    }
    
    return allCardiacEvents.filter(event => new Date(event.date) >= startDate);
  };

  const filteredCardiacEvents = getFilteredData();

  const calculateTrendAnalysis = (): TrendAnalysis => {
    const eventCount = filteredCardiacEvents.length;
    const daysInPeriod = selectedTimeRange === '1week' ? 7 : selectedTimeRange === '1month' ? 30 : selectedTimeRange === '3months' ? 90 : 180;
    const eventsPerWeek = (eventCount / daysInPeriod) * 7;
    
    const cprEvents = filteredCardiacEvents.filter(event => event.cprRequired);
    const cprCount = cprEvents.length;
    const cprPerWeek = (cprCount / daysInPeriod) * 7;
    const avgCprDuration = cprEvents.length > 0 
      ? cprEvents.reduce((sum, event) => {
          const minutes = parseInt(event.cprDuration?.split(' ')[0] || '0');
          return sum + minutes;
        }, 0) / cprEvents.length
      : 0;
    
    const severityCounts = filteredCardiacEvents.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const severeEvents = (severityCounts.severe || 0) + (severityCounts.critical || 0);
    const totalEvents = eventCount;
    const severityRatio = totalEvents > 0 ? severeEvents / totalEvents : 0;
    
    const overallTrend = cprPerWeek > 1 ? 'declining' : eventsPerWeek > 3 ? 'declining' : eventsPerWeek > 1 ? 'stable' : 'improving';
    const severityTrend = severityRatio > 0.4 || cprPerWeek > 0.5 ? 'increasing' : severityRatio > 0.2 ? 'stable' : 'decreasing';
    
    const allTriggers = filteredCardiacEvents.flatMap(event => event.triggers || []);
    const triggerCounts = allTriggers.reduce((acc, trigger) => {
      acc[trigger] = (acc[trigger] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const primaryTriggers = Object.entries(triggerCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([trigger]) => trigger);
    
    const recommendations = [
      cprCount > 0 ? `URGENT: ${cprCount} CPR events in ${selectedTimeRange.replace('1', '1 ')} - immediate device therapy evaluation needed` : 'Continue current treatment plan',
      'Implantable Cardioverter-Defibrillator (ICD) consultation recommended',
      'Family and school CPR training completed',
      'Emergency action plan distributed to all caregivers',
      'Consider beta-blocker dosage adjustment',
      'Restrict high-intensity physical activities',
      '24/7 cardiac monitoring consideration'
    ];
    
    return {
      overallTrend,
      eventFrequency: Math.round(eventsPerWeek * 10) / 10,
      severityTrend,
      primaryTriggers,
      recommendations,
      aiAnalysis: `CRITICAL ASSESSMENT: ${cprCount} cardiac arrests requiring CPR in ${selectedTimeRange.replace('1', '1 ')} (${cprPerWeek.toFixed(1)} per week). Average CPR duration: ${avgCprDuration.toFixed(1)} minutes. ${cprCount > 0 ? 'This pattern indicates high-risk condition requiring immediate intervention. ICD implantation strongly recommended to prevent sudden cardiac death.' : 'No CPR events in selected period - continue current management.'} Overall event frequency: ${eventsPerWeek.toFixed(1)} per week with ${severityRatio > 0.4 ? 'critically high' : severityRatio > 0.2 ? 'elevated' : 'manageable'} severity ratio. Primary triggers: ${primaryTriggers.join(', ')}.`,
      lastUpdated: new Date().toLocaleDateString()
    };
  };

  const trendAnalysis = calculateTrendAnalysis();

  const doctorVisits = doctorVisitsData;

  const generateVitalSignsData = () => {
    const eventData = filteredCardiacEvents.map(event => ({
      isoDate: event.date,
      date: new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      heartRate: event.vitals.heartRate || 0,
      systolic: parseInt(event.vitals.bloodPressure?.split('/')[0] || '0'),
      oxygen: event.vitals.oxygen || 0,
      severity: event.severity,
      eventType: event.type,
      cprRequired: !!event.cprRequired,
      hasDoctorVisit: doctorVisits.some(v => v.date === event.date),
    }));
    return eventData.sort((a, b) => new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime());
  };

  const vitalSignsData = generateVitalSignsData();

  // Doctor visit reference lines — use same date label format as chart X axis
  const doctorVisitLabels = doctorVisits
    .filter(v => vitalSignsData.some(d => d.isoDate <= v.date) || vitalSignsData.some(d => d.isoDate >= v.date))
    .map(v => ({
      ...v,
      dateLabel: new Date(v.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));

  const SEVERITY_COLORS: Record<string, string> = {
    mild: '#22C55E',
    moderate: '#F59E0B',
    severe: '#F97316',
    critical: '#EF4444',
  };

  // Custom dot: colored by severity, larger ring for CPR events
  const CustomEventDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy || payload.heartRate === 0) return null;
    const color = SEVERITY_COLORS[payload.severity] ?? '#6B7280';
    const isCPR = payload.cprRequired;
    return (
      <g>
        {isCPR && <circle cx={cx} cy={cy} r={16} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1.5} strokeDasharray="3 2" />}
        <circle cx={cx} cy={cy} r={isCPR ? 9 : 6} fill={color} stroke="white" strokeWidth={2.5} />
        {isCPR && (
          <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={10} fontWeight="bold">!</text>
        )}
      </g>
    );
  };

  // Custom tooltip with full event detail
  const VitalsTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    const color = SEVERITY_COLORS[d?.severity] ?? '#6B7280';
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-4 text-sm min-w-[180px]">
        <div className="font-bold text-gray-800 mb-2 text-base">{label}</div>
        <div className="space-y-1">
          {d?.heartRate > 0 && <div className="flex justify-between gap-4"><span className="text-gray-500">Heart Rate</span><span className="font-semibold text-blue-600">{d.heartRate} bpm</span></div>}
          {d?.systolic > 0 && <div className="flex justify-between gap-4"><span className="text-gray-500">Blood Pressure</span><span className="font-semibold text-emerald-600">{d.systolic} mmHg</span></div>}
          {d?.oxygen > 0 && <div className="flex justify-between gap-4"><span className="text-gray-500">Oxygen Sat</span><span className="font-semibold text-purple-600">{d.oxygen}%</span></div>}
        </div>
        <div className="mt-3 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
            <span className="capitalize font-medium" style={{ color }}>{d?.severity}</span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-600 capitalize">{d?.eventType?.replace(/_/g, ' ')}</span>
          </div>
          {d?.cprRequired && <div className="mt-1 text-xs font-bold text-red-600 bg-red-50 rounded px-2 py-0.5 inline-block">⚠ CPR Required</div>}
        </div>
      </div>
    );
  };

  const medicationAdherenceData = patientInfo.medications.map(m => ({
    name: m.name.length > 12 ? m.name.slice(0, 12) + '…' : m.name,
    taken: 0,
    missed: 0,
  }));

  const incidentSeverityData = (() => {
    const severityCounts = filteredCardiacEvents.reduce((acc, event) => {
      const severity = event.severity === 'critical' ? 'High' : event.severity === 'severe' ? 'High' : event.severity === 'moderate' ? 'Medium' : 'Low';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return [
      { name: 'Low', value: severityCounts.Low || 0, color: '#22C55E' },
      { name: 'Medium', value: severityCounts.Medium || 0, color: '#F97316' },
      { name: 'High', value: severityCounts.High || 0, color: '#EF4444' },
    ];
  })();

  const patient = patientInfo;

  const cprEvents = filteredCardiacEvents.filter(event => event.cprRequired);
  const cprCount = cprEvents.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <HealthHeader />
      <div className="p-6">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-5 py-3 rounded-xl shadow-lg">
          {toastMessage}
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        {(isPatientSample || isVisitsSample) && (
          <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl px-5 py-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="text-amber-500 font-bold text-lg shrink-0">⚠</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">Sample Data Shown</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {isPatientSample && 'Patient profile, care team, and medications are sample data. '}
                  {isVisitsSample && 'Doctor visits are sample data. '}
                  Add your own data and it will replace this automatically.
                </p>
              </div>
            </div>
            <a href="/settings" className="shrink-0 text-xs font-semibold text-amber-800 underline whitespace-nowrap mt-0.5">Set Up Profile →</a>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pediatric Cardiac Emergency Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">{patient.name} (Age {patient.age}) - {patient.primaryConcern.split(' - ')[0]}</p>
          </div>
          <div className="flex items-center space-x-4">
            {cprCount > 0 && (
              <div className="bg-red-600 border border-red-800 text-white px-4 py-2 rounded-lg">
                <span className="font-bold">CPR EVENTS: {cprCount}</span>
                <span className="block text-xs">In {selectedTimeRange.replace('1', '1 ')}</span>
              </div>
            )}
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg">
              <span className="font-semibold">CRITICAL ALERT</span>
              <span className="block text-xs">{trendAnalysis.eventFrequency}/week</span>
            </div>
          </div>
        </div>

        <div className="flex space-x-2 mb-6">
          {(['1week', '1month', '3months', '6months'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setSelectedTimeRange(range)}
              className={`px-4 py-2 rounded-lg capitalize ${
                selectedTimeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              {range.replace('1', '1 ')}
            </button>
          ))}
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-bold text-red-800">AI Trend Analysis Summary</h2>
          </div>
          <p className="text-red-700 mb-4">{trendAnalysis.aiAnalysis}</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-3">
              <div className="text-sm text-gray-500">Overall Trend</div>
              <div className="text-lg font-bold text-red-600">{trendAnalysis.overallTrend.toUpperCase()}</div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-sm text-gray-500">Event Frequency</div>
              <div className="text-lg font-bold text-red-600">{trendAnalysis.eventFrequency}/week</div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-sm text-gray-500">Severity Trend</div>
              <div className="text-lg font-bold text-red-600">{trendAnalysis.severityTrend.toUpperCase()}</div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-sm text-gray-500">Primary Triggers</div>
              <div className="text-sm font-bold text-red-600">{trendAnalysis.primaryTriggers.join(', ')}</div>
            </div>
          </div>
        </div>

        {showNewEventForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-4xl max-h-screen overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Record Cardiac Event</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Event Details</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                    <div className="flex space-x-2">
                      <input
                        type="date"
                        value={newEvent.date}
                        onChange={(e) => updateNewEvent('date', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="time"
                        value={newEvent.time}
                        onChange={(e) => updateNewEvent('time', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                    <select
                      value={newEvent.type}
                      onChange={(e) => updateNewEvent('type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="arrhythmia">Arrhythmia</option>
                      <option value="chest_pain">Chest Pain</option>
                      <option value="palpitations">Palpitations</option>
                      <option value="shortness_breath">Shortness of Breath</option>
                      <option value="fatigue">Fatigue</option>
                      <option value="dizziness">Dizziness</option>
                      <option value="cardiac_arrest">Cardiac Arrest</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                    <select
                      value={newEvent.severity}
                      onChange={(e) => updateNewEvent('severity', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                    <input
                      type="text"
                      value={newEvent.duration}
                      onChange={(e) => updateNewEvent('duration', e.target.value)}
                      placeholder="e.g., 15 minutes"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vital Signs</label>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        value={newEvent.vitals?.heartRate || ''}
                        onChange={(e) => updateNewEvent('vitals', { ...newEvent.vitals, heartRate: parseInt(e.target.value) || 0 })}
                        placeholder="HR"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="text"
                        value={newEvent.vitals?.bloodPressure || ''}
                        onChange={(e) => updateNewEvent('vitals', { ...newEvent.vitals, bloodPressure: e.target.value })}
                        placeholder="BP"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="number"
                        value={newEvent.vitals?.oxygen || ''}
                        onChange={(e) => updateNewEvent('vitals', { ...newEvent.vitals, oxygen: parseInt(e.target.value) || 0 })}
                        placeholder="O2"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newEvent.cprRequired || false}
                        onChange={(e) => updateNewEvent('cprRequired', e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">CPR Required</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-5">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Parent Comments</h3>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                    <strong>Privacy reminder:</strong> Use first names only for people. Do not include phone numbers, home addresses, or full names.
                  </div>

                  {piiWarning && (
                    <div className="bg-red-50 border border-red-300 rounded-lg px-3 py-2 text-xs text-red-800 font-medium">
                      ⚠ {piiWarning}
                    </div>
                  )}

                  {/* Phase 1 - Before */}
                  <div className="border border-yellow-200 rounded-lg overflow-hidden">
                    <div className="bg-yellow-50 px-3 py-2 flex items-center gap-2">
                      <span className="text-yellow-700 font-bold text-sm">① LEADING UP TO EVENT</span>
                    </div>
                    <div className="p-3 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">What was the child doing before the event started?</label>
                        <textarea
                          value={newEvent.parentNotes?.activitiesPrior || ''}
                          onChange={(e) => updateParentNotes('activitiesPrior', e.target.value)}
                          rows={2}
                          placeholder="e.g. Running in PE class, sitting quietly, eating lunch..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">How was the child feeling emotionally and physically beforehand?</label>
                        <textarea
                          value={newEvent.parentNotes?.emotionalState || ''}
                          onChange={(e) => updateParentNotes('emotionalState', e.target.value)}
                          rows={2}
                          placeholder="e.g. Anxious about test, calm and happy, seemed tired..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Any other details leading up to the event</label>
                        <textarea
                          value={newEvent.parentNotes?.beforeEvent || ''}
                          onChange={(e) => updateParentNotes('beforeEvent', e.target.value)}
                          rows={2}
                          placeholder="e.g. Skipped medication this morning, had a large meal, hadn't slept well..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Phase 2 - During */}
                  <div className="border border-red-200 rounded-lg overflow-hidden">
                    <div className="bg-red-50 px-3 py-2 flex items-center gap-2">
                      <span className="text-red-700 font-bold text-sm">② DURING THE EVENT</span>
                    </div>
                    <div className="p-3 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">What did you observe happening during the event?</label>
                        <textarea
                          value={newEvent.parentNotes?.duringEvent || ''}
                          onChange={(e) => updateParentNotes('duringEvent', e.target.value)}
                          rows={3}
                          placeholder="e.g. Child collapsed, turned pale/blue, was conscious but distressed, had difficulty breathing..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">What medications or interventions were given?</label>
                        <textarea
                          value={newEvent.parentNotes?.medicationsGiven || ''}
                          onChange={(e) => updateParentNotes('medicationsGiven', e.target.value)}
                          rows={2}
                          placeholder="e.g. Used emergency epinephrine, performed CPR, called 911, gave rescue inhaler..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Phase 3 - After */}
                  <div className="border border-green-200 rounded-lg overflow-hidden">
                    <div className="bg-green-50 px-3 py-2 flex items-center gap-2">
                      <span className="text-green-700 font-bold text-sm">③ AFTER THE EVENT</span>
                    </div>
                    <div className="p-3 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">How was the child after the event? Describe recovery.</label>
                        <textarea
                          value={newEvent.parentNotes?.afterEvent || ''}
                          onChange={(e) => updateParentNotes('afterEvent', e.target.value)}
                          rows={3}
                          placeholder="e.g. Regained consciousness after 2 min, confused but responsive, transported to hospital, rested at home..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Additional observations and follow-up actions taken</label>
                        <textarea
                          value={newEvent.parentNotes?.observations || ''}
                          onChange={(e) => updateParentNotes('observations', e.target.value)}
                          rows={2}
                          placeholder="e.g. Called Dr. Patel, scheduled follow-up appointment, notified school nurse..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Planned follow-up actions</label>
                        <textarea
                          value={newEvent.parentNotes?.followUpActions || ''}
                          onChange={(e) => updateParentNotes('followUpActions', e.target.value)}
                          rows={2}
                          placeholder="e.g. Cardiology appointment booked, adjusted medication schedule, updated emergency plan..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  onClick={handleCancelEvent}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEvent}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Event
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Vital Signs Trend</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Cardiac events plotted chronologically with severity markers</p>
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-600">
                  <div className="flex items-center gap-3 border border-gray-200 rounded-lg px-3 py-1.5">
                    <span className="font-semibold text-gray-500 uppercase tracking-wide mr-1">Severity:</span>
                    {Object.entries(SEVERITY_COLORS).map(([sev, color]) => (
                      <span key={sev} className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full border-2 border-white shadow-sm" style={{ background: color }} />
                        <span className="capitalize">{sev}</span>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 border border-gray-200 rounded-lg px-3 py-1.5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-red-400 ring-2 ring-red-200" />
                      <span>CPR Event</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-4 border-t-2 border-dashed border-indigo-500" />
                      <span>Doctor Visit</span>
                    </span>
                  </div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={vitalSignsData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip content={<VitalsTooltip />} />

                  {/* Doctor visit reference lines */}
                  {doctorVisitLabels.map(visit => (
                    <ReferenceLine
                      key={visit.id}
                      x={visit.dateLabel}
                      stroke="#6366F1"
                      strokeDasharray="5 3"
                      strokeWidth={1.5}
                      label={{
                        value: `Dr. ${visit.doctor.split(' ').pop()}`,
                        position: 'insideTopRight',
                        fill: '#6366F1',
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    />
                  ))}

                  {/* Heart Rate line with severity-colored custom dots */}
                  <Line
                    type="monotone"
                    dataKey="heartRate"
                    stroke="#3B82F6"
                    strokeWidth={2.5}
                    name="Heart Rate (bpm)"
                    dot={<CustomEventDot />}
                    activeDot={{ r: 8, stroke: '#3B82F6', strokeWidth: 2 }}
                    connectNulls={false}
                  />

                  {/* Systolic BP line */}
                  <Line
                    type="monotone"
                    dataKey="systolic"
                    stroke="#10B981"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    name="Systolic BP (mmHg)"
                    dot={false}
                    activeDot={{ r: 5, stroke: '#10B981', strokeWidth: 2 }}
                  />

                  {/* Oxygen saturation line */}
                  <Line
                    type="monotone"
                    dataKey="oxygen"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    strokeDasharray="2 4"
                    name="O₂ Sat (%)"
                    dot={false}
                    activeDot={{ r: 5, stroke: '#8B5CF6', strokeWidth: 2 }}
                  />

                  <Legend
                    verticalAlign="bottom"
                    wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }}
                    formatter={(value) => <span style={{ color: '#374151' }}>{value}</span>}
                  />
                </LineChart>
              </ResponsiveContainer>

              {/* Doctor visit summary below chart */}
              {doctorVisitLabels.length > 0 && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Doctor Visits in Period</div>
                  <div className="flex flex-wrap gap-2">
                    {doctorVisitLabels.map(visit => (
                      <div key={visit.id} className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-xs">
                        <span className="inline-block w-3 border-t-2 border-dashed border-indigo-500 shrink-0" />
                        <div>
                          <span className="font-semibold text-indigo-800">{visit.dateLabel}</span>
                          <span className="text-indigo-600"> · {visit.doctor}</span>
                          <span className="text-indigo-500"> · {visit.visitType.replace('_', ' ')}</span>
                          {visit.medicationsChanged && <span className="ml-1 bg-amber-100 text-amber-700 rounded px-1 font-medium">Rx changed</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Medication Adherence</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={medicationAdherenceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="taken" fill="#22C55E" name="Taken (%)" />
                    <Bar dataKey="missed" fill="#EF4444" name="Missed (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Incident Severity Distribution</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={incidentSeverityData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label
                    >
                      {incidentSeverityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Patient Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Full Name</h3>
                    <p className="mt-1 text-gray-900">{patient.name}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Age</h3>
                    <p className="mt-1 text-gray-900">{patient.age} years</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Primary Concern</h3>
                    <p className="mt-1 text-gray-900">{patient.primaryConcern}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Last Visit</h3>
                    <p className="mt-1 text-gray-900">{patient.lastVisit}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Next Appointment</h3>
                    <p className="mt-1 text-gray-900 font-medium text-blue-600">
                      {patient.nextAppointment}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Cardiac Events Timeline ({filteredCardiacEvents.length} events)</h2>
                <button 
                  onClick={handleAddCardiacEvent}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  + Add Event
                </button>
              </div>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredCardiacEvents.map((event) => {
                  const severityColors = {
                    mild: 'bg-green-100 text-green-800 border-green-200',
                    moderate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                    severe: 'bg-orange-100 text-orange-800 border-orange-200',
                    critical: 'bg-red-100 text-red-800 border-red-200'
                  };
                  
                  return (
                    <div key={event.id} className={`border rounded-lg p-4 ${severityColors[event.severity]} ${event.cprRequired ? 'border-4 border-red-500' : ''}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold capitalize">{event.type.replace('_', ' ')}</span>
                            <span className="text-sm opacity-75">{event.severity.toUpperCase()}</span>
                            {event.cprRequired && (
                              <span className="bg-red-600 text-white text-xs px-2 py-1 rounded animate-pulse">CPR REQUIRED</span>
                            )}
                          </div>
                          <div className="text-sm opacity-75">
                            {event.date} at {event.time} • {event.duration}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-2">
                        <div className="text-sm font-medium mb-1">Symptoms:</div>
                        <div className="text-sm">{event.symptoms.join(', ')}</div>
                      </div>
                      
                      {event.triggers && event.triggers.length > 0 && (
                        <div className="mb-2">
                          <div className="text-sm font-medium mb-1">Triggers:</div>
                          <div className="text-sm">{event.triggers.join(', ')}</div>
                        </div>
                      )}
                      
                      <div className="text-xs mb-2">
                        HR: {event.vitals.heartRate} • BP: {event.vitals.bloodPressure} • O2: {event.vitals.oxygen}%
                      </div>
                      
                      {event.cprRequired && (
                        <div className="bg-red-50 border border-red-200 rounded p-2 mb-2">
                          <div className="text-sm font-bold text-red-800">CPR Details:</div>
                          <div className="text-xs text-red-700">
                            Duration: {event.cprDuration} • 
                            EMS Response: {event.medicalResponse?.emsResponseTime} • 
                            Defibrillator: {event.medicalResponse?.defibrillatorUsed ? 'YES' : 'NO'} • 
                            Hospital Transport: {event.medicalResponse?.hospitalTransport ? 'YES' : 'NO'}
                          </div>
                        </div>
                      )}

                      <div className="mt-3 border-t border-current border-opacity-20 pt-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-semibold">Parent Comments</span>
                          <button
                            onClick={() => handleOpenEditNotes(event)}
                            className="text-xs px-2 py-1 bg-white bg-opacity-60 border border-current border-opacity-30 rounded hover:bg-opacity-90 transition-colors font-medium"
                          >
                            {event.parentNotes?.beforeEvent || event.parentNotes?.duringEvent || event.parentNotes?.afterEvent ? 'Edit Notes' : '+ Add Notes'}
                          </button>
                        </div>
                        {event.parentNotes?.beforeEvent || event.parentNotes?.duringEvent || event.parentNotes?.afterEvent ? (
                          <div className="space-y-1 text-xs">
                            {event.parentNotes?.beforeEvent && (
                              <div className="flex gap-1">
                                <span className="font-semibold text-yellow-700 shrink-0">Before:</span>
                                <span>{event.parentNotes.beforeEvent}</span>
                              </div>
                            )}
                            {event.parentNotes?.duringEvent && (
                              <div className="flex gap-1">
                                <span className="font-semibold text-red-700 shrink-0">During:</span>
                                <span>{event.parentNotes.duringEvent}</span>
                              </div>
                            )}
                            {event.parentNotes?.afterEvent && (
                              <div className="flex gap-1">
                                <span className="font-semibold text-green-700 shrink-0">After:</span>
                                <span>{event.parentNotes.afterEvent}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs opacity-60 italic">No comments yet. Click &quot;+ Add Notes&quot; to document what happened before, during, and after this event.</p>
                        )}
                      </div>

                      {event.notes && <div className="text-sm italic mt-2 opacity-75">"{event.notes}"</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Recent Activity</h2>
                <Link href="/activity" className="text-sm font-medium text-blue-600 hover:text-blue-800">
                  View all
                </Link>
              </div>
              <div className="space-y-4">
                {patient.recentActivity.map((activity, index) => (
                  <div key={index} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{activity.type}</p>
                        <p className="text-sm text-gray-500">{activity.details}</p>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <p className="text-sm text-gray-500">
                          {new Date(activity.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Care Team</h2>
              <div className="space-y-4">
                {patient.careTeam.map((member, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-medium">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{member.name}</p>
                      <p className="text-sm text-gray-500">{member.role}</p>
                      {member.specialty && (
                        <p className="text-xs text-gray-400">{member.specialty}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Medications</h2>
                <Link href="/medications" className="text-sm font-medium text-blue-600 hover:text-blue-800">
                  View all
                </Link>
              </div>
              <div className="space-y-4">
                {patient.medications.map((med, index) => (
                  <div key={index} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{med.name}</p>
                        <p className="text-sm text-gray-500">{med.dosage}</p>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {med.frequency}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Incident Reports</h2>
                <Link 
                  href="/incidents" 
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  View all
                </Link>
              </div>
              <div className="space-y-4">
                {patient.incidentReports.map((incident, index) => {
                  const severityColors = {
                    low: 'bg-green-100 text-green-800',
                    medium: 'bg-yellow-100 text-yellow-800',
                    high: 'bg-red-100 text-red-800'
                  };
                  const statusColors = {
                    resolved: 'bg-green-100 text-green-800',
                    investigating: 'bg-blue-100 text-blue-800',
                    monitoring: 'bg-yellow-100 text-yellow-800'
                  };
                  
                  return (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${severityColors[incident.severity]}`}>
                              {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)}
                            </span>
                            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusColors[incident.status]}`}>
                              {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                            </span>
                          </div>
                          <h3 className="font-medium text-gray-900">{incident.type}</h3>
                          <p className="text-sm text-gray-600 mt-1">{incident.description}</p>
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          {new Date(incident.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                        <button 
                          onClick={() => handleViewDetails(incident.type, incident.date)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-blue-800 mb-4">AI Recommendations</h2>
              <ul className="space-y-2">
                {trendAnalysis.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span className="text-sm text-blue-700">{rec}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 text-xs text-blue-600">
                Last analyzed: {trendAnalysis.lastUpdated}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Notes Modal */}
      {editingEventId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Event Comments</h2>
              <p className="text-sm text-gray-500 mb-3">Document what happened before, during, and after this event to help your care team.</p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 mb-4">
                <strong>Privacy reminder:</strong> Use first names only for people. Do not include phone numbers, home addresses, or full names.
              </div>
              {piiWarning && (
                <div className="bg-red-50 border border-red-300 rounded-lg px-3 py-2 text-xs text-red-800 font-medium mb-4">
                  ⚠ {piiWarning}
                </div>
              )}

              {/* Phase 1 - Before */}
              <div className="border border-yellow-200 rounded-lg overflow-hidden mb-4">
                <div className="bg-yellow-50 px-4 py-3">
                  <div className="font-bold text-yellow-800">① LEADING UP TO THE EVENT</div>
                  <div className="text-xs text-yellow-600 mt-0.5">What was happening in the hours or minutes before symptoms began?</div>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Activities before the event</label>
                    <textarea
                      value={editingNotes?.activitiesPrior || ''}
                      onChange={(e) => setEditingNotes(n => ({ ...n!, activitiesPrior: e.target.value }))}
                      rows={2}
                      placeholder="e.g. Running in PE class, sitting quietly, eating lunch..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Child's emotional and physical state beforehand</label>
                    <textarea
                      value={editingNotes?.emotionalState || ''}
                      onChange={(e) => setEditingNotes(n => ({ ...n!, emotionalState: e.target.value }))}
                      rows={2}
                      placeholder="e.g. Anxious about test, calm and happy, seemed tired..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Other relevant details leading up to the event</label>
                    <textarea
                      value={editingNotes?.beforeEvent || ''}
                      onChange={(e) => setEditingNotes(n => ({ ...n!, beforeEvent: e.target.value }))}
                      rows={2}
                      placeholder="e.g. Skipped medication, had a large meal, hadn't slept well..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Phase 2 - During */}
              <div className="border border-red-200 rounded-lg overflow-hidden mb-4">
                <div className="bg-red-50 px-4 py-3">
                  <div className="font-bold text-red-800">② DURING THE EVENT</div>
                  <div className="text-xs text-red-600 mt-0.5">What did you observe while the event was occurring?</div>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">What you observed during the event</label>
                    <textarea
                      value={editingNotes?.duringEvent || ''}
                      onChange={(e) => setEditingNotes(n => ({ ...n!, duringEvent: e.target.value }))}
                      rows={3}
                      placeholder="e.g. Child collapsed, turned pale/blue, was conscious but distressed, had difficulty breathing..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Medications or interventions given during the event</label>
                    <textarea
                      value={editingNotes?.medicationsGiven || ''}
                      onChange={(e) => setEditingNotes(n => ({ ...n!, medicationsGiven: e.target.value }))}
                      rows={2}
                      placeholder="e.g. Used emergency epinephrine, performed CPR, called 911..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-400 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Phase 3 - After */}
              <div className="border border-green-200 rounded-lg overflow-hidden mb-6">
                <div className="bg-green-50 px-4 py-3">
                  <div className="font-bold text-green-800">③ AFTER THE EVENT</div>
                  <div className="text-xs text-green-600 mt-0.5">How did the child recover and what actions were taken?</div>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Child's recovery and condition after the event</label>
                    <textarea
                      value={editingNotes?.afterEvent || ''}
                      onChange={(e) => setEditingNotes(n => ({ ...n!, afterEvent: e.target.value }))}
                      rows={3}
                      placeholder="e.g. Regained consciousness after 2 min, confused but responsive, transported to hospital..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Additional observations</label>
                    <textarea
                      value={editingNotes?.observations || ''}
                      onChange={(e) => setEditingNotes(n => ({ ...n!, observations: e.target.value }))}
                      rows={2}
                      placeholder="e.g. Classmates reported no warning signs, child seems traumatized..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Follow-up actions taken or planned</label>
                    <textarea
                      value={editingNotes?.followUpActions || ''}
                      onChange={(e) => setEditingNotes(n => ({ ...n!, followUpActions: e.target.value }))}
                      rows={2}
                      placeholder="e.g. Called Dr. Patel, scheduled follow-up, updated emergency plan..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setEditingEventId(null)}
                  className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditedNotes}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Save Comments
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
