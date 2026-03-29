'use client';

import { useState, useEffect } from 'react';
import { Fingerprint, ShieldCheck, ShieldOff, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import HealthHeader from '@/components/HealthHeader';

export default function SettingsPage() {
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [supportsWebAuthn, setSupportsWebAuthn] = useState(false);

  useEffect(() => {
    setSupportsWebAuthn(browserSupportsWebAuthn());
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    const res = await fetch('/api/auth/webauthn/status');
    const data = await res.json();
    setRegistered(data.registered);
  };

  const handleEnable = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const optRes = await fetch('/api/auth/webauthn/register-options', { method: 'POST' });
      const options = await optRes.json();
      const attestation = await startRegistration({ optionsJSON: options });
      const verRes = await fetch('/api/auth/webauthn/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attestation),
      });
      if (verRes.ok) {
        const verData = await verRes.json();
        if (verData.backup) localStorage.setItem('webauthn_backup', verData.backup);
        setRegistered(true);
        setMessage({ type: 'success', text: 'Face ID enabled. You can now sign in with biometrics.' });
      } else {
        const d = await verRes.json();
        setMessage({ type: 'error', text: d.error || 'Registration failed.' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      setMessage({ type: 'error', text: msg });
    }
    setLoading(false);
  };

  const handleDisable = async () => {
    if (!confirm('Remove Face ID login from all devices?')) return;
    setLoading(true);
    setMessage(null);
    const res = await fetch('/api/auth/webauthn/delete', { method: 'POST' });
    if (res.ok) {
      localStorage.removeItem('webauthn_backup');
      setRegistered(false);
      setMessage({ type: 'success', text: 'Face ID disabled. Use your passphrase to sign in.' });
    } else {
      setMessage({ type: 'error', text: 'Failed to disable. Try again.' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <HealthHeader />
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Authentication</h2>
          </div>

          <div className="px-6 py-5">
            <div className="flex items-start gap-4">
              <div className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${registered ? 'bg-green-50' : 'bg-gray-100'}`}>
                <Fingerprint className={`w-5 h-5 ${registered ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-900">Face ID / Fingerprint</p>
                  {registered === null ? (
                    <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                  ) : registered ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Enabled</span>
                  ) : (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Disabled</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {registered
                    ? 'Sign in instantly using Face ID or fingerprint on this device.'
                    : 'Enable biometric login to skip the passphrase on this device.'}
                </p>

                {message && (
                  <div className={`flex items-center gap-1.5 mt-3 text-xs font-medium ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {message.type === 'success'
                      ? <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                      : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                    {message.text}
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  {!registered && (
                    <button
                      onClick={handleEnable}
                      disabled={loading || registered === null}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
                    >
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      Enable Face ID
                    </button>
                  )}
                  {registered && (
                    <button
                      onClick={handleDisable}
                      disabled={loading}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
                    >
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldOff className="w-3.5 h-3.5" />}
                      Disable Face ID
                    </button>
                  )}
                  {registered && (
                    <button
                      onClick={handleEnable}
                      disabled={loading}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
                    >
                      Re-register
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
