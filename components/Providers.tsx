'use client';

import { PersonProvider } from '@/lib/PersonContext';
import { ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  return <PersonProvider>{children}</PersonProvider>;
}
