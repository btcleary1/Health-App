'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, LayoutDashboard, Brain, Clipboard, Upload, LogOut, Settings } from 'lucide-react';
import { usePersonContext } from '@/lib/PersonContext';
import PersonSelector from '@/components/PersonSelector';

const navItems = [
  { href: '/dashboard',       label: 'Dashboard', icon: LayoutDashboard },
  { href: '/ai-analysis',     label: 'AI',         icon: Brain },
  { href: '/doctor-briefing', label: 'Briefing',   icon: Clipboard },
  { href: '/uploads',         label: 'Files',      icon: Upload },
];

export default function HealthHeader() {
  const pathname = usePathname();
  const { persons, activeId, setActiveId } = usePersonContext();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <>
      {/* ── Top bar ── */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: 'linear-gradient(180deg, #050814 0%, #0B1120 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="w-full px-4 py-3">
          <div className="flex items-center justify-between">

            {/* Brand */}
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
                  boxShadow: '0 2px 10px rgba(99,102,241,0.4)',
                }}
              >
                <Activity className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white text-[15px] tracking-tight">Health Wiz</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden sm:flex items-center gap-2">
              <nav
                className="flex items-center gap-0.5 rounded-xl p-1"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                {navItems.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname?.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                        isActive
                          ? 'text-white'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                      style={isActive ? { background: 'rgba(255,255,255,0.12)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' } : {}}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      {label}
                    </Link>
                  );
                })}
              </nav>

              {/* Person selector — desktop */}
              {persons.length > 0 && (
                <PersonSelector persons={persons} activeId={activeId} onChange={setActiveId} />
              )}

              <Link
                href="/settings"
                title="Settings"
                className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                  pathname?.startsWith('/settings')
                    ? 'text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                style={pathname?.startsWith('/settings') ? { background: 'rgba(255,255,255,0.12)' } : {}}
              >
                <Settings className="w-4 h-4" />
              </Link>

              <button
                onClick={handleLogout}
                title="Sign out"
                className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-200 transition-all"
                style={{ minHeight: 'unset' }}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile top-right: person selector + settings + logout */}
            <div className="sm:hidden flex items-center gap-1">
              {persons.length > 0 && (
                <PersonSelector persons={persons} activeId={activeId} onChange={setActiveId} />
              )}
              <Link
                href="/settings"
                title="Settings"
                className="flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 hover:text-white transition-colors"
                style={pathname?.startsWith('/settings') ? { color: 'white', background: 'rgba(255,255,255,0.1)' } : {}}
              >
                <Settings className="w-4 h-4" />
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 hover:text-white transition-colors"
                title="Sign out"
                style={{ minHeight: 'unset' }}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* ── Mobile bottom tab bar ── */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
        style={{
          background: 'rgba(5,8,20,0.97)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 relative"
            >
              {/* Active indicator line */}
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                  style={{ background: '#3B82F6' }}
                />
              )}
              <Icon
                className="w-[22px] h-[22px] transition-colors"
                style={{ color: isActive ? '#60A5FA' : '#6B7280' }}
              />
              <span
                className="text-[10px] font-medium transition-colors"
                style={{ color: isActive ? '#60A5FA' : '#6B7280' }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Spacer so content doesn't hide behind bottom nav on mobile */}
      <div className="sm:hidden h-16" />
    </>
  );
}
