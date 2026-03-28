import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: "Ethan's Health Dashboard",
    template: "%s | Ethan's Health Dashboard",
  },
  description: 'Pediatric cardiac health tracking, AI medical analysis, and doctor briefings for Ethan Alvarez.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
