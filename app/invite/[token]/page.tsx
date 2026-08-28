'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle, Compass } from 'lucide-react';
import { JoinTripForm } from '@/components/trip/JoinTripForm';
import { Button } from '@/components/ui/Button';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [tripData, setTripData] = useState<{
    tripId: string;
    destination: string;
    creatorName: string;
    isMember: boolean;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    fetch(`/api/trips/by-invite/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.error) {
          setError(data.error.message || 'Invalid or expired invite link');
        } else if (data?.tripId) {
          if (data.isMember) {
            // Already a member, redirect to trip board directly
            router.replace(`/trip/${data.tripId}`);
            return;
          }
          setTripData(data);
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load invite link');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token, router]);

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="text-sm font-medium">Validating invite link...</span>
      </div>
    );
  }

  if (error || !tripData) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4 bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Invite Link Not Found</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          {error || 'This invite link may have expired or is invalid.'}
        </p>
        <div className="pt-4">
          <Link href="/">
            <Button variant="primary" size="md" leftIcon={<Compass className="w-4 h-4" />}>
              Go to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 flex items-center justify-center">
      <JoinTripForm
        tripId={tripData.tripId}
        destination={tripData.destination}
        creatorName={tripData.creatorName}
      />
    </div>
  );
}
