'use client';

import React from 'react';
import Link from 'next/link';
import { Compass, LogOut, User as UserIcon } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from './ui/Button';

export function Navbar() {
  const { user, isAuthenticated, logout } = useCurrentUser();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 text-slate-900 font-extrabold text-lg tracking-tight hover:opacity-95 transition-opacity"
        >
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:rotate-12 transition-transform duration-300">
            <Compass className="w-5 h-5" />
          </div>
          <span className="text-slate-900 font-black tracking-tight text-lg">GroupTrip</span>
        </Link>

        {/* User Section */}
        <div className="flex items-center gap-3 text-sm">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200/80 text-slate-800 text-xs font-semibold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                <span className="truncate max-w-[130px] sm:max-w-[180px]">{user.name}</span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          ) : (
            <Link href="/login">
              <Button variant="secondary" size="sm" className="font-bold">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
