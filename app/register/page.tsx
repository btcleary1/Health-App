'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Eye, EyeOff, CheckCircle, XCircle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { PASSWORD_REQUIREMENTS } from '@/lib/password-rules';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordChecks = PASSWORD_REQUIREMENTS.map(r => ({
    label: r.label,
    passed: password.length > 0 && r.test(password),
    attempted: password.length > 0,
  }));

  const allChecksPassed = PASSWORD_REQUIREMENTS.every(r => r.test(password));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!agreed) { setError('You must accept the Terms of Service and Privacy Policy.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    const failedChecks = PASSWORD_REQUIREMENTS.filter(r => !r.test(password));
    if (failedChecks.length > 0) {
      setError('Password does not meet all requirements.');
      return;
    }

    setLoading(true);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password }),
    });
    const data = await res.json();
    if (res.ok) {
      window.location.href = '/dashboard';
    } else {
      setError(data.error || 'Registration failed. Please try again.');
    }
    setLoading(false);
  };

  const canSubmit = agreed && password === confirmPassword && allChecksPassed && !loading;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-10"
      style={{ background: 'linear-gradient(160deg, #050814 0%, #0B1120 60%, #0f172a 100%)' }}
    >
      {/* Brand hero */}
      <div className="text-center mb-7 animate-fade-in">
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
        <p className="text-sm text-gray-400 mt-1.5">Create your secure account</p>
      </div>

      <div className="w-full max-w-sm animate-slide-up">
        <div className="glass-card p-6">

          {/* Health data notice */}
          <div
            className="flex items-start gap-2.5 rounded-xl px-3 py-2.5 mb-5"
            style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.2)' }}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-300 leading-relaxed">
              Your data is encrypted and stored securely. Not a medical device — AI analysis is not medical advice.
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your full name"
                required
                autoComplete="name"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-gray-900 bg-white/95 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 border-0"
              />
            </div>

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
                  placeholder="Create a strong password"
                  required
                  autoComplete="new-password"
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

              {password.length > 0 && (
                <ul className="mt-2.5 space-y-1.5 px-1">
                  {passwordChecks.map((check, i) => (
                    <li key={i} className={`flex items-center gap-1.5 text-[11px] ${check.passed ? 'text-green-400' : 'text-gray-500'}`}>
                      {check.passed
                        ? <CheckCircle className="w-3 h-3 shrink-0 text-green-400" />
                        : <XCircle className="w-3 h-3 shrink-0 text-gray-600" />}
                      {check.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                autoComplete="new-password"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-gray-900 bg-white/95 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 border-0"
                style={confirmPassword && confirmPassword !== password ? { outline: '2px solid #EF4444' } : {}}
              />
              {confirmPassword && confirmPassword !== password && (
                <p className="text-[11px] text-red-400 mt-1">Passwords do not match</p>
              )}
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
                I accept responsibility for health data I upload and understand this is{' '}
                <strong className="text-gray-300">not a medical device</strong>. I agree to the{' '}
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
              disabled={!canSubmit}
              className="w-full py-3.5 font-semibold text-sm rounded-xl text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: canSubmit ? 'linear-gradient(135deg, #3B82F6, #6366F1)' : 'rgba(59,130,246,0.5)',
                boxShadow: canSubmit ? '0 4px 16px rgba(99,102,241,0.4)' : 'none',
              }}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-500 mt-5">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
