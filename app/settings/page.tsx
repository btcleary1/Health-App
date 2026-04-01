'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Fingerprint, ShieldCheck, ShieldOff, Loader2, CheckCircle, XCircle,
  KeyRound, Eye, EyeOff, Users, Trash2, RefreshCw, AlertTriangle,
  UserCircle, UserPlus, Pencil, X, Plus,
} from 'lucide-react';
import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import HealthHeader from '@/components/HealthHeader';
import { validateFirstName } from '@/lib/pii-validator';

const AGE_GROUPS = [
  { value: 'infant',   label: 'Infant',       sub: '0–12 mo' },
  { value: 'toddler',  label: 'Toddler',      sub: '1–3 yrs' },
  { value: 'child',    label: 'Child',        sub: '4–12 yrs' },
  { value: 'teenager', label: 'Teenager',     sub: '13–17 yrs' },
  { value: 'adult',    label: 'Adult',        sub: '18–64 yrs' },
  { value: 'senior',   label: 'Senior',       sub: '65+ yrs' },
];

interface TrackedPerson {
  id: string;
  name: string;
  ageGroup: string;
}

export default function SettingsPage() {
  const router = useRouter();

  // Auth
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [supportsWebAuthn, setSupportsWebAuthn] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometrics');

  // Admin
  const [currentUser, setCurrentUser] = useState<{ role: string; userId: string } | null>(null);
  const [users, setUsers] = useState<{ userId: string; email: string; name: string; role: string; createdAt: string }[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');
  const [resetResult, setResetResult] = useState<{ userId: string; tempPassword: string } | null>(null);
  const [resetLoading, setResetLoading] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState<string | null>(null);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);

  // Account holder
  const [accountFirstName, setAccountFirstName] = useState('');
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountMessage, setAccountMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Persons list
  const [persons, setPersons] = useState<TrackedPerson[]>([]);
  const [personsLoading, setPersonsLoading] = useState(true);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [editingPerson, setEditingPerson] = useState<TrackedPerson | null>(null);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonAgeGroup, setNewPersonAgeGroup] = useState('');
  const [personSaving, setPersonSaving] = useState(false);
  const [personMessage, setPersonMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Change password
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
    if (/iPhone|iPad|iPod/.test(ua)) setBiometricLabel('Face ID');
    else if (/Mac/.test(ua) || /CrOS/.test(ua) || /Win/.test(ua)) setBiometricLabel('Fingerprint / Touch ID');

    // Load account holder name
    fetch('/api/health-data/account').then(r => r.json()).then(d => {
      if (d.account?.firstName) setAccountFirstName(d.account.firstName);
    }).catch(() => {});

    // Load persons
    fetch('/api/health-data/persons').then(r => r.json()).then(d => {
      setPersons(d.persons ?? []);
    }).catch(() => {}).finally(() => setPersonsLoading(false));

    // Load current user + admin data
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      setCurrentUser(d);
      if (d.role === 'admin') {
        setUsersLoading(true);
        fetch('/api/admin/users').then(r => r.json()).then(u => {
          setUsers(u.users || []);
        }).finally(() => setUsersLoading(false));
      }
    }).catch(() => {});
  }, []);

  const fetchStatus = async () => {
    const res = await fetch('/api/auth/webauthn/status');
    const data = await res.json();
    setRegistered(data.registered);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountMessage(null);
    const trimmed = accountFirstName.trim();
    if (!trimmed) { setAccountMessage({ type: 'error', text: 'First name is required.' }); return; }
    setAccountSaving(true);
    try {
      const res = await fetch('/api/health-data/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: trimmed }),
      });
      if (res.ok) setAccountMessage({ type: 'success', text: 'Name saved.' });
      else { const d = await res.json(); setAccountMessage({ type: 'error', text: d.error || 'Failed to save.' }); }
    } catch { setAccountMessage({ type: 'error', text: 'Something went wrong.' }); }
    setAccountSaving(false);
  };

  const openAddPerson = () => {
    setEditingPerson(null);
    setNewPersonName('');
    setNewPersonAgeGroup('');
    setPersonMessage(null);
    setShowAddPerson(true);
  };

  const openEditPerson = (p: TrackedPerson) => {
    setEditingPerson(p);
    setNewPersonName(p.name);
    setNewPersonAgeGroup(p.ageGroup);
    setPersonMessage(null);
    setShowAddPerson(true);
  };

  const handleSavePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameError = validateFirstName(newPersonName);
    if (nameError) { setPersonMessage({ type: 'error', text: nameError }); return; }
    if (!newPersonAgeGroup) { setPersonMessage({ type: 'error', text: 'Please select an age group.' }); return; }
    setPersonSaving(true);
    setPersonMessage(null);
    try {
      const body: Record<string, string> = { name: newPersonName, ageGroup: newPersonAgeGroup };
      if (editingPerson) body.id = editingPerson.id;
      const res = await fetch('/api/health-data/persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setPersons(data.persons);
        setShowAddPerson(false);
        setEditingPerson(null);
      } else {
        setPersonMessage({ type: 'error', text: data.error || 'Failed to save.' });
      }
    } catch { setPersonMessage({ type: 'error', text: 'Something went wrong.' }); }
    setPersonSaving(false);
  };

  const handleDeletePerson = async (p: TrackedPerson) => {
    if (!confirm(`Remove ${p.name} from your tracking list? Their health data is preserved but won't be accessible from this list.`)) return;
    const res = await fetch('/api/health-data/persons', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id }),
    });
    const data = await res.json();
    if (res.ok) setPersons(data.persons);
  };

  const handleEnable = async () => {
    setAuthLoading(true);
    setAuthMessage(null);
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
        setAuthMessage({ type: 'success', text: `${biometricLabel} enabled. Sign in without a password next time.` });
      } else {
        const d = await verRes.json();
        setAuthMessage({ type: 'error', text: d.error || 'Registration failed.' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      setAuthMessage({ type: 'error', text: msg });
    }
    setAuthLoading(false);
  };

  const handleDisable = async () => {
    if (!confirm('Remove Face ID login from all devices?')) return;
    setAuthLoading(true);
    setAuthMessage(null);
    const res = await fetch('/api/auth/webauthn/delete', { method: 'POST' });
    if (res.ok) {
      setRegistered(false);
      setAuthMessage({ type: 'success', text: 'Face ID disabled. Use your password to sign in.' });
    } else {
      setAuthMessage({ type: 'error', text: 'Failed to disable. Try again.' });
    }
    setAuthLoading(false);
  };

  const handleDeleteMyAccount = async () => {
    if (!confirm('Permanently delete your account and ALL your health data? This cannot be undone.')) return;
    if (!confirm('Are you absolutely sure? Every event, patient record, and uploaded file will be deleted forever.')) return;
    setDeleteAccountLoading(true);
    try {
      const res = await fetch('/api/auth/account', { method: 'DELETE' });
      if (res.ok) router.push('/login');
    } finally { setDeleteAccountLoading(false); }
  };

  const handleChangePassphrase = async (e: React.FormEvent) => {
    e.preventDefault();
    setCpMessage(null);
    if (cpNew !== cpConfirm) { setCpMessage({ type: 'error', text: 'New passwords do not match.' }); return; }
    if (cpNew.length < 4) { setCpMessage({ type: 'error', text: 'Must be at least 4 characters.' }); return; }
    setCpLoading(true);
    try {
      const res = await fetch('/api/auth/change-passphrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassphrase: cpCurrent, newPassphrase: cpNew }),
      });
      const data = await res.json();
      if (!res.ok) setCpMessage({ type: 'error', text: data.error || 'Failed.' });
      else { setCpMessage({ type: 'success', text: 'Password changed successfully.' }); setCpCurrent(''); setCpNew(''); setCpConfirm(''); }
    } catch { setCpMessage({ type: 'error', text: 'Something went wrong.' }); }
    setCpLoading(false);
  };

  const handleResetPassword = async (userId: string, name: string) => {
    if (!confirm(`Reset ${name}'s password?`)) return;
    setResetLoading(userId);
    setResetResult(null);
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (res.ok) setResetResult({ userId, tempPassword: data.tempPassword });
    } finally { setResetLoading(null); }
  };

  const handleToggleRole = async (userId: string, currentRole: string, name: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`Change ${name}'s role to ${newRole}?`)) return;
    setRoleLoading(userId);
    await fetch('/api/admin/users', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role: newRole }),
    });
    setUsers(prev => prev.map(u => u.userId === userId ? { ...u, role: newRole } : u));
    setRoleLoading(null);
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name}'s account? This cannot be undone.`)) return;
    const res = await fetch('/api/admin/users', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.userId !== userId));
      setDeleteMessage(`${name}'s account removed.`);
      setTimeout(() => setDeleteMessage(''), 3000);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC' }}>
      <HealthHeader />
      <div className="max-w-lg mx-auto px-4 py-6 pb-24 sm:pb-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

        {/* ── Account Holder ── */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your Account</h2>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
                <UserCircle className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 mb-0.5">Your First Name</p>
                <p className="text-sm text-gray-500 mb-4">How Health Wiz addresses you — separate from who you're tracking.</p>
                <form onSubmit={handleSaveAccount} className="flex gap-2">
                  <input
                    type="text"
                    value={accountFirstName}
                    onChange={e => { setAccountFirstName(e.target.value); setAccountMessage(null); }}
                    placeholder="e.g. Brad"
                    autoComplete="given-name"
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={accountSaving}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-colors shrink-0"
                  >
                    {accountSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                  </button>
                </form>
                {accountMessage && (
                  <div className={`flex items-center gap-1.5 mt-2 text-xs font-medium ${accountMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {accountMessage.type === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {accountMessage.text}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── People You're Tracking ── */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Who You're Tracking</h2>
              <p className="text-xs text-gray-400 mt-0.5">Up to 10 people — each gets their own Dashboard &amp; AI Summary</p>
            </div>
            {persons.length < 10 && (
              <button
                onClick={openAddPerson}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Person
              </button>
            )}
          </div>

          <div className="px-6 py-5">
            {/* Add / Edit form */}
            {showAddPerson && (
              <div className="mb-5 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-blue-900 text-sm">
                    {editingPerson ? `Edit ${editingPerson.name}` : 'Add a Person'}
                  </p>
                  <button onClick={() => setShowAddPerson(false)} className="text-blue-400 hover:text-blue-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleSavePerson} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-blue-800 mb-1">First Name</label>
                    <input
                      type="text"
                      value={newPersonName}
                      onChange={e => { setNewPersonName(e.target.value); setPersonMessage(null); }}
                      placeholder="e.g. Emma"
                      style={{ color: '#111827', backgroundColor: '#ffffff' }}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <p className="text-[11px] text-blue-600 mt-1">First name only — no last names</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-blue-800 mb-2">Age Group</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {AGE_GROUPS.map(g => (
                        <button
                          key={g.value}
                          type="button"
                          onClick={() => setNewPersonAgeGroup(g.value)}
                          className={`px-2 py-2 rounded-xl border text-left transition-colors ${
                            newPersonAgeGroup === g.value
                              ? 'border-blue-500 bg-blue-100 text-blue-900'
                              : 'border-gray-200 bg-white hover:border-blue-300 text-gray-700'
                          }`}
                        >
                          <div className="text-xs font-semibold">{g.label}</div>
                          <div className="text-[10px] text-gray-400">{g.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  {personMessage && (
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${personMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                      {personMessage.type === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {personMessage.text}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={personSaving}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                  >
                    {personSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingPerson ? 'Save Changes' : 'Add Person')}
                  </button>
                </form>
              </div>
            )}

            {personsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : persons.length === 0 ? (
              <div className="text-center py-6">
                <UserPlus className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 font-medium">No one added yet</p>
                <p className="text-xs text-gray-400 mt-1">Add the first person you'd like to track</p>
                <button
                  onClick={openAddPerson}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  Add First Person
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {persons.map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                        style={{ background: `hsl(${(i * 67) % 360}, 65%, 55%)` }}
                      >
                        {p.name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 text-sm">{p.name}</div>
                        <div className="text-xs text-gray-400 capitalize">{p.ageGroup}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditPerson(p)}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePerson(p)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-gray-400 pt-1">{persons.length} of 10 slots used</p>
              </div>
            )}
          </div>
        </section>

        {/* ── Biometric Auth ── */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Authentication</h2>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${registered ? 'bg-green-50' : 'bg-gray-100'}`}>
                <Fingerprint className={`w-5 h-5 ${registered ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-900">{biometricLabel || 'Biometric Login'}</p>
                  {registered === null
                    ? <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                    : registered
                      ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Enabled</span>
                      : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Disabled</span>
                  }
                </div>
                <p className="text-sm text-gray-500">
                  {registered
                    ? `Sign in instantly using ${biometricLabel} on this device.`
                    : `Enable ${biometricLabel} login to skip the password on this device.`}
                </p>
                {authMessage && (
                  <div className={`flex items-center gap-1.5 mt-3 text-xs font-medium ${authMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {authMessage.type === 'success' ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                    {authMessage.text}
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  {!registered && (
                    <button
                      onClick={handleEnable}
                      disabled={authLoading || registered === null}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
                    >
                      {authLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      Enable {biometricLabel}
                    </button>
                  )}
                  {registered && (
                    <>
                      <button
                        onClick={handleDisable}
                        disabled={authLoading}
                        className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
                      >
                        {authLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldOff className="w-3.5 h-3.5" />}
                        Disable
                      </button>
                      <button
                        onClick={handleEnable}
                        disabled={authLoading}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
                      >
                        Re-register
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Change Password ── */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Password</h2>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                <KeyRound className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 mb-1">Change Password</p>
                <p className="text-sm text-gray-500 mb-4">Update the password used to sign in.</p>
                <form onSubmit={handleChangePassphrase} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrent ? 'text' : 'password'}
                        value={cpCurrent}
                        onChange={e => setCpCurrent(e.target.value)}
                        required
                        placeholder="Enter current password"
                        style={{ color: '#111827', backgroundColor: '#ffffff' }}
                        className="w-full pr-9 pl-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 outline-none"
                      />
                      <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                        {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
                    <div className="relative">
                      <input
                        type={showNew ? 'text' : 'password'}
                        value={cpNew}
                        onChange={e => setCpNew(e.target.value)}
                        required
                        placeholder="Enter new password"
                        style={{ color: '#111827', backgroundColor: '#ffffff' }}
                        className="w-full pr-9 pl-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 outline-none"
                      />
                      <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={cpConfirm}
                      onChange={e => setCpConfirm(e.target.value)}
                      required
                      placeholder="Re-enter new password"
                      style={{ color: '#111827', backgroundColor: '#ffffff' }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 outline-none"
                    />
                  </div>
                  {cpMessage && (
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${cpMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                      {cpMessage.type === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {cpMessage.text}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={cpLoading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
                  >
                    {cpLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                    Update Password
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* ── Danger Zone ── */}
        <section className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-red-50">
            <h2 className="text-xs font-semibold text-red-500 uppercase tracking-wide">Danger Zone</h2>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 mb-1">Delete My Account</p>
                <p className="text-sm text-gray-500 mb-4">
                  Permanently deletes your account and all health data — events, visits, and uploaded files. Cannot be undone.
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
        </section>

        {/* ── Admin: User Management ── */}
        {currentUser?.role === 'admin' && (
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mt-4">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">User Management</h2>
            </div>
            <div className="px-6 py-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 mb-1">Registered Users</p>
                  <p className="text-sm text-gray-500 mb-4">
                    {users.length} of 20 user slots used.
                  </p>
                  {deleteMessage && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 mb-3">
                      <CheckCircle className="w-3.5 h-3.5" />{deleteMessage}
                    </div>
                  )}
                  {resetResult && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                      <div className="text-xs font-semibold text-yellow-800 mb-1">Temporary password — share once:</div>
                      <div className="font-mono text-sm bg-white border border-yellow-300 rounded px-2 py-1 text-yellow-900 select-all">{resetResult.tempPassword}</div>
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
                              {u.role === 'admin' && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Admin</span>}
                            </div>
                            <div className="text-xs text-gray-400 truncate">{u.email}</div>
                          </div>
                          {u.userId !== currentUser.userId && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleToggleRole(u.userId, u.role, u.name)}
                                disabled={roleLoading === u.userId}
                                className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${u.role === 'admin' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                              >
                                {roleLoading === u.userId ? <Loader2 className="w-3 h-3 animate-spin" /> : u.role === 'admin' ? 'Admin' : 'User'}
                              </button>
                              <button
                                onClick={() => handleResetPassword(u.userId, u.name)}
                                disabled={resetLoading === u.userId}
                                className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Reset password"
                              >
                                {resetLoading === u.userId ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
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
          </section>
        )}
      </div>
    </div>
  );
}
