'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle, Compass, Sparkles, ArrowRight, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/components/ui/Toast';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;
  const { user, isAuthenticated, isLoading: isAuthLoading } = useCurrentUser();
  const { error: toastError, success } = useToast();

  const [tripData, setTripData] = useState<{
    tripId: string;
    destination: string;
    creatorName: string;
    isMember: boolean;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (!token || isAuthLoading) return;

    fetch(`/api/trips/by-invite/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.error) {
          setError(data.error.message || 'Invalid or expired invite link');
        } else if (data?.tripId) {
          if (data.isMember) {
            // Already a member, redirect to trip board directly
            window.location.href = `/trip/${data.tripId}`;
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
  }, [token, isAuthLoading]);

  const handleJoinTrip = async () => {
    if (!tripData) return;

    setIsJoining(true);
    try {
      const res = await fetch(`/api/trips/${tripData.tripId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok) {
        toastError(data?.error?.message || 'Failed to join trip');
        return;
      }

      success(`Welcome to the ${tripData.destination} trip!`);
      window.location.href = `/trip/${tripData.tripId}`;
    } catch (err: any) {
      toastError(err.message || 'Network error joining trip');
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading || isAuthLoading) {
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

  // Unified invite card — same layout for logged-in and logged-out users
  const loginRedirect = `/login?redirect=${encodeURIComponent(`/invite/${token}`)}&message=${encodeURIComponent(`You were invited to a trip to ${tripData.destination}! Log in so your friends know who you are`)}`;

  return (
    <div className="py-8 flex items-center justify-center">
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm max-w-md w-full mx-auto text-center">
        <div className="mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            You&apos;re invited to a trip!
          </h2>
          <div className="mt-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-lg font-bold text-slate-900">
              {tripData.destination}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Organized by <span className="font-semibold text-slate-700">{tripData.creatorName}</span>
            </p>
          </div>
        </div>

        {isAuthenticated && user ? (
          // Logged in — show "Jump in!" button
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Ready to join, <span className="font-semibold">{user.name}</span>?
            </p>
            <Button
              variant="primary"
              size="lg"
              className="w-full font-semibold"
              isLoading={isJoining}
              onClick={handleJoinTrip}
              rightIcon={<Rocket className="w-4 h-4" />}
            >
              Jump in!
            </Button>
          </div>
        ) : (
          // Not logged in — show sign-in prompt
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              But first, log in so your friends know who you are
            </p>
            <Link href={loginRedirect} className="block">
              <Button
                variant="primary"
                size="lg"
                className="w-full font-semibold"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In to Join
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
