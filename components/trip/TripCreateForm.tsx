'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Compass, Mail, User as UserIcon, ArrowRight } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { DestinationInput } from './DestinationInput';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '../ui/Toast';

interface TripCreateFormProps {
  onSuccess?: (tripId: string) => void;
}

export function TripCreateForm({ onSuccess }: TripCreateFormProps) {
  const router = useRouter();
  const { user, saveUserLocally } = useCurrentUser();
  const { error: toastError } = useToast();

  const [destination, setDestination] = useState('');
  const [organizerName, setOrganizerName] = useState(user?.name || '');
  const [organizerEmail, setOrganizerEmail] = useState(user?.email || '');
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Sync user state if loaded after initial mount
  React.useEffect(() => {
    if (user) {
      if (!organizerName) setOrganizerName(user.name);
      if (!organizerEmail) setOrganizerEmail(user.email);
    }
  }, [user, organizerName, organizerEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const errors: Record<string, string> = {};
    if (!destination.trim()) errors.destination = 'Destination is required';
    if (!organizerEmail.trim()) errors.organizerEmail = 'Your email is required';
    if (!organizerName.trim()) errors.organizerName = 'Your name is required';

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
          creatorEmail: organizerEmail.trim(),
          creatorName: organizerName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toastError(data?.error?.message || 'Failed to create trip');
        return;
      }

      if (data.user) {
        saveUserLocally(data.user);
      }

      if (onSuccess) {
        onSuccess(data.tripId);
      } else {
        router.push(`/trip/${data.tripId}`);
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
        <Input
          label="Your Name"
          placeholder="e.g. Dean"
          value={organizerName}
          onChange={(e) => setOrganizerName(e.target.value)}
          error={formErrors.organizerName}
          leftIcon={<UserIcon className="w-4 h-4" />}
        />

        <Input
          label="Your Email"
          type="email"
          placeholder="e.g. dean@example.com"
          value={organizerEmail}
          onChange={(e) => setOrganizerEmail(e.target.value)}
          error={formErrors.organizerEmail}
          leftIcon={<Mail className="w-4 h-4" />}
          helperText="No password needed"
        />
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full font-semibold"
          isLoading={isLoading}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Create Trip & Get Invite Link
        </Button>
      </div>
    </form>
  );
}
