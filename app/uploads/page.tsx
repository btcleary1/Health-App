'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import HealthHeader from '@/components/HealthHeader';
import HIPAAFooter from '@/components/HIPAAFooter';
import UploadConsent from '@/components/UploadConsent';
import { Upload, FileImage, FileText, File, X, Check, AlertCircle, Brain, Loader2, ShieldAlert } from 'lucide-react';
import { usePersonContext } from '@/lib/PersonContext';
import { detectPiiInText } from '@/lib/pii-validator';

const CATEGORIES = [
  { value: 'lab-results', label: 'Lab Results' },
  { value: 'ecg', label: 'ECG / EKG' },
  { value: 'imaging', label: 'Imaging (X-ray, Echo, MRI)' },
  { value: 'doctor-notes', label: "Doctor's Notes / Letters" },
  { value: 'prescription', label: 'Prescription' },
  { value: 'insurance', label: 'Insurance / Authorization' },
  { value: 'screenshot', label: 'Screenshot / Photo' },
  { value: 'general', label: 'General / Other' },
];

interface UploadedFile {
  id: string;
  originalName: string;
  category: string;
  note: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
  aiSummary?: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith('image/')) return <FileImage className="w-8 h-8" style={{ color: '#60A5FA' }} />;
  if (type === 'application/pdf') return <FileText className="w-8 h-8" style={{ color: '#F87171' }} />;
  return <File className="w-8 h-8" style={{ color: '#9CA3AF' }} />;
}

export default function UploadsPage() {
  const { activeId, personQuery } = usePersonContext();
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [uploadsLoading, setUploadsLoading] = useState(true);
  const [patientData, setPatientData] = useState<any>(null);
  const [eventsData, setEventsData] = useState<any[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [note, setNote] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [noteError, setNoteError] = useState('');
  const [redactedCount, setRedactedCount] = useState<number | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUploadsLoading(true);
    Promise.all([
      fetch(`/api/uploads${personQuery}`).then(r => r.json()).catch(() => ({ files: [] })),
      fetch(`/api/health-data/patient${personQuery}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/health-data/events${personQuery}`).then(r => r.json()).catch(() => ({ events: [] })),
    ]).then(([uploadData, pd, ev]) => {
      if (Array.isArray(uploadData.files)) setUploads(uploadData.files);
      if (pd.patient) setPatientData(pd.patient);
      if (Array.isArray(ev.events)) setEventsData(ev.events);
    }).finally(() => setUploadsLoading(false));
  }, [activeId, personQuery]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      if (!consentAccepted) { setShowConsent(true); setPendingFile(file); } else { setPendingFile(file); }
    }
  }, [consentAccepted]);

  const handleBrowseClick = () => {
    if (!consentAccepted) { setShowConsent(true); } else { fileInputRef.current?.click(); }
  };

  const handleConsentAccept = () => {
    setConsentAccepted(true);
    setShowConsent(false);
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    const noteWarnings = detectPiiInText(note);
    if (noteWarnings.length > 0) {
      setNoteError(noteWarnings[0]);
      return;
    }
    setUploading(true);
    setError('');
    setNoteError('');
    setRedactedCount(null);
    try {
      const formData = new FormData();
      formData.append('file', pendingFile);
      formData.append('category', selectedCategory);
      formData.append('note', note);

      const res = await fetch(`/api/uploads${personQuery}`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.redactedCount > 0) setRedactedCount(data.redactedCount);
      setUploads(prev => [data.file, ...prev]);
      setPendingFile(null);
      setNote('');
      setSelectedCategory('general');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const analyzeWithAI = async (upload: UploadedFile) => {
    setAnalyzingId(upload.id);
    try {
      const patient = patientData ?? { name: 'your patient', age: null, primaryConcern: 'See uploaded document' };
      const recentEvents = eventsData.slice(-5);

      const res = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientData: patient,
          events: recentEvents,
          focusArea: `The family just uploaded a "${CATEGORIES.find(c => c.value === upload.category)?.label || upload.category}" document (file: "${upload.originalName}"${upload.note ? `, note: "${upload.note}"` : ''}). Based on ${patient.name}'s medical history and recent events, provide a 2-3 sentence clinical summary of what this type of document likely shows, what key values or findings the family should ask the doctor about, and any red flags to watch for in this document type.`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const briefing = data.analysis?.doctorBriefing;
      const summary = briefing
        ? [briefing.oneLineSummary, ...(briefing.criticalHistory || [])].filter(Boolean).join(' ')
        : 'Analysis complete — see full AI Analysis page for details.';

      setUploads(prev => prev.map(u => u.id === upload.id ? { ...u, aiSummary: summary } : u));
    } catch (e: any) {
      setError('AI analysis failed: ' + e.message);
    } finally {
      setAnalyzingId(null);
    }
  };

  const removeUpload = async (id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
    await fetch(`/api/uploads${personQuery}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId: id }),
    }).catch(() => {});
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg,#050814 0%,#0B1120 60%,#0f172a 100%)' }}>
      {showConsent && (
        <UploadConsent
          onAccept={handleConsentAccept}
          onCancel={() => { setShowConsent(false); setPendingFile(null); }}
        />
      )}
      <HealthHeader />
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24 sm:pb-10">

        {/* Page header */}
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl shrink-0" style={{ background: 'linear-gradient(135deg,#3B82F6,#6366F1)', boxShadow: '0 2px 12px rgba(99,102,241,0.3)' }}>
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white leading-tight">Medical Files</h1>
              <p className="text-xs" style={{ color: '#6B7280' }}>Lab results, ECGs, doctor notes & more</p>
            </div>
          </div>
          <p className="text-sm mt-3" style={{ color: '#9CA3AF' }}>
            Upload screenshots, photos, lab results, ECGs, and doctor letters. AI can help contextualize what they mean for {patientData?.name ?? 'the person you\'re tracking'}&apos;s case.
          </p>
        </div>

        {/* Privacy notice */}
        <div className="rounded-2xl px-4 py-3 mb-5 flex gap-3 items-start" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#FBBF24' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#FCD34D' }}>Privacy reminder before uploading</p>
            <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
              Only use <strong className="text-white/80">first names</strong> — no last names, phone numbers, home addresses, or Social Security numbers.
              For PDFs and images, black out or blur sensitive information before uploading.
              Text files (.txt) are automatically scanned and PII is redacted on upload.
            </p>
          </div>
        </div>

        {redactedCount !== null && redactedCount > 0 && (
          <div className="rounded-2xl px-4 py-3 mb-4 flex gap-2 items-center text-sm" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#86EFAC' }}>
            <Check className="w-4 h-4 shrink-0" style={{ color: '#4ADE80' }} />
            {redactedCount} piece{redactedCount !== 1 ? 's' : ''} of personal information were automatically redacted from the uploaded text file.
          </div>
        )}

        {/* Upload card */}
        <div className="rounded-2xl p-5 mb-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,.pdf,.txt"
          />

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className="rounded-2xl p-8 text-center transition-all"
            style={{
              border: `2px dashed ${dragging ? '#3B82F6' : pendingFile ? '#22C55E' : 'rgba(255,255,255,0.12)'}`,
              background: dragging ? 'rgba(59,130,246,0.08)' : pendingFile ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.02)',
            }}
          >
            {pendingFile ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}>
                  <Check className="w-6 h-6" style={{ color: '#4ADE80' }} />
                </div>
                <div className="font-semibold text-white">{pendingFile.name}</div>
                <div className="text-sm" style={{ color: '#4ADE80' }}>{formatSize(pendingFile.size)}</div>
                <button
                  onClick={() => setPendingFile(null)}
                  className="flex items-center gap-1 text-xs mt-1 transition-colors hover:text-red-400"
                  style={{ color: '#6B7280' }}
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4" style={{ color: '#6B7280' }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Upload className="w-7 h-7" style={{ color: '#9CA3AF' }} />
                </div>
                <div>
                  <div className="font-semibold text-white">Drag and drop a file here</div>
                  <div className="text-sm mt-1" style={{ color: '#6B7280' }}>Photos, screenshots, PDFs, lab results, ECGs — up to 10MB</div>
                </div>
                <button
                  onClick={handleBrowseClick}
                  className="px-5 py-2.5 rounded-xl font-medium text-sm text-white transition-all"
                  style={{ background: 'linear-gradient(135deg,#3B82F6,#6366F1)', boxShadow: '0 2px 12px rgba(99,102,241,0.3)' }}
                >
                  Browse Files
                </button>
              </div>
            )}
          </div>

          {/* Form fields */}
          {pendingFile && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#D1D5DB' }}>Category</label>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value} style={{ background: '#1E293B' }}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#D1D5DB' }}>
                  Note <span className="font-normal" style={{ color: '#6B7280' }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={e => { setNote(e.target.value); setNoteError(''); }}
                  onBlur={e => { const w = detectPiiInText(e.target.value); if (w.length > 0) setNoteError(w[0]); }}
                  placeholder="e.g. Dr. Sarah visit Nov 20, QTc result was 520ms"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:ring-2 transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: `1px solid ${noteError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  }}
                />
                {noteError
                  ? <p className="text-xs mt-1" style={{ color: '#F87171' }}>⚠ {noteError}</p>
                  : <p className="text-xs mt-1" style={{ color: '#4B5563' }}>First names only — no last names, phone numbers, or addresses</p>}
              </div>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-60 transition-all"
                style={{ background: 'linear-gradient(135deg,#3B82F6,#6366F1)', boxShadow: uploading ? 'none' : '0 2px 12px rgba(99,102,241,0.3)' }}
              >
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload File</>}
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-xl p-4 mb-4 flex gap-2 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5' }}>
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
          </div>
        )}

        {/* File list */}
        {uploadsLoading ? (
          <div className="flex items-center justify-center py-12 gap-2" style={{ color: '#6B7280' }}>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading your files…</span>
          </div>
        ) : uploads.length > 0 ? (
          <div>
            <h2 className="text-sm font-semibold mb-3" style={{ color: '#9CA3AF' }}>
              Uploaded Documents ({uploads.length})
            </h2>
            <div className="space-y-3">
              {uploads.map(upload => (
                <div key={upload.id} className="rounded-2xl p-4 transition-all" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-start gap-4">
                    <FileIcon type={upload.type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate">{upload.originalName}</div>
                          <div className="text-xs mt-0.5 flex flex-wrap gap-2" style={{ color: '#6B7280' }}>
                            <span>{CATEGORIES.find(c => c.value === upload.category)?.label || upload.category}</span>
                            <span>{formatSize(upload.size)}</span>
                            <span>{new Date(upload.uploadedAt).toLocaleString()}</span>
                          </div>
                          {upload.note && <div className="text-sm mt-1 italic" style={{ color: '#9CA3AF' }}>&ldquo;{upload.note}&rdquo;</div>}
                        </div>
                        <button
                          onClick={() => removeUpload(upload.id)}
                          className="shrink-0 transition-colors hover:text-red-400"
                          style={{ color: '#4B5563' }}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {upload.aiSummary && (
                        <div className="mt-3 rounded-xl p-3" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                          <div className="text-xs font-bold mb-1" style={{ color: '#A78BFA' }}>AI Context</div>
                          <div className="text-sm" style={{ color: '#DDD6FE' }}>{upload.aiSummary}</div>
                        </div>
                      )}

                      <div className="mt-3 flex gap-2">
                        <a
                          href={upload.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                          style={{ border: '1px solid rgba(255,255,255,0.12)', color: '#9CA3AF' }}
                        >
                          View File
                        </a>
                        <button
                          onClick={() => analyzeWithAI(upload)}
                          disabled={analyzingId === upload.id}
                          className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-60"
                          style={{ border: '1px solid rgba(139,92,246,0.3)', color: '#A78BFA' }}
                        >
                          {analyzingId === upload.id
                            ? <><Loader2 className="w-3 h-3 animate-spin" /> Analyzing...</>
                            : <><Brain className="w-3 h-3" /> AI Context</>}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16" style={{ color: '#4B5563' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <FileImage className="w-8 h-8" style={{ color: '#374151' }} />
            </div>
            <div className="font-medium" style={{ color: '#6B7280' }}>No documents uploaded yet</div>
            <div className="text-sm mt-1" style={{ color: '#4B5563' }}>Start by uploading a photo of a lab result, ECG, or doctor&apos;s note</div>
          </div>
        )}
      </div>
      <HIPAAFooter />
    </div>
  );
}
