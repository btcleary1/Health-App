'use client';

import { useState } from 'react';
import { Shield, X } from 'lucide-react';

interface Props {
  onAccept: () => void;
  onCancel: () => void;
}

export default function UploadConsent({ onAccept, onCancel }: Props) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600 shrink-0" />
            <h2 className="font-bold text-gray-900">Before You Upload</h2>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600" style={{ minHeight: 'unset' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm text-gray-700 space-y-2">
          <p>By uploading a file, you confirm:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>You are an authorized user of this application</li>
            <li>You have the right to upload and share this document</li>
            <li>The file contains health information relevant to the registered patient</li>
            <li>Files are stored securely on Vercel's cloud infrastructure</li>
            <li>You will not upload content about other individuals without their consent</li>
          </ul>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-xs text-amber-800">
            <strong>AI Analysis:</strong> If you use "AI Context" on this file, its metadata and your notes will be sent to Anthropic's Claude AI for analysis. No file contents are transmitted — only the category and note you provide.
          </p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer mb-5">
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            className="mt-0.5 shrink-0"
            style={{ minHeight: 'unset' }}
          />
          <span className="text-xs text-gray-600 leading-relaxed">
            I have read and agree to the{' '}
            <a href="/terms" target="_blank" className="text-blue-600 underline" style={{ minHeight: 'unset' }}>Terms of Service</a>{' '}
            and{' '}
            <a href="/privacy" target="_blank" className="text-blue-600 underline" style={{ minHeight: 'unset' }}>Privacy Policy</a>
          </span>
        </label>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onAccept}
            disabled={!checked}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            I Agree — Continue
          </button>
        </div>
      </div>
    </div>
  );
}
