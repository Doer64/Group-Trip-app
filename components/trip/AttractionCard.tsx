'use client';

import React, { useState } from 'react';
import { MapPin, Trash2, User, ExternalLink, ImageOff } from 'lucide-react';
import { AttractionWithVotes } from '@/lib/types/database.types';
import { VoteButtons } from './VoteButtons';

interface AttractionCardProps {
  attraction: AttractionWithVotes;
  currentUserId?: string;
  isOrganizer?: boolean;
  onVote: (attractionId: string, voteType: 'like' | 'dislike') => void;
  onDelete?: (attractionId: string) => void;
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
    <div className="group relative flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden text-left">
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
          <div className="w-full h-full flex flex-col items-center justify-center bg-linear-to-br from-slate-100 to-slate-200 text-slate-400">
            <ImageOff className="w-8 h-8 mb-1.5 opacity-60" />
            <span className="text-[11px] font-medium tracking-wide">No preview image</span>
          </div>
        )}

        {/* Proposer Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-slate-900/70 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[11px] font-medium shadow-xs">
          <User className="w-3 h-3 text-slate-300" />
          <span className="truncate max-w-[120px]">{attraction.added_by_name || 'Member'}</span>
        </div>

        {/* Delete Button (Proposer or Organizer) */}
        {canDelete && onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/90 text-slate-500 hover:text-rose-600 hover:bg-white shadow-xs transition-all cursor-pointer opacity-80 group-hover:opacity-100"
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
          <h4 className="text-base font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
            {attraction.name}
          </h4>

          {attraction.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              {attraction.description}
            </p>
          )}
        </div>

        {/* Card Footer: Maps Link + Vote Buttons */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
              title="Open Google Maps page"
            >
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Google Maps</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          ) : (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>Location unavailable</span>
            </span>
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
