import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import Providers from '@/components/Providers';
import LegalFooter from '@/components/LegalFooter';

export const metadata: Metadata = {
  title: {
    default: "Cleary Health",
    template: "%s | Cleary Health",
  },
  description: 'Personal health tracking, AI research summaries, and doctor briefings.',
  applicationName: 'Cleary Health',
  appleWebApp: {
    capable: true,
    title: 'Cleary Health',
    statusBarStyle: 'default',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body><Providers>{children}</Providers><LegalFooter /></body>
    </html>
  );
}
