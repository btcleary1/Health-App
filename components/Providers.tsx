'use client';

import { PersonProvider } from '@/lib/PersonContext';
import { ReactNode } from 'react';
import HealthChat from '@/components/HealthChat';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <PersonProvider>
      {children}
      <HealthChat />
    </PersonProvider>
  );
}
