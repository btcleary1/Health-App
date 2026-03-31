'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import HealthHeader from '@/components/HealthHeader';
import HIPAAFooter from '@/components/HIPAAFooter';
import UploadConsent from '@/components/UploadConsent';
import { Upload, FileImage, FileText, File, X, Check, AlertCircle, Brain, Loader2, ShieldAlert } from 'lucide-react';
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
  if (type.startsWith('image/')) return <FileImage className="w-8 h-8 text-blue-500" />;
  if (type === 'application/pdf') return <FileText className="w-8 h-8 text-red-500" />;
  return <File className="w-8 h-8 text-gray-500" />;
}

export default function UploadsPage() {
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [patientInfo, setPatientInfo] = useState<{ name: string; age: number; primaryConcern: string } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    fetch('/api/health-data/patient').then(r => r.json()).then(d => {
      if (d.patient?.name) setPatientInfo(d.patient);
    }).catch(() => {});
  }, []);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [note, setNote] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [noteError, setNoteError] = useState('');
  const [redactedCount, setRedactedCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    // Client-side note PII check before submitting
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

      const res = await fetch('/api/uploads', { method: 'POST', body: formData });
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
      const res = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientData: patientInfo ?? { name: 'Patient', age: 0, primaryConcern: 'See uploaded document' },
          events: [],
          focusArea: `A document was uploaded: category="${upload.category}", filename="${upload.originalName}", note="${upload.note}". Based on the category and context of this pediatric cardiac patient, what key questions should the family ask about this type of document? What should they look for? What would be red flags? Keep the response to 2-3 sentences.`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const summary = data.analysis?.doctorBriefing?.oneLineSummary || 'Analysis complete.';
      setUploads(prev => prev.map(u => u.id === upload.id ? { ...u, aiSummary: summary } : u));
    } catch (e: any) {
      setError('AI analysis failed: ' + e.message);
    } finally {
      setAnalyzingId(null);
    }
  };

  const removeUpload = (id: string) => setUploads(prev => prev.filter(u => u.id !== id));

  return (
    <div className="min-h-screen bg-gray-50">
      {showConsent && (
        <UploadConsent
          onAccept={handleConsentAccept}
          onCancel={() => { setShowConsent(false); setPendingFile(null); }}
        />
      )}
      <HealthHeader />
      <div className="max-w-3xl mx-auto px-4 py-8">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Doctor Visit Uploads</h1>
          <p className="text-gray-600 text-sm">Upload screenshots, photos, lab results, ECGs, and doctor letters. AI can help contextualize what they mean for {patientInfo?.name ?? 'your patient'}&apos;s case.</p>
        </div>

        {/* PII notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 flex gap-3 items-start">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Privacy reminder before uploading</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Only use <strong>first names</strong> — no last names, phone numbers, home addresses, or Social Security numbers.
              For PDFs and images, black out or blur sensitive information before uploading.
              Text files (.txt) are automatically scanned and PII is redacted on upload.
            </p>
          </div>
        </div>

        {redactedCount !== null && redactedCount > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 flex gap-2 items-center text-green-800 text-sm">
            <Check className="w-4 h-4 text-green-600 shrink-0" />
            {redactedCount} piece{redactedCount !== 1 ? 's' : ''} of personal information were automatically redacted from the uploaded text file.
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,.pdf,.txt"
          />

          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragging ? 'border-blue-500 bg-blue-50' :
              pendingFile ? 'border-green-400 bg-green-50' :
              'border-gray-300'
            }`}
          >
            {pendingFile ? (
              <div className="flex flex-col items-center gap-2">
                <Check className="w-10 h-10 text-green-500" />
                <div className="font-semibold text-green-800">{pendingFile.name}</div>
                <div className="text-sm text-green-600">{formatSize(pendingFile.size)}</div>
                <button
                  onClick={() => setPendingFile(null)}
                  className="text-xs text-gray-500 hover:text-red-500 mt-1 flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-gray-500">
                <Upload className="w-10 h-10 text-gray-400" />
                <div>
                  <div className="font-semibold text-gray-700">Drag and drop a file here</div>
                  <div className="text-sm mt-1 text-gray-500">Photos, screenshots, PDFs, lab results, ECGs — up to 10MB</div>
                </div>
                <button
                  onClick={handleBrowseClick}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  Browse Files
                </button>
              </div>
            )}
          </div>

          {pendingFile && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white"
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={note}
                  onChange={e => { setNote(e.target.value); setNoteError(''); }}
                  onBlur={e => { const w = detectPiiInText(e.target.value); if (w.length > 0) setNoteError(w[0]); }}
                  placeholder="e.g. Dr. Sarah visit Nov 20, QTc result was 520ms"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white ${noteError ? 'border-red-400' : 'border-gray-300'}`}
                />
                {noteError
                  ? <p className="text-xs text-red-600 mt-1">⚠ {noteError}</p>
                  : <p className="text-xs text-gray-400 mt-1">First names only — no last names, phone numbers, or addresses</p>}
              </div>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-60"
              >
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload File</>}
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
          </div>
        )}

        {uploads.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Uploaded Documents ({uploads.length})</h2>
            <div className="space-y-3">
              {uploads.map(upload => (
                <div key={upload.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start gap-4">
                    <FileIcon type={upload.type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-gray-900 truncate">{upload.originalName}</div>
                          <div className="text-xs text-gray-500 mt-0.5 flex gap-3">
                            <span>{CATEGORIES.find(c => c.value === upload.category)?.label || upload.category}</span>
                            <span>{formatSize(upload.size)}</span>
                            <span>{new Date(upload.uploadedAt).toLocaleString()}</span>
                          </div>
                          {upload.note && <div className="text-sm text-gray-600 mt-1 italic">"{upload.note}"</div>}
                        </div>
                        <button onClick={() => removeUpload(upload.id)} className="text-gray-400 hover:text-red-500 shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {upload.aiSummary && (
                        <div className="mt-3 bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="text-xs font-bold text-purple-700 mb-1">AI Context</div>
                          <div className="text-sm text-purple-900">{upload.aiSummary}</div>
                        </div>
                      )}

                      <div className="mt-3 flex gap-2">
                        <a href={upload.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg">
                          View File
                        </a>
                        <button
                          onClick={() => analyzeWithAI(upload)}
                          disabled={analyzingId === upload.id}
                          className="text-xs px-3 py-1.5 border border-purple-300 text-purple-700 hover:bg-purple-50 rounded-lg flex items-center gap-1 disabled:opacity-60"
                        >
                          {analyzingId === upload.id ? <><Loader2 className="w-3 h-3 animate-spin" /> Analyzing...</> : <><Brain className="w-3 h-3" /> AI Context</>}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {uploads.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <FileImage className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <div className="font-medium">No documents uploaded yet</div>
            <div className="text-sm mt-1">Start by uploading a photo of a lab result, ECG, or doctor's note</div>
          </div>
        )}
      </div>
      <HIPAAFooter />
    </div>
  );
}
