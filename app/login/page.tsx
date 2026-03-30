'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Fingerprint, Loader2, Eye, EyeOff } from 'lucide-react';
import { startAuthentication, startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import Link from 'next/link';

type Stage = 'login' | 'register-passkey';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricError, setBiometricError] = useState('');
  const [stage, setStage] = useState<Stage>('login');
  const [supportsWebAuthn, setSupportsWebAuthn] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Sign in with Biometrics');

  useEffect(() => {
    setSupportsWebAuthn(browserSupportsWebAuthn());
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) {
      setBiometricLabel('Sign in with Face ID');
    } else if (/Mac/.test(ua) && /Safari/.test(ua)) {
      setBiometricLabel('Sign in with Touch ID');
    } else if (/Win/.test(ua) || /CrOS/.test(ua)) {
      setBiometricLabel('Sign in with Windows Hello / Fingerprint');
    } else {
      setBiometricLabel('Sign in with Biometrics');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) { setError('You must confirm you are an authorized user.'); return; }
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok) {
      setStage('register-passkey');
    } else {
      setError(data.error || 'Incorrect email or password.');
    }
    setLoading(false);
  };

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    setBiometricError('');
    try {
      const optRes = await fetch('/api/auth/webauthn/auth-options', { method: 'POST' });
      const options = await optRes.json();
      if (!optRes.ok) { setBiometricError(options.error); setBiometricLoading(false); return; }
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
        setBiometricError(result.error || 'Biometric sign-in failed.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('NotAllowedError') || msg.includes('cancelled')) {
        setBiometricError('Biometric sign-in was cancelled.');
      } else {
        setBiometricError(msg);
      }
    }
    setBiometricLoading(false);
  };

  const handleRegisterPasskey = async () => {
    setLoading(true);
    setError('');
    try {
      const optRes = await fetch('/api/auth/webauthn/register-options', { method: 'POST' });
      const options = await optRes.json();
      if (!optRes.ok) { setError(options.error || 'Could not start setup.'); setLoading(false); return; }
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
        setError(verData.error || 'Setup failed.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
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
          <h2 className="text-lg font-bold text-gray-900 mb-2">Enable Face ID / Touch ID?</h2>
          <p className="text-sm text-gray-500 mb-6">
            Skip the password next time. Use Face ID or fingerprint to sign in instantly — only works on this device.
          </p>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <p className="text-xs text-red-700 font-mono break-all">{error}</p>
            </div>
          )}
          <button
            onClick={handleRegisterPasskey}
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm disabled:opacity-40 transition-colors mb-3 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
            Set Up Face ID / Touch ID
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

      {supportsWebAuthn && (
        <div className="w-full max-w-sm mb-3">
          <button
            onClick={handleBiometricLogin}
            disabled={biometricLoading}
            className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {biometricLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
            {biometricLoading ? 'Verifying…' : biometricLabel}
          </button>
          {biometricError && (
            <p className="mt-2 text-xs text-red-600 text-center">{biometricError}</p>
          )}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">or sign in with email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        </div>
      )}

      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>⚠ Health Data Notice:</strong> This application contains sensitive personal health information. Unauthorized access is prohibited.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                className="w-full pr-9 px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 shrink-0"
            />
            <span className="text-xs text-gray-600 leading-relaxed">
              I am an authorized user of this application. I have read and agree to the{' '}
              <a href="/terms" target="_blank" className="text-blue-600 underline">Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" target="_blank" className="text-blue-600 underline">Privacy Policy</a>.
              I understand this app contains sensitive health information and will not share access.
            </span>
          </label>

          {error && <p className="text-xs text-red-600 text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || !agreed}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-gray-500 mt-4">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-blue-600 hover:underline font-medium">Create one</Link>
      </p>
      <p className="text-center text-xs text-gray-400 mt-2">
        Forgot your password? Contact the app administrator to reset it.
      </p>
      <p className="text-center text-xs text-gray-400 mt-3">
        <a href="/privacy" className="hover:underline">Privacy Policy</a>
        {' · '}
        <a href="/terms" className="hover:underline">Terms of Service</a>
      </p>
    </div>
  );
}
