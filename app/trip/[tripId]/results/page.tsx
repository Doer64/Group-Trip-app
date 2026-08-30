'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { useTrip } from '@/hooks/useTrip';
import { TripHeader } from '@/components/trip/TripHeader';
import { ResultsList } from '@/components/trip/ResultsList';
import { FlightLoader } from '@/components/ui/FlightLoader';
import { RankedAttraction } from '@/lib/types/database.types';

export default function TripResultsPage() {
  const params = useParams();
  const tripId = params?.tripId as string;

  const { trip, isLoading: isTripLoading } = useTrip(tripId);
  const [results, setResults] = useState<RankedAttraction[]>([]);
  const [totalParticipants, setTotalParticipants] = useState(1);
  const [totalVotes, setTotalVotes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) return;

    fetch(`/api/trips/${tripId}/results`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.error) {
          setError(data.error.message || 'Failed to load results');
        } else {
          setResults(data.results || []);
          setTotalParticipants(data.totalParticipants || 1);
          setTotalVotes(data.totalVotes || 0);
        }
      })
      .catch((err) => {
        setError(err.message || 'Network error loading results');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [tripId]);

  if (isTripLoading || isLoading) {
    return (
      <FlightLoader
        label="Tallying group votes..."
        sublabel="Ranking First Class picks and final consensus"
      />
    );
  }

  if (error || !trip) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-900/5">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Results Unavailable</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          {error || 'Unable to calculate trip leaderboard.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left">
      <TripHeader trip={trip} attractionCount={results.length} />

      <ResultsList
        results={results}
        totalParticipants={totalParticipants}
        totalVotes={totalVotes}
        destination={trip.destination}
      />
    </div>
  );
}
