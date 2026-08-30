'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { DestinationInput } from './DestinationInput';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '../ui/Toast';

interface TripCreateFormProps {
  onSuccess?: (tripId: string) => void;
}

export function TripCreateForm({ onSuccess }: TripCreateFormProps) {
  const router = useRouter();
  const { isAuthenticated } = useCurrentUser();
  const { error: toastError } = useToast();

  const [destination, setDestination] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    // Gate: must be logged in
    if (!isAuthenticated) {
      router.push('/login?redirect=/&message=Sign in to create your trip');
      return;
    }

    const errors: Record<string, string> = {};
    if (!destination.trim()) errors.destination = 'Destination is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: destination.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login?redirect=/&message=Sign in to create your trip');
          return;
        }
        toastError(data?.error?.message || 'Failed to create trip');
        return;
      }

      if (onSuccess) {
        onSuccess(data.tripId);
      } else {
        window.location.href = `/trip/${data.tripId}`;
      }
    } catch (err: any) {
      toastError(err.message || 'Network error creating trip');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <DestinationInput
        label="Where are you traveling to?"
        placeholder="e.g. Rome, Paris, Tokyo, Barcelona..."
        value={destination}
        onChange={(val) => setDestination(val)}
        error={formErrors.destination}
        autoFocus
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
          {isAuthenticated ? 'Create Trip & Get Invite Link' : 'Sign In & Create Trip'}
        </Button>
      </div>
    </form>
  );
}
