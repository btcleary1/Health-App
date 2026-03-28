'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Activity, Lock, Eye, EyeOff } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get('from') || '/dashboard';

  const [passphrase, setPassphrase] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) { setError('You must agree to the Terms of Service and Privacy Policy.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Incorrect passphrase.'); return; }
      router.push(from);
      router.refresh();
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl mb-4">
            <Activity className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Ethan's Health</h1>
          <p className="text-sm text-gray-500 mt-1">Protected Health Information — Authorized Access Only</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Lock className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">Enter Access Passphrase</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={passphrase}
                onChange={e => setPassphrase(e.target.value)}
                placeholder="Enter passphrase"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 pr-12"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                style={{ minHeight: 'unset' }}
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* T&C Consent */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5 shrink-0"
                style={{ minHeight: 'unset' }}
              />
              <span className="text-xs text-gray-600 leading-relaxed">
                I am an authorized user of this application. I agree to the{' '}
                <a href="/terms" target="_blank" className="text-blue-600 underline" style={{ minHeight: 'unset' }}>Terms of Service</a>{' '}
                and{' '}
                <a href="/privacy" target="_blank" className="text-blue-600 underline" style={{ minHeight: 'unset' }}>Privacy Policy</a>.
                I understand this application contains Protected Health Information (PHI) and I will not share access credentials with unauthorized individuals.
              </span>
            </label>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !passphrase}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Access Health Dashboard'}
            </button>
          </form>
        </div>

        {/* HIPAA Notice */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>HIPAA Notice:</strong> This application contains Protected Health Information (PHI) for Ethan Alvarez. Unauthorized access is prohibited under the Health Insurance Portability and Accountability Act (HIPAA) and may be subject to civil and criminal penalties. All access may be logged.
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          <a href="/privacy" className="hover:underline" style={{ minHeight: 'unset' }}>Privacy Policy</a>
          {' · '}
          <a href="/terms" className="hover:underline" style={{ minHeight: 'unset' }}>Terms of Service</a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
