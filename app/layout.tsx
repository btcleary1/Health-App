import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: {
    default: "Health Wiz",
    template: "%s | Health Wiz",
  },
  description: 'Personal health tracking, AI medical analysis, and doctor briefings.',
  applicationName: 'Health Wiz',
  appleWebApp: {
    capable: true,
    title: 'Health Wiz',
    statusBarStyle: 'default',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
