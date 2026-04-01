'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Fingerprint, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
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
      setBiometricLabel('Sign in with Windows Hello');
    } else {
      setBiometricLabel('Sign in with Biometrics');
    }
  }, []);

  const goAfterLogin = async () => {
    try {
      const r = await fetch('/api/health-data/patient');
      const d = await r.json();
      if (d.patient?.name && d.patient?.ageGroup) {
        router.push('/dashboard');
      } else {
        router.push('/setup');
      }
    } catch {
      router.push('/setup');
    }
  };

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
      const statusRes = await fetch('/api/auth/webauthn/status');
      const statusData = await statusRes.json();
      if (statusData.registered) {
        await goAfterLogin();
      } else {
        setStage('register-passkey');
      }
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
      const assertion = await startAuthentication({ optionsJSON: options, useBrowserAutofill: false });
      const verRes = await fetch('/api/auth/webauthn/auth-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assertion),
      });
      const result = await verRes.json();
      if (verRes.ok) {
        await goAfterLogin();
      } else {
        setBiometricError(result.error || 'Biometric sign-in failed.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('NotAllowedError') || msg.includes('cancelled') || msg.includes('not allowed') || msg.includes('current context')) {
        setBiometricError('No passkey found. Sign in with email, then re-enable Face ID in Settings.');
      } else if (msg.includes('InvalidStateError') || msg.includes('not recognized')) {
        setBiometricError('Passkey not recognized. Sign in with email, then re-enable Face ID in Settings.');
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
        await goAfterLogin();
      } else {
        setError(verData.error || 'Setup failed.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
    setLoading(false);
  };

  /* ── Passkey setup screen ── */
  if (stage === 'register-passkey') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-5"
        style={{ background: 'linear-gradient(160deg, #050814 0%, #0B1120 60%, #0f172a 100%)' }}
      >
        <div className="glass-card w-full max-w-sm p-8 text-center animate-slide-up">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', boxShadow: '0 4px 20px rgba(99,102,241,0.45)' }}
          >
            <Fingerprint className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Enable Face ID?</h2>
          <p className="text-sm text-gray-400 mb-7 leading-relaxed">
            Skip the password next time. Sign in instantly with Face ID or Touch ID — stored only on this device.
          </p>
          {error && (
            <div className="bg-red-500/15 border border-red-500/30 rounded-xl p-3 mb-5 text-left">
              <p className="text-xs text-red-300 font-mono break-all">{error}</p>
            </div>
          )}
          <button
            onClick={handleRegisterPasskey}
            disabled={loading}
            className="w-full py-3.5 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 mb-3 transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
            Set Up Face ID / Touch ID
          </button>
          <button
            onClick={goAfterLogin}
            className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  /* ── Main login screen ── */
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-10"
      style={{ background: 'linear-gradient(160deg, #050814 0%, #0B1120 60%, #0f172a 100%)' }}
    >
      {/* Brand hero */}
      <div className="text-center mb-8 animate-fade-in">
        <div
          className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-5"
          style={{
            background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
            boxShadow: '0 0 0 8px rgba(99,102,241,0.12), 0 8px 32px rgba(99,102,241,0.4)',
          }}
        >
          <Activity className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Health Wiz</h1>
        <p className="text-sm text-gray-400 mt-1.5">Secure health tracking</p>
      </div>

      <div className="w-full max-w-sm animate-slide-up">

        {/* Face ID / biometric button — primary CTA when available */}
        {supportsWebAuthn && (
          <div className="mb-5">
            <button
              onClick={handleBiometricLogin}
              disabled={biometricLoading}
              className="w-full py-3.5 font-semibold text-sm flex items-center justify-center gap-2.5 rounded-2xl transition-all disabled:opacity-50"
              style={{
                background: 'rgba(255,255,255,0.09)',
                border: '1px solid rgba(255,255,255,0.13)',
                color: 'white',
                backdropFilter: 'blur(10px)',
              }}
            >
              {biometricLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Fingerprint className="w-4 h-4 text-blue-400" />
              }
              {biometricLoading ? 'Verifying…' : biometricLabel}
            </button>
            {biometricError && (
              <p className="mt-2 text-xs text-red-400 text-center leading-relaxed">{biometricError}</p>
            )}

            <div className="flex items-center gap-3 mt-5 mb-1">
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <span className="text-[11px] text-gray-500 tracking-wide uppercase">or sign in with email</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            </div>
          </div>
        )}

        {/* Login form card */}
        <div className="glass-card p-6">

          {/* Health data notice — compact */}
          <div
            className="flex items-start gap-2.5 rounded-xl px-3 py-2.5 mb-5"
            style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.2)' }}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-300 leading-relaxed">
              Sensitive health data — authorized access only.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-gray-900 bg-white/95 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 border-0"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full pr-10 px-3.5 py-2.5 rounded-xl text-sm text-gray-900 bg-white/95 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 border-0"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  style={{ minHeight: 'unset' }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="mt-1.5 text-right">
                <Link href="/forgot-password" className="text-[11px] text-blue-400 hover:text-blue-300">
                  Forgot password?
                </Link>
              </div>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5 shrink-0 rounded"
                style={{ minHeight: 'unset', accentColor: '#3B82F6' }}
              />
              <span className="text-[11px] text-gray-400 leading-relaxed">
                I am an authorized user. I agree to the{' '}
                <a href="/terms" target="_blank" className="text-blue-400 hover:underline">Terms</a>
                {' '}and{' '}
                <a href="/privacy" target="_blank" className="text-blue-400 hover:underline">Privacy Policy</a>.
              </span>
            </label>

            {error && (
              <div className="bg-red-500/15 border border-red-500/30 rounded-xl px-3 py-2">
                <p className="text-xs text-red-300 text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !agreed}
              className="w-full py-3.5 font-semibold text-sm rounded-xl text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: loading || !agreed ? 'rgba(59,130,246,0.5)' : 'linear-gradient(135deg, #3B82F6, #6366F1)',
                boxShadow: agreed && !loading ? '0 4px 16px rgba(99,102,241,0.4)' : 'none',
              }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-500 mt-5">
          No account?{' '}
          <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium">Create one</Link>
        </p>
      </div>
    </div>
  );
}
