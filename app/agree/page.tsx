'use client';

import SuiteMark from '@/components/SuiteMark';
import Link from 'next/link';
import { useState } from 'react';
import { TERMS_UPDATED, TERMS_VERSION } from '@/lib/legal';

// One-time screen for people who haven't agreed to the current Terms or given health data
// consent (Google sign-ups, people who joined earlier, or after the Terms change).
export default function AgreePage() {
  const [agree, setAgree] = useState(false);
  const [healthConsent, setHealthConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!agree || !healthConsent) { setError('Check both boxes to continue.'); return; }
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/terms/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agree: true, healthConsent: true, version: TERMS_VERSION }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((d as { error?: string }).error || "Couldn't save that. Try again.");
      const next = new URLSearchParams(window.location.search).get('next') || '/dashboard';
      window.location.replace(next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function logOut() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    window.location.replace('/login');
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-10"
      style={{ background: 'linear-gradient(160deg, #050814 0%, #0B1120 60%, #0f172a 100%)' }}
    >
      <div className="text-center mb-7">
        <span className="mb-5" style={{ display: 'inline-flex' }}><SuiteMark size={64} /></span>
        <h1 className="text-2xl font-bold text-white tracking-tight">Before you continue</h1>
        <p className="text-sm text-gray-400 mt-1.5">Terms updated {TERMS_UPDATED}</p>
      </div>

      <div className="w-full max-w-sm">
        <div className="glass-card p-6">
          <ul className="list-disc pl-5 space-y-2 text-[13px] text-gray-300 leading-relaxed mb-4">
            <li>Cleary Health is a tracking and research tool. It is not medical advice, and no doctor–patient relationship is created.</li>
            <li>AI summaries and chat answers come from an AI. They can be wrong. Check everything with a licensed healthcare provider.</li>
            <li>In an emergency, call 911.</li>
            <li>We collect the health information you enter or upload only to run the app for you. We never sell it or use it for ads. You can delete it any time in Settings.</li>
          </ul>
          <p className="text-[12px] text-gray-400 mb-5">
            <Link href="/terms" target="_blank" className="text-blue-400 hover:underline">Terms of Service</Link>
            {' · '}
            <Link href="/privacy#consumer-health-data" target="_blank" className="text-blue-400 hover:underline">Consumer Health Data Notice</Link>
            {' · '}
            <Link href="/privacy" target="_blank" className="text-blue-400 hover:underline">Privacy Policy</Link>
          </p>

          <form onSubmit={submit} className="space-y-4">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={agree}
                onChange={e => setAgree(e.target.checked)}
                className="mt-0.5 shrink-0 rounded"
                style={{ minHeight: 'unset', accentColor: '#3B82F6' }}
              />
              <span className="text-[12px] text-gray-300 leading-relaxed">
                I&apos;m 18 or older and I agree to the Terms of Service and Privacy Policy.
              </span>
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={healthConsent}
                onChange={e => setHealthConsent(e.target.checked)}
                className="mt-0.5 shrink-0 rounded"
                style={{ minHeight: 'unset', accentColor: '#3B82F6' }}
              />
              <span className="text-[12px] text-gray-300 leading-relaxed">
                I consent to Cleary Health collecting and storing the health information I enter or upload, as described in the Consumer Health Data Notice.
              </span>
            </label>

            {error && (
              <div role="alert" className="bg-red-500/15 border border-red-500/30 rounded-xl px-3 py-2">
                <p className="text-xs text-red-300 text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 font-semibold text-sm rounded-xl text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: '#3B82F6' }}
            >
              {busy ? 'Saving…' : 'Agree and continue'}
            </button>
          </form>
        </div>

        <button
          type="button"
          onClick={logOut}
          className="w-full text-center text-xs text-gray-500 hover:text-gray-300 mt-5"
          style={{ minHeight: 'unset' }}
        >
          Log out instead
        </button>
      </div>
    </div>
  );
}
