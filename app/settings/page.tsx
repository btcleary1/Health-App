'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Fingerprint, ShieldCheck, ShieldOff, Loader2, CheckCircle, XCircle, KeyRound, Eye, EyeOff, Users, Trash2, RefreshCw, AlertTriangle, UserCircle } from 'lucide-react';
import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import HealthHeader from '@/components/HealthHeader';

const AGE_GROUPS = [
  { value: 'infant',    label: 'Infant',        sub: '0–12 months' },
  { value: 'toddler',   label: 'Toddler',       sub: '1–3 years' },
  { value: 'child',     label: 'Child',         sub: '4–12 years' },
  { value: 'teenager',  label: 'Teenager',      sub: '13–17 years' },
  { value: 'adult',     label: 'Adult',         sub: '18–64 years' },
  { value: 'senior',    label: 'Senior Adult',  sub: '65+ years' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [supportsWebAuthn, setSupportsWebAuthn] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometrics');

  // Current user + admin state
  const [currentUser, setCurrentUser] = useState<{ role: string; userId: string } | null>(null);
  const [users, setUsers] = useState<{ userId: string; email: string; name: string; role: string; createdAt: string }[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');
  const [resetResult, setResetResult] = useState<{ userId: string; tempPassword: string } | null>(null);
  const [resetLoading, setResetLoading] = useState<string | null>(null);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);

  // Patient profile state
  const [patientName, setPatientName] = useState('');
  const [patientAgeGroup, setPatientAgeGroup] = useState('');
  const [patientSaving, setPatientSaving] = useState(false);
  const [patientMessage, setPatientMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      setCurrentUser(d);
      if (d.role === 'admin') {
        setUsersLoading(true);
        fetch('/api/admin/users').then(r => r.json()).then(u => {
          setUsers(u.users || []);
        }).finally(() => setUsersLoading(false));
      }
    }).catch(() => {});
    fetch('/api/health-data/patient').then(r => r.json()).then(d => {
      if (d.patient?.name) setPatientName(d.patient.name);
      if (d.patient?.ageGroup) setPatientAgeGroup(d.patient.ageGroup);
    }).catch(() => {});
  }, []);

  const handleResetPassword = async (userId: string, name: string) => {
    if (!confirm(`Reset ${name}'s password? A temporary password will be generated.`)) return;
    setResetLoading(userId);
    setResetResult(null);
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetResult({ userId, tempPassword: data.tempPassword });
      }
    } finally {
      setResetLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name}'s account? This cannot be undone.`)) return;
    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.userId !== userId));
      setDeleteMessage(`${name}'s account removed.`);
      setTimeout(() => setDeleteMessage(''), 3000);
    }
  };

  // Change passphrase state
  const [cpCurrent, setCpCurrent] = useState('');
  const [cpNew, setCpNew] = useState('');
  const [cpConfirm, setCpConfirm] = useState('');
  const [cpLoading, setCpLoading] = useState(false);
  const [cpMessage, setCpMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    setSupportsWebAuthn(browserSupportsWebAuthn());
    fetchStatus();
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) {
      setBiometricLabel('Face ID');
    } else if (/Mac/.test(ua) || /CrOS/.test(ua) || /Win/.test(ua)) {
      setBiometricLabel('Fingerprint / Touch ID');
    }
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
        setRegistered(true);
        setMessage({ type: 'success', text: `${biometricLabel || 'Biometrics'} enabled. You can now sign in without a passphrase.` });
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
      setRegistered(false);
      setMessage({ type: 'success', text: 'Face ID disabled. Use your passphrase to sign in.' });
    } else {
      setMessage({ type: 'error', text: 'Failed to disable. Try again.' });
    }
    setLoading(false);
  };

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) { setPatientMessage({ type: 'error', text: 'First name is required.' }); return; }
    if (!patientAgeGroup) { setPatientMessage({ type: 'error', text: 'Please select an age group.' }); return; }
    setPatientSaving(true);
    setPatientMessage(null);
    try {
      const existing = await fetch('/api/health-data/patient').then(r => r.json()).catch(() => ({}));
      const merged = { ...(existing.patient || {}), name: patientName.trim(), ageGroup: patientAgeGroup };
      const res = await fetch('/api/health-data/patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient: merged }),
      });
      if (res.ok) {
        setPatientMessage({ type: 'success', text: 'Patient profile saved.' });
      } else {
        setPatientMessage({ type: 'error', text: 'Failed to save. Try again.' });
      }
    } catch {
      setPatientMessage({ type: 'error', text: 'Something went wrong.' });
    }
    setPatientSaving(false);
  };

  const handleDeleteMyAccount = async () => {
    if (!confirm('Permanently delete your account and ALL your health data? This cannot be undone.')) return;
    if (!confirm('Are you absolutely sure? Every event, patient record, and uploaded file will be deleted forever.')) return;
    setDeleteAccountLoading(true);
    try {
      const res = await fetch('/api/auth/account', { method: 'DELETE' });
      if (res.ok) {
        router.push('/login');
      }
    } finally {
      setDeleteAccountLoading(false);
    }
  };

  const handleChangePassphrase = async (e: React.FormEvent) => {
    e.preventDefault();
    setCpMessage(null);
    if (cpNew !== cpConfirm) {
      setCpMessage({ type: 'error', text: 'New passphrases do not match.' });
      return;
    }
    if (cpNew.length < 4) {
      setCpMessage({ type: 'error', text: 'New passphrase must be at least 4 characters.' });
      return;
    }
    setCpLoading(true);
    try {
      const res = await fetch('/api/auth/change-passphrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassphrase: cpCurrent, newPassphrase: cpNew }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCpMessage({ type: 'error', text: data.error || 'Failed to change passphrase.' });
      } else {
        setCpMessage({ type: 'success', text: 'Passphrase changed successfully.' });
        setCpCurrent('');
        setCpNew('');
        setCpConfirm('');
      }
    } catch {
      setCpMessage({ type: 'error', text: 'Something went wrong. Try again.' });
    }
    setCpLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <HealthHeader />
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

        {/* Patient Profile */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Patient Profile</h2>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <UserCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 mb-1">Who are you tracking?</p>
                <p className="text-sm text-gray-500 mb-4">This replaces the sample data shown throughout the app.</p>
                <form onSubmit={handleSavePatient} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
                    <input
                      type="text"
                      value={patientName}
                      onChange={e => setPatientName(e.target.value)}
                      placeholder="e.g. Emma"
                      autoComplete="given-name"
                      style={{ color: '#111827', backgroundColor: '#ffffff' }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Age Group</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {AGE_GROUPS.map(g => (
                        <button
                          key={g.value}
                          type="button"
                          onClick={() => setPatientAgeGroup(g.value)}
                          className={`px-3 py-2.5 rounded-xl border text-left transition-colors ${
                            patientAgeGroup === g.value
                              ? 'border-blue-500 bg-blue-50 text-blue-800'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          <div className="text-sm font-semibold">{g.label}</div>
                          <div className="text-xs text-gray-400">{g.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  {patientMessage && (
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${patientMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                      {patientMessage.type === 'success' ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                      {patientMessage.text}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={patientSaving}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
                  >
                    {patientSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCircle className="w-3.5 h-3.5" />}
                    Save Patient Profile
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

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
                  <p className="font-semibold text-gray-900">{biometricLabel || 'Biometric Login'}</p>
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
                    ? `Sign in instantly using ${biometricLabel || 'biometrics'} on this device.`
                    : `Enable ${biometricLabel || 'biometric'} login to skip the passphrase on this device.`}
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
                      Enable {biometricLabel || 'Biometrics'}
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

        {/* Change Passphrase */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mt-4">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Passphrase</h2>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 mb-1">Change Passphrase</p>
                <p className="text-sm text-gray-500 mb-4">Update the passphrase used to log in to this app.</p>

                <form onSubmit={handleChangePassphrase} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Current Passphrase</label>
                    <div className="relative">
                      <input
                        type={showCurrent ? 'text' : 'password'}
                        value={cpCurrent}
                        onChange={e => setCpCurrent(e.target.value)}
                        required
                        placeholder="Enter current passphrase"
                        className="w-full pr-9 pl-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
                      />
                      <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">New Passphrase</label>
                    <div className="relative">
                      <input
                        type={showNew ? 'text' : 'password'}
                        value={cpNew}
                        onChange={e => setCpNew(e.target.value)}
                        required
                        placeholder="Enter new passphrase"
                        className="w-full pr-9 pl-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
                      />
                      <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Confirm New Passphrase</label>
                    <input
                      type="password"
                      value={cpConfirm}
                      onChange={e => setCpConfirm(e.target.value)}
                      required
                      placeholder="Re-enter new passphrase"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
                    />
                  </div>

                  {cpMessage && (
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${cpMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                      {cpMessage.type === 'success'
                        ? <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                        : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                      {cpMessage.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={cpLoading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
                  >
                    {cpLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                    Update Passphrase
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Delete My Account */}
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden mt-4">
          <div className="px-6 py-4 border-b border-red-50">
            <h2 className="text-sm font-semibold text-red-500 uppercase tracking-wide">Danger Zone</h2>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 mb-1">Delete My Account</p>
                <p className="text-sm text-gray-500 mb-4">
                  Permanently deletes your account and all your health data — events, patient info, doctor visits, and uploaded files. This cannot be undone.
                </p>
                <button
                  onClick={handleDeleteMyAccount}
                  disabled={deleteAccountLoading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
                >
                  {deleteAccountLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Delete My Account &amp; Data
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Admin: User Management */}
        {currentUser?.role === 'admin' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mt-4">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">User Management</h2>
            </div>
            <div className="px-6 py-5">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 mb-1">Registered Users</p>
                  <p className="text-sm text-gray-500 mb-4">
                    {users.length} of 20 user slots used. New users can register at <span className="font-mono text-xs bg-gray-100 px-1 rounded">/register</span>.
                  </p>

                  {deleteMessage && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 mb-3">
                      <CheckCircle className="w-3.5 h-3.5" />{deleteMessage}
                    </div>
                  )}

                  {resetResult && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                      <div className="text-xs font-semibold text-yellow-800 mb-1">Temporary password generated — share this once:</div>
                      <div className="font-mono text-sm bg-white border border-yellow-300 rounded px-2 py-1 text-yellow-900 select-all">{resetResult.tempPassword}</div>
                      <div className="text-xs text-yellow-700 mt-1">User must change it after logging in.</div>
                    </div>
                  )}

                  {usersLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading users…
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {users.map(u => (
                        <div key={u.userId} className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 last:border-0">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 truncate">{u.name}</span>
                              {u.role === 'admin' && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Admin</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 truncate">{u.email}</div>
                          </div>
                          {u.userId !== currentUser.userId && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleResetPassword(u.userId, u.name)}
                                disabled={resetLoading === u.userId}
                                className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Reset password"
                              >
                                {resetLoading === u.userId
                                  ? <Loader2 className="w-4 h-4 animate-spin" />
                                  : <RefreshCw className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.userId, u.name)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove user"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
