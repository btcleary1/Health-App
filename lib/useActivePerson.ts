'use client';

import { useState, useEffect, useCallback } from 'react';

export interface TrackedPerson {
  id: string;
  name: string;
  ageGroup: string;
}

const STORAGE_KEY = 'hw_active_person_id';

export function useActivePerson() {
  const [persons, setPersons] = useState<TrackedPerson[]>([]);
  const [activeId, setActiveIdState] = useState<string>('primary');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore last selected person from localStorage
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;

    fetch('/api/health-data/persons')
      .then(r => r.json())
      .then(d => {
        const list: TrackedPerson[] = d.persons ?? [];
        setPersons(list);

        if (list.length > 0) {
          // Use stored selection if still valid, else first person
          const validStored = stored && list.some(p => p.id === stored);
          setActiveIdState(validStored ? stored! : list[0].id);
        } else {
          // No persons yet — fall back to legacy 'primary' path
          setActiveIdState(stored && stored !== 'primary' ? 'primary' : (stored ?? 'primary'));
        }
      })
      .catch(() => {
        setActiveIdState(stored ?? 'primary');
      })
      .finally(() => setLoading(false));
  }, []);

  const setActiveId = useCallback((id: string) => {
    setActiveIdState(id);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const activePerson = persons.find(p => p.id === activeId) ?? null;

  // Build query string to append to API calls
  const personQuery = activeId && activeId !== 'primary' ? `?personId=${activeId}` : '';

  return { persons, activePerson, activeId, setActiveId, personQuery, loading };
}
