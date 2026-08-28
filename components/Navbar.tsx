'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Compass, LogOut, User as UserIcon, Sparkles } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

export function Navbar() {
  const { user, isAuthenticated, logout, identify } = useCurrentUser();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoggingIn(true);
    setLoginError(null);

    const res = await identify(email.trim(), name.trim() || undefined);
    setIsLoggingIn(false);

    if (res.success) {
      setIsLoginModalOpen(false);
      setEmail('');
      setName('');
    } else {
      setLoginError(res.error || 'Failed to sign in');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 text-slate-900 font-extrabold text-lg tracking-tight hover:opacity-90 transition-opacity"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Compass className="w-5 h-5" />
            </div>
            <span>GroupTrip</span>
          </Link>

          {/* User Section */}
          <div className="flex items-center gap-3 text-sm">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/80 text-slate-700 text-xs font-semibold">
                  <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>{user.name}</span>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsLoginModalOpen(true)}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Quick Sign-In Modal */}
      <Modal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        title="Sign in to your account"
        description="Enter your email to view your trips and sync your votes. No password needed."
        maxWidth="sm"
      >
        <form onSubmit={handleIdentify} className="space-y-4 text-left">
          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. alex@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Name (if new user)"
            placeholder="e.g. Alex"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {loginError && (
            <p className="text-xs text-rose-500 font-medium">{loginError}</p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full"
            isLoading={isLoggingIn}
          >
            Continue
          </Button>
        </form>
      </Modal>
    </>
  );
}
