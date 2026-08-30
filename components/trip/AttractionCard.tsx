'use client';

import React, { useState } from 'react';
import { Trash2, User, ImageOff } from 'lucide-react';
import { AttractionWithVotes } from '@/lib/types/database.types';
import { VoteButtons } from './VoteButtons';

interface AttractionCardProps {
  attraction: AttractionWithVotes;
  currentUserId?: string;
  isOrganizer?: boolean;
  onVote: (attractionId: string, voteType: 'like' | 'dislike') => void;
  onDelete?: (attractionId: string) => void;
}

function GoogleMapsIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C7.58 2 4 5.58 4 10c0 5.25 8 12 8 12s8-6.75 8-12c0-4.42-3.58-8-8-8zm0 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
      />
    </svg>
  );
}

export function AttractionCard({
  attraction,
  currentUserId,
  isOrganizer = false,
  onVote,
  onDelete,
}: AttractionCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete =
    isOrganizer || (currentUserId && attraction.added_by_user_id === currentUserId);

  // Compute direct Google Maps link to the attraction page
  const mapsUrl =
    attraction.place_uri ||
    (attraction.place_id
      ? `https://www.google.com/maps/place/?q=place_id:${attraction.place_id}`
      : attraction.location
      ? `https://www.google.com/maps/search/?api=1&query=${attraction.location.lat},${attraction.location.lng}`
      : null);

  const handleDelete = async () => {
    if (!onDelete) return;
    if (confirm(`Remove "${attraction.name}" from the trip?`)) {
      setIsDeleting(true);
      await onDelete(attraction.id);
      setIsDeleting(false);
    }
  };

  return (
    <div className="group relative flex flex-col bg-white/90 rounded-3xl border border-indigo-100 shadow-sm shadow-indigo-100/70 hover:shadow-xl hover:shadow-indigo-200/40 hover:-translate-y-1 transition-all duration-200 overflow-hidden text-left">
      {/* Image Banner */}
      <div className="relative w-full h-48 bg-slate-100 overflow-hidden shrink-0">
        {attraction.image_url && !imageError ? (
          <img
            src={attraction.image_url}
            alt={attraction.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-linear-to-br from-violet-100 to-cyan-100 text-indigo-400">
            <ImageOff className="w-8 h-8 mb-1.5 opacity-60" />
            <span className="text-[11px] font-medium tracking-wide">No preview image</span>
          </div>
        )}

        {/* Proposer Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-indigo-950/75 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[11px] font-bold shadow-sm">
          <User className="w-3 h-3 text-amber-200" />
          <span className="truncate max-w-[120px]">{attraction.added_by_name || 'Member'}</span>
        </div>

        {/* Delete Button (Proposer or Organizer) */}
        {canDelete && onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/90 text-indigo-400 hover:text-rose-600 hover:bg-white shadow-sm transition-all cursor-pointer opacity-80 group-hover:opacity-100"
            title="Remove attraction"
            aria-label="Remove attraction"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="text-base font-black text-indigo-950 line-clamp-1 group-hover:text-violet-600 transition-colors">
            {attraction.name}
          </h4>

          {attraction.description && (
            <p className="text-xs text-indigo-500 mt-1 line-clamp-2 leading-relaxed">
              {attraction.description}
            </p>
          )}
        </div>

        {/* Card Footer: Maps Link + Vote Buttons */}
        <div className="mt-4 pt-3 border-t border-indigo-50 flex items-center justify-between gap-2">
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-xl bg-cyan-500 hover:bg-cyan-600 active:scale-95 text-white flex items-center justify-center shadow-sm transition-all hover:shadow cursor-pointer shrink-0"
              title="Open in Google Maps"
              aria-label="Open in Google Maps"
            >
              <GoogleMapsIcon className="w-4 h-4" />
            </a>
          ) : (
            <div
              className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-200 flex items-center justify-center cursor-not-allowed shrink-0"
              title="Location unavailable"
              aria-label="Location unavailable"
            >
              <GoogleMapsIcon className="w-4 h-4" />
            </div>
          )}

          <VoteButtons
            likes={attraction.likes}
            dislikes={attraction.dislikes}
            myVote={attraction.myVote}
            onVote={(type) => onVote(attraction.id, type)}
          />
        </div>
      </div>
    </div>
  );
}
