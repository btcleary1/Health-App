import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: "Health Wiz",
    template: "%s | Health Wiz",
  },
  description: 'Pediatric cardiac health tracking, AI medical analysis, and doctor briefings for Ethan Alvarez.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
