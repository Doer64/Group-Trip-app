'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import fuzzysort from 'fuzzysort';

export type DestinationEntry = {
  type: 'city' | 'country';
  name: string;
  country: string;
  population: number;
  aliases: string[];
};

type SearchIndexItem = {
  text: string;
  entryIndex: number;
};

// In-memory module cache so data is loaded only once across the entire session
let cachedDestinations: DestinationEntry[] | null = null;
let cachedSearchIndex: SearchIndexItem[] | null = null;
let fetchPromise: Promise<void> | null = null;

async function loadDestinationsData(): Promise<void> {
  if (cachedDestinations && cachedSearchIndex) return;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const res = await fetch('/data/destinations.json');
      if (!res.ok) {
        throw new Error(`Failed to load destinations: ${res.status}`);
      }
      const data: DestinationEntry[] = await res.json();
      cachedDestinations = data;

      const index: SearchIndexItem[] = [];
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        index.push({ text: item.name, entryIndex: i });

        if (item.aliases && Array.isArray(item.aliases)) {
          for (const alias of item.aliases) {
            if (alias && alias !== item.name) {
              index.push({ text: alias, entryIndex: i });
            }
          }
        }
      }
      cachedSearchIndex = index;
    } catch (err) {
      console.error('Error loading destinations.json:', err);
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

export function useDestinationSuggestions() {
  const [isDataLoaded, setIsDataLoaded] = useState(
    cachedDestinations !== null && cachedSearchIndex !== null
  );
  const [suggestions, setSuggestions] = useState<DestinationEntry[]>([]);
  const isFetchingRef = useRef(false);

  // Eagerly prefetch or prepare index on hook mount
  useEffect(() => {
    if (!cachedDestinations && !isFetchingRef.current) {
      isFetchingRef.current = true;
      loadDestinationsData().then(() => {
        setIsDataLoaded(true);
        isFetchingRef.current = false;
      });
    }
  }, []);

  const search = useCallback((query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || !cachedDestinations || !cachedSearchIndex) {
      setSuggestions([]);
      return;
    }

    const results = fuzzysort.go(trimmed, cachedSearchIndex, {
      key: 'text',
      limit: 40,
      threshold: -10000,
    });

    const seen = new Set<number>();
    const matchedEntries: DestinationEntry[] = [];

    for (const r of results) {
      const idx = r.obj.entryIndex;
      if (!seen.has(idx)) {
        seen.add(idx);
        matchedEntries.push(cachedDestinations[idx]);
        if (matchedEntries.length >= 8) break;
      }
    }

    setSuggestions(matchedEntries);
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  const ensureDataLoaded = useCallback(() => {
    if (!cachedDestinations && !isFetchingRef.current) {
      isFetchingRef.current = true;
      loadDestinationsData().then(() => {
        setIsDataLoaded(true);
        isFetchingRef.current = false;
      });
    }
  }, []);

  return {
    suggestions,
    isDataLoaded,
    search,
    clearSuggestions,
    ensureDataLoaded,
  };
}
