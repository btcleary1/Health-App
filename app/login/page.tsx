'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Fingerprint, Loader2 } from 'lucide-react';
import { startAuthentication, startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';

type Stage = 'login' | 'register-passkey';

export default function LoginPage() {
  const router = useRouter();
  const [passphrase, setPassphrase] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [faceIdLoading, setFaceIdLoading] = useState(false);
  const [faceIdError, setFaceIdError] = useState('');
  const [stage, setStage] = useState<Stage>('login');
  const [supportsWebAuthn, setSupportsWebAuthn] = useState(false);

  useEffect(() => {
    setSupportsWebAuthn(browserSupportsWebAuthn());
  }, []);

  const handlePassphraseLogin = async (e: React.FormEvent) => {
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
      setStage('register-passkey');
      setLoading(false);
      return;
    } else {
      setError(data.error || 'Incorrect passphrase.');
    }
    setLoading(false);
  };

  const handleFaceIdLogin = async () => {
    setFaceIdLoading(true);
    setFaceIdError('');
    try {
      const optRes = await fetch('/api/auth/webauthn/auth-options', { method: 'POST' });
      const options = await optRes.json();
      if (!optRes.ok) { setFaceIdError(`Options: ${options.error}`); setFaceIdLoading(false); return; }
      const assertion = await startAuthentication({ optionsJSON: options });
      const verRes = await fetch('/api/auth/webauthn/auth-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assertion),
      });
      const result = await verRes.json();
      if (verRes.ok) {
        window.location.href = '/dashboard';
      } else {
        setFaceIdError(JSON.stringify(result));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      setFaceIdError(msg);
    }
    setFaceIdLoading(false);
  };

  const handleRegisterPasskey = async () => {
    setLoading(true);
    setError('');
    try {
      const optRes = await fetch('/api/auth/webauthn/register-options', { method: 'POST' });
      const options = await optRes.json();
      if (!optRes.ok) {
        setError(`Server: ${options.error || optRes.status}`);
        setLoading(false);
        return;
      }
      const attestation = await startRegistration({ optionsJSON: options });
      const verRes = await fetch('/api/auth/webauthn/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attestation),
      });
      const verData = await verRes.json();
      if (verRes.ok) {
        window.location.href = '/dashboard';
      } else {
        setError(`Verify: ${verData.error || verRes.status}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      setError(msg);
    }
    setLoading(false);
  };

  if (stage === 'register-passkey') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-6 shadow-sm text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 rounded-2xl mb-4">
            <Fingerprint className="w-7 h-7 text-blue-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Enable Face ID?</h2>
          <p className="text-sm text-gray-500 mb-6">
            Skip the passphrase next time. Use Face ID or fingerprint to sign in instantly — only works on this device.
          </p>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-left">
              <p className="text-xs text-red-700 font-mono break-all">{error}</p>
            </div>
          )}
          <button
            onClick={handleRegisterPasskey}
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm disabled:opacity-40 transition-colors mb-3 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
            Set Up Face ID
          </button>
          <button
            onClick={() => { window.location.href = '/dashboard'; }}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-2xl mb-3">
          <Activity className="w-7 h-7 text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Health Wiz</h1>
        <p className="text-sm text-gray-500 mt-1">Authorized access only — Health data protected</p>
      </div>

      <div className="w-full max-w-sm mb-3">
          <button
            onClick={handleFaceIdLogin}
            disabled={faceIdLoading}
            className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {faceIdLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Fingerprint className="w-4 h-4" />}
            Sign in with Face ID / Fingerprint
          </button>
          {faceIdError && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-xs text-red-700 font-mono break-all">{faceIdError}</p>
            </div>
          )}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">or use passphrase</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        </div>

      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>⚠ Health Data Notice:</strong> This application contains sensitive personal health information. Unauthorized access is prohibited.
          </p>
        </div>

        <form onSubmit={handlePassphraseLogin} className="space-y-4">
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
              I understand this app contains sensitive health information and will not share access.
            </span>
          </label>

          {error && <p className="text-xs text-red-600 text-center">{error}</p>}

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
