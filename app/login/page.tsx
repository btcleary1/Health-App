'use client';

import SuiteMark from '@/components/SuiteMark';
import { useState, useEffect, useRef } from 'react';
import HumanCheck, { humanCheckOn, type HumanCheckHandle } from '@/components/HumanCheck';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck } from 'lucide-react';
import '../cleary-auth.css';
import { unlockName } from '@/lib/biometric';
import { startAuthentication, startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import Link from 'next/link';

type Stage = 'login' | 'register-passkey';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [humanToken, setHuman] = useState('');
  const human = useRef<HumanCheckHandle>(null);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricError, setBiometricError] = useState('');
  const [stage, setStage] = useState<Stage>('login');
  const [supportsWebAuthn, setSupportsWebAuthn] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Sign in with Biometrics');
  const [bio, setBio] = useState('fingerprint, face, or screen lock');
  useEffect(() => setBio(unlockName()), []);

  const GOOGLE_ERRORS: Record<string, string> = {
    google_cancelled: 'Google sign-in was cancelled.',
    google_state_mismatch: 'Security check failed — please try again.',
    google_failed: 'Google sign-in failed. Try again or use email/password.',
    google_not_configured: 'Google sign-in is not available right now.',
  };

  useEffect(() => {
    setSupportsWebAuthn(browserSupportsWebAuthn());
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) {
      setBiometricLabel('Sign in with Face ID');
    } else if (/Mac/.test(ua) && !/CrOS/.test(ua)) {
      setBiometricLabel('Sign in with Touch ID');
    } else if (/CrOS/.test(ua)) {
      setBiometricLabel('Sign in with Screen Lock');
    } else if (/Win/.test(ua)) {
      setBiometricLabel('Sign in with Windows Hello');
    } else {
      setBiometricLabel('Sign in with Biometrics');
    }
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    if (errorParam) {
      setError(GOOGLE_ERRORS[errorParam] ?? 'Sign-in failed. Please try again.');
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
    const trap = ((e.currentTarget as HTMLFormElement).elements.namedItem('website') as HTMLInputElement | null)?.value || '';
    if (!agreed) { setError('You must confirm you are an authorized user.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, agreed, turnstile: humanToken, website: trap }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        let passkeyRegistered = false;
        try {
          const statusRes = await fetch('/api/auth/webauthn/status');
          const statusData = await statusRes.json();
          passkeyRegistered = !!statusData.registered;
        } catch { /* ignore — proceed to login */ }
        if (passkeyRegistered) {
          await goAfterLogin();
        } else {
          setStage('register-passkey');
        }
      } else {
        setError((data as any).error || 'Incorrect email or password.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
      human.current?.reset();
    }
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
        setBiometricError("No passkey for this app on this phone yet, or it was cancelled. Log in with Google or email once, and we'll offer to set up Face ID.");
      } else if (msg.includes('InvalidStateError') || msg.includes('not recognized')) {
        setBiometricError('Passkey not recognized. Sign in with email, then re-enable Face ID in Settings.');
      } else if (msg.includes('did not match') || msg.includes('expected pattern')) {
        setBiometricError('Stored passkey is invalid. Sign in with email, then go to Settings → remove and re-enable Face ID.');
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
      <div className="cl-auth">
        <div className="cl-card">
          <div className="cl-icon-tile"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden><path d="M15 7a4 4 0 1 1-3.9 5H3v3h3v3h3v-3h2.1A4 4 0 0 1 15 7zm1 3h.01" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
          <h1>Create a passkey?</h1>
          <p className="cl-muted">Next time, log in with your {bio} on this device. No password to remember.</p>
          {error && <p role="alert" className="cl-error">{error}</p>}
          <button className="cl-btn primary" onClick={handleRegisterPasskey} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 cl-spin" /> : <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden><path d="M15 7a4 4 0 1 1-3.9 5H3v3h3v3h3v-3h2.1A4 4 0 0 1 15 7zm1 3h.01" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            {loading ? 'Waiting for your device…' : 'Create a passkey'}
          </button>
          <button className="cl-btn ghost" onClick={goAfterLogin}>
            Not now
          </button>
        </div>
      </div>
    );
  }

  /* ── Main login screen ── */
  return (
    <div className="cl-auth">
      <div className="cl-card">
        <span className="cl-logo" aria-hidden><SuiteMark size={52} /></span>
        <h1>Cleary Health</h1>
        <p className="cl-muted">Log in to your health records</p>

        <p className="cl-notice">
          <ShieldCheck className="w-4 h-4" style={{ display: 'inline', verticalAlign: '-3px', marginRight: 6 }} />
          Sensitive health data. Authorized access only.
        </p>

        {error && <p role="alert" className="cl-error">{error}</p>}

        {supportsWebAuthn && (
          <div className="cl-passkey">
            <button className="cl-btn primary" onClick={handleBiometricLogin} disabled={biometricLoading}>
              {biometricLoading ? <Loader2 className="w-4 h-4 cl-spin" /> : <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden><path d="M15 7a4 4 0 1 1-3.9 5H3v3h3v3h3v-3h2.1A4 4 0 0 1 15 7zm1 3h.01" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              {biometricLoading ? 'Waiting for your device…' : 'Log in with a passkey'}
            </button>
            <span className="cl-muted cl-small">Use your {bio}</span>
            {biometricError && <p role="alert" className="cl-error">{biometricError}</p>}
          </div>
        )}

        <a className="cl-btn google" href="/api/auth/google">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </a>

        <div className="cl-divider"><span>or log in with email</span></div>

        <form onSubmit={handleLogin} className="cl-form">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            required
            autoComplete="username"
            autoCapitalize="none"
            inputMode="email"
            aria-label="Email"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            autoComplete="current-password"
            aria-label="Password"
          />
          <label className="cl-check">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
            <span>
              I am an authorized user. I agree to the <a href="/terms" target="_blank">Terms</a> and{' '}
              <a href="/privacy" target="_blank">Privacy Policy</a>.
            </span>
          </label>
          <HumanCheck ref={human} onToken={setHuman} action="login" />
          <button type="submit" className="cl-btn" disabled={!email || !password || loading || (humanCheckOn && !humanToken)}>
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <div className="cl-links">
          <Link href="/forgot-password" className="cl-link">Forgot password?</Link>
          <Link href="/register" className="cl-link">Create account</Link>
        </div>
      </div>
    </div>
  );
}
