'use client';

import { ChevronDown, UserCircle } from 'lucide-react';
import { TrackedPerson } from '@/lib/PersonContext';

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
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-white"
        style={{ background: 'rgba(255,255,255,0.1)' }}
      >
        <UserCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span>{active.name}</span>
      </div>
    );
  }

  return (
    <div className="relative flex items-center">
      <UserCircle className="absolute left-2 w-3.5 h-3.5 text-blue-400 pointer-events-none z-10" />
      <select
        value={activeId}
        onChange={e => onChange(e.target.value)}
        className="appearance-none pl-7 pr-6 py-1.5 rounded-lg text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-white"
        style={{
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        {persons.map(p => (
          <option key={p.id} value={p.id} style={{ background: '#1E293B', color: 'white' }}>
            {p.name}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-1.5 w-3 h-3 text-gray-400 pointer-events-none" />
    </div>
  );
}
