'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, LayoutDashboard, FileText, Brain, Clipboard, Upload } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Notes', icon: FileText, exact: true },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/ai-analysis', label: 'AI Analysis', icon: Brain },
  { href: '/doctor-briefing', label: 'Doctor Briefing', icon: Clipboard },
  { href: '/uploads', label: 'Uploads', icon: Upload },
];

export default function HealthHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border backdrop-blur-sm bg-opacity-95">
      <div className="w-full px-3 sm:px-4 py-2">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-1.5 shrink-0 mr-1">
            <Activity className="w-5 h-5 text-accent" />
          </Link>

          <nav className="flex items-center gap-1 flex-1 justify-around sm:justify-start sm:gap-1">
            {navItems.map(({ href, label, icon: Icon, exact }) => {
              const isActive = exact ? pathname === href : pathname?.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  className={`flex items-center gap-1.5 p-2.5 sm:px-3 sm:py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-accent text-white'
                      : 'text-text-secondary hover:text-text-primary hover:bg-background'
                  }`}
                >
                  <Icon className="w-5 h-5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
