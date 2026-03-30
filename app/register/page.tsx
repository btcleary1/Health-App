'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-2xl mb-3">
          <Activity className="w-7 h-7 text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Create Your Account</h1>
        <p className="text-sm text-gray-500 mt-1">Health Wiz — Secure family health tracking</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your full name"
              required
              autoComplete="name"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

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
                placeholder="Create a strong password"
                required
                autoComplete="new-password"
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

            {/* Password requirements checklist */}
            {password.length > 0 && (
              <ul className="mt-2 space-y-1">
                {passwordChecks.map((check, i) => (
                  <li key={i} className={`flex items-center gap-1.5 text-xs ${check.passed ? 'text-green-600' : 'text-red-500'}`}>
                    {check.passed
                      ? <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                      : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                    {check.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
              autoComplete="new-password"
              className={`w-full px-3 py-2.5 rounded-xl border text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 ${
                confirmPassword && confirmPassword !== password ? 'border-red-400' : 'border-gray-200'
              }`}
            />
            {confirmPassword && confirmPassword !== password && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
            )}
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 shrink-0"
            />
            <span className="text-xs text-gray-600 leading-relaxed">
              I accept full responsibility for health data I upload. I understand this app is{' '}
              <strong>not a medical device</strong> and AI analysis is not medical advice. I agree to the{' '}
              <a href="/terms" target="_blank" className="text-blue-600 underline">Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" target="_blank" className="text-blue-600 underline">Privacy Policy</a>.
            </span>
          </label>

          {error && <p className="text-xs text-red-600 text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || !agreed || password !== confirmPassword}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-gray-500 mt-4">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
      </p>
    </div>
  );
}
