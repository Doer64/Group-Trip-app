'use client';

import React from 'react';
import Link from 'next/link';
import { Compass, LogOut, User as UserIcon } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from './ui/Button';

export function Navbar() {
  const { user, isAuthenticated, logout } = useCurrentUser();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/70 bg-[#f7f7ff]/75 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 text-indigo-950 font-black text-lg tracking-tight hover:opacity-90 transition-opacity"
        >
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-200 rotate-[-5deg] transition-transform group-hover:rotate-0">
            <Compass className="w-5 h-5" />
          </div>
          <span>GroupTrip</span>
        </Link>

        {/* User Section */}
        <div className="flex items-center gap-3 text-sm">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 border border-indigo-100 text-indigo-800 text-xs font-bold shadow-xs">
                <UserIcon className="w-3.5 h-3.5 text-violet-500" />
                <span>{user.name}</span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-400 hover:text-indigo-900 hover:bg-white transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          ) : (
            <Link href="/login">
              <Button variant="secondary" size="sm">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
