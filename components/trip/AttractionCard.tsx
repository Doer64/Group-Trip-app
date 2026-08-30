'use client';

import React, { useState } from 'react';
import { Trash2, User, ImageOff, MapPin, ExternalLink } from 'lucide-react';
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

  const totalVotes = attraction.likes + attraction.dislikes;
  const netScore = attraction.likes - attraction.dislikes;
  const approvalPercent =
    totalVotes > 0 ? Math.round((attraction.likes / totalVotes) * 100) : null;

  return (
    <div className="group relative flex flex-col bg-white rounded-3xl border border-slate-200 shadow-2xs hover:border-slate-300 interactive-card overflow-hidden text-left">
      {/* Image Banner */}
      <div className="relative w-full h-48 bg-slate-100 overflow-hidden shrink-0">
        {attraction.image_url && !imageError ? (
          <img
            src={attraction.image_url}
            alt={attraction.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-linear-to-br from-blue-50 via-slate-100 to-amber-50 text-slate-400">
            <ImageOff className="w-8 h-8 mb-1.5 opacity-60" />
            <span className="text-[11px] font-semibold text-slate-500 tracking-wide">No preview image</span>
          </div>
        )}

        {/* Proposer Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-slate-950/75 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[11px] font-semibold shadow-2xs">
          <User className="w-3 h-3 text-amber-300" />
          <span className="truncate max-w-[120px]">{attraction.added_by_name || 'Member'}</span>
        </div>

        {/* Score pill in top-right */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {totalVotes > 0 && (
            <div
              key={netScore}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-black backdrop-blur-md shadow-2xs transition-transform animate-score-pop ${
                netScore > 0
                  ? 'bg-emerald-600 text-white'
                  : netScore < 0
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-800 text-slate-200'
              }`}
            >
              {netScore > 0 ? `+${netScore}` : netScore}
            </div>
          )}

          {/* Delete Button */}
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1.5 rounded-full bg-white/90 text-slate-400 hover:text-rose-600 hover:bg-white shadow-2xs transition-all cursor-pointer opacity-80 group-hover:opacity-100 active:scale-90"
              title="Remove attraction"
              aria-label="Remove attraction"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Micro Approval Bar at bottom of photo */}
        {approvalPercent !== null && (
          <div className="absolute bottom-0 inset-x-0 h-1 bg-rose-500/80 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500 ease-out"
              style={{ width: `${approvalPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="text-base font-extrabold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
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
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-bold hover:underline"
              title="Open in Google Maps"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Map</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
            </a>
          ) : (
            <span className="text-[11px] text-slate-400">No map</span>
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
