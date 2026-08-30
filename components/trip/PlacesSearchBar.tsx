'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, MapPin, ExternalLink, Loader2, Check, Sparkles } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PlaceSearchResult } from '@/lib/types/database.types';
import { useToast } from '../ui/Toast';

interface PlacesSearchBarProps {
  tripId: string;
  destination: string;
  onAddAttraction: (data: {
    name: string;
    description?: string;
    photoRef?: string;
    imageUrl?: string;
    placeId?: string;
    location?: { lat: number; lng: number };
    placeUri?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export function PlacesSearchBar({
  tripId,
  destination,
  onAddAttraction,
}: PlacesSearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [addedPlaceIds, setAddedPlaceIds] = useState<Set<string>>(new Set());
  const [addingPlaceId, setAddingPlaceId] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { success, error: toastError } = useToast();

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsSearching(true);
    setSearchError(null);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/trips/${tripId}/places?query=${encodeURIComponent(query.trim())}`
        );
        const data = await res.json();

        if (res.ok) {
          setResults(data.places || []);
          if (data.places?.length === 0) {
            setSearchError(`No places found for "${query}". Try different keywords.`);
          }
        } else {
          setSearchError(
            data?.error?.message || 'Unable to search places. Please try again.'
          );
          setResults([]);
        }
      } catch (err: any) {
        setSearchError('Network error searching places');
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, tripId]);

  const handleAdd = async (place: PlaceSearchResult) => {
    setAddingPlaceId(place.placeId);
    const photoUrl = place.photoRef
      ? `/api/places/photo?photoRef=${encodeURIComponent(place.photoRef)}`
      : undefined;

    const res = await onAddAttraction({
      name: place.name,
      description: place.formattedAddress,
      photoRef: place.photoRef,
      imageUrl: photoUrl,
      placeId: place.placeId,
      location: place.location,
      placeUri: place.placeUri,
    });

    setAddingPlaceId(null);

    if (res.success) {
      setAddedPlaceIds((prev) => new Set(prev).add(place.placeId));
      success(`Added "${place.name}" to the trip board!`);
    } else {
      toastError(res.error || 'Failed to add place');
    }
  };

  return (
    <>
      {/* Search trigger bar */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-white/90 hover:bg-white border border-violet-100 rounded-3xl shadow-md shadow-violet-100/60 hover:shadow-lg hover:-translate-y-0.5 transition-all text-indigo-400 group cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-violet-600 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-transform">
            <Search className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className="block text-sm font-black text-indigo-900">
              Pitch an attraction in {destination}
            </span>
            <span className="block text-[11px] text-indigo-400">
              Museums, food, landmarks—whatever earns the group’s vote.
            </span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-100 text-xs font-black text-violet-700">
          <Plus className="w-3.5 h-3.5" />
          <span>Add Attraction</span>
        </div>
      </button>

      {/* Modal Dialog */}
      <Modal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setQuery('');
          setResults([]);
        }}
        title={`Search Attractions in ${destination}`}
        description="Find somewhere great and add it to the group’s highly scientific voting board."
        maxWidth="lg"
      >
        <div className="space-y-4 text-left">
          {/* Search Input Box */}
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-violet-400 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`e.g. Colosseum, Louvre Museum, Best Gelato...`}
              className="w-full bg-violet-50/60 border border-violet-100 rounded-2xl py-3 pl-10 pr-10 text-sm text-indigo-950 placeholder:text-indigo-300 focus:bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all"
            />
            {isSearching && (
              <Loader2 className="absolute right-3.5 w-4 h-4 text-slate-400 animate-spin" />
            )}
          </div>

          {/* Results List */}
          <div className="mt-2 divide-y divide-indigo-50 max-h-[380px] overflow-y-auto">
            {isSearching && results.length === 0 && (
              <div className="py-8 flex flex-col items-center justify-center text-indigo-400 text-xs gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                <span>Searching Google Places in {destination}...</span>
              </div>
            )}

            {!isSearching && searchError && (
              <div className="py-6 text-center text-xs text-indigo-500 bg-violet-50 rounded-2xl p-4">
                {searchError}
              </div>
            )}

            {!isSearching && !searchError && query.length < 2 && (
              <div className="py-8 flex flex-col items-center justify-center text-center text-indigo-400 text-xs">
                <Sparkles className="w-6 h-6 text-amber-400 mb-2" />
                <span>Type a place or category and uncover a contender.</span>
              </div>
            )}

            {results.map((place) => {
              const isAdded = addedPlaceIds.has(place.placeId);
              const isAdding = addingPlaceId === place.placeId;
              const photoUrl = place.photoRef
                ? `/api/places/photo?photoRef=${encodeURIComponent(place.photoRef)}&maxWidth=160`
                : null;

              return (
                <div
                  key={place.placeId}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-violet-50/60 p-2 rounded-2xl transition-colors"
                >
                  {/* Photo thumbnail */}
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 overflow-hidden shrink-0 border border-indigo-100">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={place.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-indigo-300">
                        <MapPin className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  {/* Title & address */}
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-black text-indigo-950 truncate">
                      {place.name}
                    </h5>
                    {place.formattedAddress && (
                      <p className="text-xs text-indigo-500 truncate mt-0.5">
                        {place.formattedAddress}
                      </p>
                    )}
                    {place.placeUri && (
                      <a
                        href={place.placeUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:underline mt-1"
                      >
                        <span>View on Google Maps</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>

                  {/* Add Action */}
                  <Button
                    size="sm"
                    variant={isAdded ? 'secondary' : 'primary'}
                    isLoading={isAdding}
                    disabled={isAdded || isAdding}
                    onClick={() => handleAdd(place)}
                    leftIcon={isAdded ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Plus className="w-3.5 h-3.5" />}
                  >
                    {isAdded ? 'Added' : 'Add'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>
    </>
  );
}
