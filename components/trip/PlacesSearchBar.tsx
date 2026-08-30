'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  MapPin,
  ExternalLink,
  Loader2,
  Check,
  X,
  Sparkles,
  PenLine,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
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

const CATEGORIES = [
  { label: '🏛️ Sights', query: 'Top sights and landmarks' },
  { label: '🍕 Food & Eats', query: 'Best restaurants and food' },
  { label: '☕ Cafes', query: 'Best coffee shops and cafes' },
  { label: '🌿 Parks & Views', query: 'Scenic parks and viewpoints' },
  { label: '🍸 Bars & Nightlife', query: 'Bars and nightlife' },
  { label: '🎭 Museums', query: 'Museums and art galleries' },
  { label: '🛍️ Markets', query: 'Local markets and shopping' },
];

export function PlacesSearchBar({
  tripId,
  destination,
  onAddAttraction,
}: PlacesSearchBarProps) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [addedPlaceIds, setAddedPlaceIds] = useState<Set<string>>(new Set());
  const [addingPlaceId, setAddingPlaceId] = useState<string | null>(null);
  const [isResultsOpen, setIsResultsOpen] = useState(false);

  // Custom spot modal state
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { success, error: toastError } = useToast();

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setIsResultsOpen(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/trips/${tripId}/places?query=${encodeURIComponent(searchQuery.trim())}`
        );
        const data = await res.json();

        if (res.ok) {
          setResults(data.places || []);
          if (data.places?.length === 0) {
            setSearchError(`No spots found for "${searchQuery}".`);
          }
        } else {
          setSearchError(
            data?.error?.message || 'Unable to find spots right now.'
          );
          setResults([]);
        }
      } catch (err: any) {
        setSearchError('Network error searching spots.');
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setActiveCategory(null);
    handleSearch(val);
  };

  const handleCategoryClick = (cat: typeof CATEGORIES[0]) => {
    if (activeCategory === cat.label) {
      setActiveCategory(null);
      setQuery('');
      setResults([]);
      setIsResultsOpen(false);
      return;
    }

    setActiveCategory(cat.label);
    setQuery(cat.query);
    handleSearch(cat.query);
  };

  const handleClear = () => {
    setQuery('');
    setActiveCategory(null);
    setResults([]);
    setIsResultsOpen(false);
    inputRef.current?.focus();
  };

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
      success(`Pitched "${place.name}" to the board!`);
    } else {
      const isDuplicate =
        res.error &&
        (res.error.includes('already exists') ||
          res.error.includes('duplicate') ||
          res.error.includes('unique_trip_place') ||
          res.error.includes('Place already in trip') ||
          res.error.includes('23505'));

      toastError(isDuplicate ? 'Place already in trip' : res.error || 'Failed to add place');
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      toastError('Please enter a spot name');
      return;
    }

    setIsAddingCustom(true);
    const res = await onAddAttraction({
      name: customName.trim(),
      description: customDesc.trim() || undefined,
      imageUrl: customImageUrl.trim() || undefined,
    });

    setIsAddingCustom(false);

    if (res.success) {
      success(`Pitched "${customName.trim()}" to the board!`);
      setCustomName('');
      setCustomDesc('');
      setCustomImageUrl('');
      setIsCustomOpen(false);
    } else {
      const isDuplicate =
        res.error &&
        (res.error.includes('already exists') ||
          res.error.includes('duplicate') ||
          res.error.includes('unique_trip_place') ||
          res.error.includes('Place already in trip') ||
          res.error.includes('23505'));

      toastError(isDuplicate ? 'Place already in trip' : res.error || 'Failed to pitch custom spot');
    }
  };

  const showResultsDeck = isResultsOpen && (results.length > 0 || isSearching || searchError);

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 text-left transition-all duration-200">
      {/* Search Input Bar & Custom Spot Action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1 flex items-center">
          <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
            {isSearching ? (
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={onInputChange}
            onFocus={() => {
              if (results.length > 0 || query.length >= 2) {
                setIsResultsOpen(true);
              }
            }}
            placeholder={`Search spots, food, sights in ${destination}...`}
            className="w-full h-11 bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
          />

          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3.5 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Custom Spot Trigger Button */}
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={() => setIsCustomOpen(true)}
          leftIcon={<PenLine className="w-4 h-4 text-blue-600" />}
        >
          Custom Spot
        </Button>
      </div>

      {/* Category Pills Row (Horizontally Scrollable on Mobile) */}
      <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 touch-pan-x scrollbar-none">
        {CATEGORIES.map((cat) => {
          const isSelected = activeCategory === cat.label;
          return (
            <button
              key={cat.label}
              type="button"
              onClick={() => handleCategoryClick(cat)}
              className={`h-8 inline-flex items-center px-3 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer select-none active:scale-95 ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Live Results Deck (Inline Expandable) */}
      {showResultsDeck && (
        <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Deck Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-900">
                {isSearching
                  ? `Searching spots in ${destination}...`
                  : `${results.length} ${results.length === 1 ? 'spot found' : 'spots found'}`}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsResultsOpen(false)}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-semibold p-1 cursor-pointer"
            >
              <span>Hide</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search State / Error */}
          {searchError && !isSearching && (
            <div className="py-6 px-4 text-center text-xs text-slate-600 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center gap-2">
              <span>{searchError}</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setCustomName(query);
                  setIsCustomOpen(true);
                }}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Pitch &ldquo;{query}&rdquo; as Custom Spot
              </Button>
            </div>
          )}

          {/* Results Grid: 1 col on mobile, 2 cols on tablet+ */}
          {results.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
              {results.map((place, index) => {
                const isAdded = addedPlaceIds.has(place.placeId);
                const isAdding = addingPlaceId === place.placeId;
                const photoUrl = place.photoRef
                  ? `/api/places/photo?photoRef=${encodeURIComponent(place.photoRef)}&maxWidth=180`
                  : null;

                return (
                  <div
                    key={place.placeId}
                    className={`flex flex-col justify-between p-3 rounded-2xl border transition-all animate-card-reveal ${
                      isAdded
                        ? 'bg-emerald-50/50 border-emerald-200 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                    style={{ animationDelay: `${Math.min(index * 35, 200)}ms` }}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Photo Thumbnail */}
                      <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={place.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <MapPin className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                          {place.name}
                        </h5>
                        {place.formattedAddress && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {place.formattedAddress}
                          </p>
                        )}
                        {place.placeUri && (
                          <a
                            href={place.placeUri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline font-bold mt-1"
                          >
                            <span>Google Maps</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="mt-3 pt-2 border-t border-slate-100/80 flex items-center justify-end">
                      <Button
                        size="sm"
                        variant={isAdded ? 'secondary' : 'primary'}
                        isLoading={isAdding}
                        disabled={isAdded || isAdding}
                        onClick={() => handleAdd(place)}
                        leftIcon={
                          isAdded ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Plus className="w-3.5 h-3.5" />
                          )
                        }
                        className={`text-xs ${
                          isAdded
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 animate-success-burst'
                            : ''
                        }`}
                      >
                        {isAdded ? 'Pitched' : 'Pitch Spot'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Custom Spot Modal */}
      <Modal
        isOpen={isCustomOpen}
        onClose={() => setIsCustomOpen(false)}
        title="Pitch a Custom Spot"
        description={`Secret rooftop, local hideaway, or group activity in ${destination}? Put it on the radar.`}
      >
        <form onSubmit={handleCustomSubmit} className="space-y-4 text-left">
          <Input
            label="Spot or Activity Name"
            placeholder="e.g. Sunset drinks on rooftop, Private boat tour..."
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            required
            autoFocus
          />

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Description / Notes (Optional)
            </label>
            <textarea
              value={customDesc}
              onChange={(e) => setCustomDesc(e.target.value)}
              placeholder="Why should the group do this? Any timing or booking details..."
              rows={3}
              className="w-full bg-white border border-slate-200 rounded-2xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          <Input
            label="Photo Image URL (Optional)"
            placeholder="https://images.unsplash.com/..."
            value={customImageUrl}
            onChange={(e) => setCustomImageUrl(e.target.value)}
          />

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCustomOpen(false)}
              disabled={isAddingCustom}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isAddingCustom}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Pitch Spot
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
