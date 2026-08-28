'use client';

import { useState, useEffect, useCallback } from 'react';
import { TripWithDetails } from '@/lib/types/database.types';

export function useTrip(tripId: string) {
  const [trip, setTrip] = useState<TripWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrip = useCallback(async () => {
    if (!tripId) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/trips/${tripId}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error?.message || 'Failed to load trip');
        setTrip(null);
      } else {
        setTrip(data.trip);
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching trip');
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  return {
    trip,
    isLoading,
    error,
    refetch: fetchTrip,
  };
}
