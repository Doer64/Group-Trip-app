'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { useTrip } from '@/hooks/useTrip';
import { useAttractions } from '@/hooks/useAttractions';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { TripHeader } from '@/components/trip/TripHeader';
import { PlacesSearchBar } from '@/components/trip/PlacesSearchBar';
import { AttractionList } from '@/components/trip/AttractionList';
import { JoinTripForm } from '@/components/trip/JoinTripForm';

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

  if (isTripLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="text-sm font-medium">Loading trip board...</span>
      </div>
    );
  }

  // If user is not a member (403 forbidden)
  if (tripError && tripError.includes('not a member')) {
    return (
      <div className="py-12 flex items-center justify-center">
        <JoinTripForm
          tripId={tripId}
          destination="this trip"
          creatorName="the organizer"
        />
      </div>
    );
  }

  if (tripError || !trip) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4 bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs">
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

      {/* Places Search Bar */}
      <div className="max-w-2xl">
        <PlacesSearchBar
          tripId={trip.id}
          destination={trip.destination}
          onAddAttraction={addAttraction}
        />
      </div>

      {/* Attractions Grid */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Proposed Attractions
          </h2>
          <span className="text-xs font-medium text-slate-400">
            {attractions.length} {attractions.length === 1 ? 'place' : 'places'} • Live Voting
          </span>
        </div>

        <AttractionList
          attractions={attractions}
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
