'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface TrackedPerson {
  id: string;
  name: string;
  ageGroup: string;
}

interface PersonContextValue {
  persons: TrackedPerson[];
  activeId: string;
  activePerson: TrackedPerson | null;
  personQuery: string;
  setActiveId: (id: string) => void;
  loading: boolean;
  refresh: () => void;
}

const PersonContext = createContext<PersonContextValue>({
  persons: [],
  activeId: 'primary',
  activePerson: null,
  personQuery: '',
  setActiveId: () => {},
  loading: true,
  refresh: () => {},
});

const STORAGE_KEY = 'hw_active_person_id';
const PERSONS_CACHE_KEY = 'hw_persons_cache';

export function PersonProvider({ children }: { children: ReactNode }) {
  // Seed from sessionStorage so selector shows instantly on re-renders/navigation
  const [persons, setPersons] = useState<TrackedPerson[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const cached = sessionStorage.getItem(PERSONS_CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [activeId, setActiveIdState] = useState<string>(() => {
    if (typeof window === 'undefined') return 'primary';
    return localStorage.getItem(STORAGE_KEY) || 'primary';
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    fetch('/api/health-data/persons')
      .then(r => r.json())
      .then(d => {
        const list: TrackedPerson[] = d.persons ?? [];
        setPersons(list);
        // Cache for instant render on next visit
        try { sessionStorage.setItem(PERSONS_CACHE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
        if (list.length > 0) {
          const validStored = stored && list.some(p => p.id === stored);
          setActiveIdState(validStored ? stored! : list[0].id);
        } else {
          setActiveIdState('primary');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const setActiveId = useCallback((id: string) => {
    setActiveIdState(id);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const activePerson = persons.find(p => p.id === activeId) ?? null;
  const personQuery = activeId && activeId !== 'primary' ? `?personId=${activeId}` : '';

  return (
    <PersonContext.Provider value={{ persons, activeId, activePerson, personQuery, setActiveId, loading, refresh: load }}>
      {children}
    </PersonContext.Provider>
  );
}

export function usePersonContext() {
  return useContext(PersonContext);
}
