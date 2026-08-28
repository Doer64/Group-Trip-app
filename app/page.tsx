'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Compass, Sparkles, ArrowRight, MapPin, Calendar, Users, KeyRound } from 'lucide-react';
import { TripCreateForm } from '@/components/trip/TripCreateForm';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Trip } from '@/lib/types/database.types';

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useCurrentUser();
  const [userTrips, setUserTrips] = useState<Trip[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      setIsLoadingTrips(true);
      fetch('/api/users/me')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.trips) {
            setUserTrips(data.trips);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingTrips(false));
    } else {
      setUserTrips([]);
    }
  }, [isAuthenticated]);

  const handleJoinWithCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    // Handle full URL or plain token
    let token = inviteCode.trim();
    if (token.includes('/invite/')) {
      token = token.split('/invite/')[1].split('?')[0];
    }
    router.push(`/invite/${token}`);
  };

  return (
    <div className="space-y-12 text-left">
      {/* Hero Section */}
      <section className="text-center py-6 sm:py-10 max-w-2xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200/60 text-slate-700 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Democratic Group Decisions</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          Plan group trips together, without the chaos.
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto">
          Propose sights, vote with simple thumbs up or down, and let collective consensus build your group&apos;s dream itinerary.
        </p>
      </section>

      {/* Main Grid: Create Form + Quick Join / Trips */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Create New Trip Form */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Start a New Trip</h2>
              <p className="text-xs text-slate-500">Pick a destination and invite your travel crew</p>
            </div>
          </div>

          <TripCreateForm />
        </div>

        {/* Right Column: Active Trips & Invite Code */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Invite Code Box */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Have an Invite Link or Code?</h3>
            </div>
            <form onSubmit={handleJoinWithCode} className="flex gap-2">
              <Input
                placeholder="Paste code or link..."
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="text-xs"
              />
              <Button type="submit" size="md" variant="secondary">
                Join
              </Button>
            </form>
          </div>

          {/* User's Active Trips */}
          {isAuthenticated && (
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-600" />
                  <h3 className="text-sm font-bold text-slate-900">Your Trips</h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">{userTrips.length} active</span>
              </div>

              {isLoadingTrips ? (
                <div className="space-y-2 py-4">
                  <div className="w-full h-12 bg-slate-100 animate-pulse rounded-xl" />
                  <div className="w-full h-12 bg-slate-100 animate-pulse rounded-xl" />
                </div>
              ) : userTrips.length > 0 ? (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
                  {userTrips.map((trip) => (
                    <Link
                      key={trip.id}
                      href={`/trip/${trip.id}`}
                      className="group flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-200 transition-all text-left"
                    >
                      <div className="min-w-0 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/60 flex items-center justify-center text-slate-600 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-colors shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <span className="block text-sm font-bold text-slate-900 group-hover:text-indigo-600 truncate transition-colors">
                            {trip.destination}
                          </span>
                          <span className="block text-[11px] text-slate-400">
                            {new Date(trip.created_at || '').toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-3 text-center">
                  You haven&apos;t joined any trips yet. Create one above!
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
