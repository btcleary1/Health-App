'use client';

import { ChevronDown, UserCircle } from 'lucide-react';
import { TrackedPerson } from '@/lib/useActivePerson';

interface Props {
  persons: TrackedPerson[];
  activeId: string;
  onChange: (id: string) => void;
}

export default function PersonSelector({ persons, activeId, onChange }: Props) {
  if (persons.length === 0) return null;

  const active = persons.find(p => p.id === activeId) ?? persons[0];

  if (persons.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold text-gray-700"
        style={{ background: '#EFF6FF' }}>
        <UserCircle className="w-4 h-4 text-blue-500" />
        <span>{active.name}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <select
        value={activeId}
        onChange={e => onChange(e.target.value)}
        className="appearance-none pl-8 pr-7 py-1.5 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        style={{ background: '#EFF6FF', color: '#1D4ED8', border: 'none' }}
      >
        {persons.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <UserCircle className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 pointer-events-none" />
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-400 pointer-events-none" />
    </div>
  );
}
