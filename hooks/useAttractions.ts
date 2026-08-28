'use client';

import { useState, useEffect, useCallback } from 'react';
import { AttractionWithVotes } from '@/lib/types/database.types';
import { supabase } from '@/lib/supabase/client';

export function useAttractions(tripId: string) {
  const [attractions, setAttractions] = useState<AttractionWithVotes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAttractions = useCallback(async () => {
    if (!tripId) return;
    try {
      const res = await fetch(`/api/trips/${tripId}/attractions`);
      const data = await res.json();

      if (res.ok) {
        setAttractions(data.attractions || []);
        setError(null);
      } else {
        setError(data?.error?.message || 'Failed to load attractions');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchAttractions();
  }, [fetchAttractions]);

  // Real-time listener for attractions & votes updates
  useEffect(() => {
    if (!tripId) return;

    const channel = supabase
      .channel(`trip-${tripId}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attractions',
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          fetchAttractions();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          fetchAttractions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, fetchAttractions]);

  // Add attraction with optimistic update
  const addAttraction = useCallback(
    async (attractionData: {
      name: string;
      description?: string;
      imageUrl?: string;
      photoRef?: string;
      placeId?: string;
      location?: { lat: number; lng: number };
      placeUri?: string;
    }) => {
      try {
        const res = await fetch(`/api/trips/${tripId}/attractions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(attractionData),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error?.message || 'Failed to add attraction');
        }

        // Add to local state if not already received from realtime
        setAttractions((prev) => {
          if (prev.some((a) => a.id === data.attraction.id)) return prev;
          return [...prev, data.attraction];
        });

        return { success: true, attraction: data.attraction };
      } catch (err: any) {
        return { success: false, error: err.message || 'Error adding attraction' };
      }
    },
    [tripId]
  );

  // Delete attraction with optimistic removal
  const deleteAttraction = useCallback(
    async (attractionId: string) => {
      const prevAttractions = [...attractions];
      setAttractions((prev) => prev.filter((a) => a.id !== attractionId));

      try {
        const res = await fetch(`/api/trips/${tripId}/attractions/${attractionId}`, {
          method: 'DELETE',
        });

        const data = await res.json();
        if (!res.ok) {
          // Rollback
          setAttractions(prevAttractions);
          throw new Error(data?.error?.message || 'Failed to delete attraction');
        }

        return { success: true };
      } catch (err: any) {
        setAttractions(prevAttractions);
        return { success: false, error: err.message || 'Error deleting attraction' };
      }
    },
    [tripId, attractions]
  );

  // Optimistic Vote Handler
  const castVote = useCallback(
    async (attractionId: string, voteType: 'like' | 'dislike') => {
      const target = attractions.find((a) => a.id === attractionId);
      if (!target) return { success: false, error: 'Attraction not found' };

      const prevVote = target.myVote;
      const prevLikes = target.likes;
      const prevDislikes = target.dislikes;

      // Calculate optimistic new state
      let newVote: 'like' | 'dislike' | null = voteType;
      let newLikes = prevLikes;
      let newDislikes = prevDislikes;

      if (prevVote === voteType) {
        // Toggle OFF
        newVote = null;
        if (voteType === 'like') newLikes = Math.max(0, prevLikes - 1);
        if (voteType === 'dislike') newDislikes = Math.max(0, prevDislikes - 1);
      } else if (prevVote === null) {
        // New vote
        if (voteType === 'like') newLikes = prevLikes + 1;
        if (voteType === 'dislike') newDislikes = prevDislikes + 1;
      } else {
        // Switch vote
        if (voteType === 'like') {
          newLikes = prevLikes + 1;
          newDislikes = Math.max(0, prevDislikes - 1);
        } else {
          newDislikes = prevDislikes + 1;
          newLikes = Math.max(0, prevLikes - 1);
        }
      }

      // Apply optimistic update immediately
      setAttractions((prev) =>
        prev.map((attr) =>
          attr.id === attractionId
            ? {
                ...attr,
                likes: newLikes,
                dislikes: newDislikes,
                myVote: newVote,
              }
            : attr
        )
      );

      try {
        const res = await fetch(
          `/api/trips/${tripId}/attractions/${attractionId}/votes`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voteType }),
          }
        );

        const data = await res.json();
        if (!res.ok) {
          // Rollback on server error
          setAttractions((prev) =>
            prev.map((attr) =>
              attr.id === attractionId
                ? {
                    ...attr,
                    likes: prevLikes,
                    dislikes: prevDislikes,
                    myVote: prevVote,
                  }
                : attr
            )
          );
          throw new Error(data?.error?.message || 'Failed to submit vote');
        }

        // Sync with verified server count
        setAttractions((prev) =>
          prev.map((attr) =>
            attr.id === attractionId
              ? {
                  ...attr,
                  likes: data.likes,
                  dislikes: data.dislikes,
                  myVote: data.myVote,
                }
              : attr
          )
        );

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Voting failed' };
      }
    },
    [tripId, attractions]
  );

  return {
    attractions,
    isLoading,
    error,
    addAttraction,
    deleteAttraction,
    castVote,
    refetch: fetchAttractions,
  };
}
