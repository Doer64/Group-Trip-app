'use client';

import React from 'react';
import { AttractionWithVotes } from '@/lib/types/database.types';
import { AttractionCard } from './AttractionCard';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { MapPin } from 'lucide-react';

interface AttractionListProps {
  attractions: AttractionWithVotes[];
  isLoading: boolean;
  currentUserId?: string;
  isOrganizer?: boolean;
  onVote: (attractionId: string, voteType: 'like' | 'dislike') => void;
  onDelete?: (attractionId: string) => void;
  onOpenSearch?: () => void;
}

export function AttractionList({
  attractions,
  isLoading,
  currentUserId,
  isOrganizer = false,
  onVote,
  onDelete,
  onOpenSearch,
}: AttractionListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="flex flex-col bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-2xs"
          >
            <Skeleton className="w-full h-48 rounded-none" />
            <div className="p-4 space-y-3">
              <Skeleton className="w-3/4 h-5" />
              <Skeleton className="w-full h-4" />
              <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                <Skeleton className="w-16 h-4" />
                <Skeleton className="w-24 h-7 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (attractions.length === 0) {
    return (
      <EmptyState
        icon={<MapPin className="w-6 h-6 text-blue-600" />}
        title="No attractions proposed yet"
        description="Search for sights, museums, landmarks or top food spots and add them to your group's voting deck."
        actionLabel={onOpenSearch ? 'Add First Attraction' : undefined}
        onAction={onOpenSearch}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {attractions.map((attraction) => (
        <AttractionCard
          key={attraction.id}
          attraction={attraction}
          currentUserId={currentUserId}
          isOrganizer={isOrganizer}
          onVote={onVote}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
