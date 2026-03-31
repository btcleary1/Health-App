'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Loader2, ArrowRight } from 'lucide-react';

const AGE_GROUPS = [
  { value: 'infant',   label: 'Infant',       sub: '0–12 months' },
  { value: 'toddler',  label: 'Toddler',      sub: '1–3 years' },
  { value: 'child',    label: 'Child',        sub: '4–12 years' },
  { value: 'teenager', label: 'Teenager',     sub: '13–17 years' },
  { value: 'adult',    label: 'Adult',        sub: '18–64 years' },
  { value: 'senior',   label: 'Senior Adult', sub: '65+ years' },
];

export default function SetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/health-data/patient')
      .then(r => r.json())
      .then(d => {
        if (d.patient?.name && d.patient?.ageGroup) {
          router.replace('/dashboard');
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  const handleSave = async () => {
    if (!name.trim()) { setError('Please enter a first name.'); return; }
    if (!ageGroup) { setError('Please select an age group.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/health-data/patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient: { name: name.trim(), ageGroup } }),
      });
      if (res.ok) {
        router.push('/dashboard');
      } else {
        setError('Failed to save. Try again.');
        setSaving(false);
      }
    } catch {
      setError('Something went wrong.');
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl mb-4">
          <Activity className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Health Wiz</h1>
        <p className="text-sm text-gray-500 mt-1">One quick step before we get started</p>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Who are we tracking?</h2>
        <p className="text-sm text-gray-500 mb-6">
          First name only — no last name, address, or personal information needed.
        </p>

        {/* First Name */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Patient First Name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="e.g. Emma"
            autoFocus
            autoComplete="off"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>

        {/* Age Group */}
        <div className="mb-7">
          <label className="block text-xs font-semibold text-gray-700 mb-2">
            Age Group
          </label>
          <div className="grid grid-cols-2 gap-2">
            {AGE_GROUPS.map(g => (
              <button
                key={g.value}
                type="button"
                onClick={() => setAgeGroup(g.value)}
                className={`px-4 py-3 rounded-xl border text-left transition-all ${
                  ageGroup === g.value
                    ? 'border-red-500 bg-red-50 ring-1 ring-red-400'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className={`text-sm font-semibold leading-tight ${ageGroup === g.value ? 'text-red-700' : 'text-gray-800'}`}>
                  {g.label}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{g.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600 mb-4 -mt-3">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-colors"
        >
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Setting up…</>
            : <><ArrowRight className="w-4 h-4" /> Get Started</>}
        </button>
      </div>

      <p className="text-xs text-gray-400 mt-6 text-center max-w-sm leading-relaxed">
        You can update this anytime from the Settings menu. Only a first name is stored — no last names, addresses, or identifying information.
      </p>
    </div>
  );
}
