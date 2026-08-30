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
      <div className="max-w-md mx-auto py-16 text-center space-y-4 bg-white/90 p-8 rounded-[2rem] border border-white shadow-xl shadow-indigo-100">
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
    <div className="py-8 flex items-center justify-center min-h-[58vh]">
      <div className="bg-white/90 rounded-[2rem] border border-white p-6 sm:p-8 shadow-xl shadow-indigo-200/50 max-w-md w-full mx-auto text-center relative overflow-hidden">
        <div className="absolute -top-5 -right-3 text-7xl opacity-10 rotate-12">🎉</div>
        <div className="mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-violet-600 flex items-center justify-center mx-auto mb-4 shadow-sm rotate-[-6deg]">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-indigo-950">
            You&apos;re on the list!
          </h2>
          <div className="mt-4 bg-linear-to-br from-violet-50 to-cyan-50 rounded-2xl p-4 border border-violet-100">
            <p className="text-lg font-black text-indigo-950">
              {tripData.destination}
            </p>
            <p className="text-xs text-indigo-500 mt-1">
              Dreamed up by <span className="font-bold text-indigo-800">{tripData.creatorName}</span>
            </p>
          </div>
        </div>

        {isAuthenticated && user ? (
          // Logged in — show "Jump in!" button
          <div className="space-y-3">
            <p className="text-sm text-indigo-600">
              Ready to join, <span className="font-semibold">{user.name}</span>?
            </p>
            <Button
              variant="primary"
              size="lg"
              className="w-full font-black"
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
            <p className="text-sm text-indigo-600">
              First, introduce yourself so the crew knows who just joined.
            </p>
            <Link href={loginRedirect} className="block">
              <Button
                variant="primary"
                size="lg"
                className="w-full font-black"
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
