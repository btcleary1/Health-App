'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { PASSWORD_REQUIREMENTS } from '@/lib/password-rules';

type Stage = 'request' | 'verify' | 'done';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // Always advance — don't reveal if email exists
      setStage('verify');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setStage('done');
      } else {
        setError(data.error || 'Reset failed. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordMet = PASSWORD_REQUIREMENTS.map(r => r.test(newPassword));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-2xl mb-3">
          <Activity className="w-7 h-7 text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Health Wiz</h1>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">

        {stage === 'request' && (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Forgot Password</h2>
            <p className="text-sm text-gray-500 mb-5">Enter your email and we'll send you a reset code.</p>
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? 'Sending…' : 'Send Reset Code'}
              </button>
            </form>
          </>
        )}

        {stage === 'verify' && (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Check Your Email</h2>
            <p className="text-sm text-gray-500 mb-5">
              If <strong>{email}</strong> has an account, a 6-digit code was sent. Enter it below along with your new password.
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">6-Digit Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  required
                  maxLength={6}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="New password"
                    required
                    className="w-full pr-9 px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <ul className="mt-2 space-y-1">
                  {PASSWORD_REQUIREMENTS.map((r, i) => (
                    <li key={i} className={`flex items-center gap-1.5 text-xs ${passwordMet[i] ? 'text-green-600' : 'text-gray-400'}`}>
                      <CheckCircle className={`w-3 h-3 ${passwordMet[i] ? 'text-green-500' : 'text-gray-300'}`} />
                      {r.label}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading || !passwordMet.every(Boolean) || newPassword !== confirmPassword}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>
              <button type="button" onClick={() => setStage('request')} className="w-full text-xs text-gray-400 hover:text-gray-600">
                Didn't get the code? Send again
              </button>
            </form>
          </>
        )}

        {stage === 'done' && (
          <div className="text-center py-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">Password Reset</h2>
            <p className="text-sm text-gray-500 mb-5">Your password has been updated. You can now sign in.</p>
            <button
              onClick={() => router.push('/login')}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              Go to Login
            </button>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">
        <Link href="/login" className="hover:underline">Back to login</Link>
      </p>
    </div>
  );
}
