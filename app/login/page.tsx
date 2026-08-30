'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, User as UserIcon, ArrowRight, ArrowLeft, Compass, Sparkles, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCurrentUser } from '@/hooks/useCurrentUser';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, identify } = useCurrentUser();

  const redirect = searchParams.get('redirect') || '/';
  const message = searchParams.get('message');

  const [step, setStep] = useState<'email' | 'name'>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, redirect immediately
  useEffect(() => {
    if (isAuthenticated && user) {
      window.location.href = redirect;
    }
  }, [isAuthenticated, user, redirect]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) return;

    setIsLoading(true);
    setError(null);

    // Call identify with email only to check if existing user
    const res = await identify(cleanEmail);
    setIsLoading(false);

    if (res.success) {
      window.location.href = redirect;
    } else if (res.code === 'NAME_REQUIRED') {
      setStep('name');
      setError(null);
    } else {
      setError(res.error || 'Failed to sign in');
    }
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    if (!cleanName || !cleanEmail) return;

    setIsLoading(true);
    setError(null);

    // Register user with email and name
    const res = await identify(cleanEmail, cleanName);
    setIsLoading(false);

    if (res.success) {
      window.location.href = redirect;
    } else {
      setError(res.error || 'Failed to create profile');
    }
  };

  // Don't show the form if already authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-6 sm:py-10">
      <div className="w-full max-w-md">
        {/* Contextual message banner */}
        {message && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center shadow-2xs">
            <Sparkles className="w-4 h-4 text-amber-600 mx-auto mb-1.5" />
            <p className="text-xs sm:text-sm text-slate-800 font-semibold leading-relaxed">
              {message}
            </p>
          </div>
        )}

        {/* Card */}
        <div className="bg-white/95 rounded-[2rem] border border-slate-200 p-6 sm:p-8 shadow-xl shadow-slate-900/5">
          {step === 'email' ? (
            /* STEP 1: Email Only */
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                  <Compass className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Sign In
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your email to continue. No password needed.
                </p>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-4 text-left">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="e.g. alex@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  leftIcon={<Mail className="w-4 h-4" />}
                />

                {error && (
                  <p className="text-xs text-rose-500 font-medium">{error}</p>
                )}

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full font-bold"
                    isLoading={isLoading}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Continue
                  </Button>
                </div>
              </form>
            </>
          ) : (
            /* STEP 2: First-time Registration (Name Required) */
            <>
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setError(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change email</span>
                </button>

                <span className="text-[11px] font-medium text-slate-400 truncate max-w-[180px]">
                  {email}
                </span>
              </div>

              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                  <UserPlus className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Welcome to the crew!
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  What should your group call you?
                </p>
              </div>

              <form onSubmit={handleNameSubmit} className="space-y-4 text-left">
                <Input
                  label="Your Name"
                  placeholder="e.g. Alex"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  leftIcon={<UserIcon className="w-4 h-4" />}
                  helperText="Visible to members on your trips"
                />

                {error && (
                  <p className="text-xs text-rose-500 font-medium">{error}</p>
                )}

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full font-bold"
                    isLoading={isLoading}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Complete Sign In
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
