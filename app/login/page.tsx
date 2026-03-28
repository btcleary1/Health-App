'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [passphrase, setPassphrase] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) { setError('You must confirm you are an authorized user.'); return; }
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase }),
    });
    const data = await res.json();
    if (res.ok) {
      router.push('/dashboard');
      router.refresh();
    } else {
      setError(data.error || 'Incorrect passphrase.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-2xl mb-3">
          <Activity className="w-7 h-7 text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Health Wiz</h1>
        <p className="text-sm text-gray-500 mt-1">Authorized access only — PHI protected</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>⚠ HIPAA Notice:</strong> This application contains Protected Health Information (PHI). Unauthorized access is prohibited.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Access Passphrase</label>
            <input
              type="password"
              value={passphrase}
              onChange={e => setPassphrase(e.target.value)}
              placeholder="Enter passphrase"
              required
              autoComplete="new-password"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 shrink-0"
              style={{ minHeight: 'unset' }}
            />
            <span className="text-xs text-gray-600 leading-relaxed">
              I am an authorized user of this application. I have read and agree to the{' '}
              <a href="/terms" target="_blank" className="text-blue-600 underline" style={{ minHeight: 'unset' }}>Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" target="_blank" className="text-blue-600 underline" style={{ minHeight: 'unset' }}>Privacy Policy</a>.
              I understand this app contains PHI and will not share access.
            </span>
          </label>

          {error && (
            <p className="text-xs text-red-600 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !agreed}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Verifying…' : 'Access Dashboard'}
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-gray-400 mt-6">
        <a href="/privacy" className="hover:underline">Privacy Policy</a>
        {' · '}
        <a href="/terms" className="hover:underline">Terms of Service</a>
      </p>
    </div>
  );
}
