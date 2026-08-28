'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, User as UserIcon, ArrowRight, Sparkles } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '../ui/Toast';

interface JoinTripFormProps {
  tripId: string;
  destination: string;
  creatorName: string;
}

export function JoinTripForm({
  tripId,
  destination,
  creatorName,
}: JoinTripFormProps) {
  const router = useRouter();
  const { user, saveUserLocally } = useCurrentUser();
  const { error: toastError, success } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Sync user state if loaded
  React.useEffect(() => {
    if (user) {
      if (!name) setName(user.name);
      if (!email) setEmail(user.email);
    }
  }, [user, name, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const errors: Record<string, string> = {};
    if (!email.trim()) errors.email = 'Email is required';
    if (!name.trim()) errors.name = 'Name is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toastError(data?.error?.message || 'Failed to join trip');
        return;
      }

      if (data.user) {
        saveUserLocally(data.user);
      }

      success(`Welcome to the ${destination} trip!`);
      router.push(`/trip/${tripId}`);
    } catch (err: any) {
      toastError(err.message || 'Network error joining trip');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm max-w-md w-full mx-auto text-left">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">
          Join Trip to {destination}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Invited by <span className="font-semibold text-slate-700">{creatorName}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Your Name"
          placeholder="e.g. Alex"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={formErrors.name}
          leftIcon={<UserIcon className="w-4 h-4" />}
          autoFocus
        />

        <Input
          label="Your Email"
          type="email"
          placeholder="e.g. alex@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={formErrors.email}
          leftIcon={<Mail className="w-4 h-4" />}
          helperText="No password required. Used to remember your votes."
        />

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full font-semibold"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Join & Start Voting
          </Button>
        </div>
      </form>
    </div>
  );
}
