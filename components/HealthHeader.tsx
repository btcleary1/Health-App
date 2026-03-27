'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, LayoutDashboard, FileText, Brain, Clipboard, Upload } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/ai-analysis', label: 'AI', icon: Brain },
  { href: '/doctor-briefing', label: 'Briefing', icon: Clipboard },
  { href: '/uploads', label: 'Uploads', icon: Upload },
];

export default function HealthHeader() {
  const pathname = usePathname();

  return (
    <>
      {/* Top header — visible on all screens */}
      <header className="sticky top-0 z-50 bg-card border-b border-border" style={{ backgroundColor: '#0B1120' }}>
        <div className="w-full px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-accent" />
              <span className="font-bold text-text-primary text-base">Ethan's Health</span>
            </Link>
            {/* Desktop nav */}
            <nav className="hidden sm:flex items-center gap-1">
              {navItems.map(({ href, label, icon: Icon }) => {
                const isActive = pathname?.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-accent text-white'
                        : 'text-text-secondary hover:text-text-primary hover:bg-background'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Bottom tab bar — mobile only */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border flex items-stretch" style={{ backgroundColor: '#0B1120', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[11px] font-medium transition-colors ${
                isActive ? 'text-accent' : 'text-text-secondary'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-accent' : 'text-text-secondary'}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Spacer so content doesn't hide behind bottom nav on mobile */}
      <div className="sm:hidden h-16" />
    </>
  );
}
