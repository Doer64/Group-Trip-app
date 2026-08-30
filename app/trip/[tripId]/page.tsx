'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle, Compass, ShieldX } from 'lucide-react';
import { useTrip } from '@/hooks/useTrip';
import { useAttractions } from '@/hooks/useAttractions';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { TripHeader } from '@/components/trip/TripHeader';
import { PlacesSearchBar } from '@/components/trip/PlacesSearchBar';
import { AttractionList } from '@/components/trip/AttractionList';
import { Button } from '@/components/ui/Button';

export default function TripBoardPage() {
  const params = useParams();
  const tripId = params?.tripId as string;

  const { trip, isLoading: isTripLoading, error: tripError } = useTrip(tripId);
  const {
    attractions,
    isLoading: isAttractionsLoading,
    addAttraction,
    deleteAttraction,
    castVote,
  } = useAttractions(tripId);
  const { user } = useCurrentUser();

  const [sortBy, setSortBy] = useState<'newest' | 'score' | 'least_voted'>('newest');

  const sortedAttractions = useMemo(() => {
    return [...attractions].sort((a, b) => {
      if (sortBy === 'score') {
        const scoreA = a.likes - a.dislikes;
        const scoreB = b.likes - b.dislikes;
        if (scoreA !== scoreB) return scoreB - scoreA;
      } else if (sortBy === 'least_voted') {
        const votesA = a.likes + a.dislikes;
        const votesB = b.likes + b.dislikes;
        if (votesA !== votesB) return votesA - votesB;
      }

      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return timeB - timeA;
    });
  }, [attractions, sortBy]);

  if (isTripLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm font-medium">Loading voting board...</span>
      </div>
    );
  }

  // If user is not a member (403 forbidden) or not authenticated (401)
  if (tripError && (tripError.includes('not a member') || tripError.includes('UNAUTHORIZED') || tripError.includes('Unauthorized'))) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto text-center space-y-4 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-900/5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldX className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            You&apos;re not a member of this trip yet
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Ask the trip organizer to share their invite link with you.
          </p>
          <div className="pt-4">
            <Link href="/">
              <Button variant="primary" size="md" leftIcon={<Compass className="w-4 h-4" />}>
                Go to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (tripError || !trip) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-900/5">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Unable to Load Trip</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          {tripError || 'Trip not found or you may not have access.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left">
      {/* Trip Header Banner */}
      <TripHeader trip={trip} attractionCount={attractions.length} />

      {/* Pitch Console */}
      <div className="w-full relative">
        <PlacesSearchBar
          tripId={trip.id}
          destination={trip.destination}
          onAddAttraction={addAttraction}
        />
      </div>

      {/* Attractions Grid */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              The Contenders
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-xs font-extrabold text-blue-700">
              {attractions.length} {attractions.length === 1 ? 'place' : 'places'}
            </span>
          </div>

          {attractions.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="sort-select" className="text-xs font-bold text-slate-500">
                Sort by:
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 cursor-pointer shadow-2xs"
              >
                <option value="newest">Recently Added</option>
                <option value="score">Highest Score</option>
                <option value="least_voted">Least Voted</option>
              </select>
            </div>
          )}
        </div>

        <AttractionList
          attractions={sortedAttractions}
          isLoading={isAttractionsLoading}
          currentUserId={user?.id}
          isOrganizer={trip.isCreator}
          onVote={castVote}
          onDelete={deleteAttraction}
        />
      </div>
    </div>
  );
}
