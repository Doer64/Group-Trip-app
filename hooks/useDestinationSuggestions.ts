'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type DestinationEntry = {
  type: 'city' | 'country';
  name: string;
  country: string;
  population: number;
  aliases: string[];
};

// Singleton worker instance
let workerInstance: Worker | null = null;
let isWorkerReady = false;
let initPromise: Promise<void> | null = null;
let searchIdCounter = 0;

// Callbacks for pending searches
const searchCallbacks = new Map<number, (results: DestinationEntry[]) => void>();

function getWorker(): Worker {
  if (typeof window === 'undefined') {
    throw new Error('Worker cannot be created on the server');
  }
  
  if (!workerInstance) {
    // Next.js 13+ standard Web Worker instantiation
    workerInstance = new Worker(new URL('./destination.worker.ts', import.meta.url), {
      type: 'module', // Optional in most cases, but good for ES modules
    });
    
    workerInstance.onmessage = (e) => {
      const { type, id, suggestions } = e.data;
      if (type === 'SEARCH_RESULT' && searchCallbacks.has(id)) {
        searchCallbacks.get(id)!(suggestions);
        searchCallbacks.delete(id);
      } else if (type === 'INIT_DONE') {
        isWorkerReady = true;
      }
    };
  }
  return workerInstance;
}

function initWorkerData(): Promise<void> {
  if (isWorkerReady) return Promise.resolve();
  if (initPromise) return initPromise;
  
  initPromise = new Promise((resolve, reject) => {
    try {
      const worker = getWorker();
      
      const handleMessage = (e: MessageEvent) => {
        if (e.data.type === 'INIT_DONE') {
          isWorkerReady = true;
          worker.removeEventListener('message', handleMessage);
          resolve();
        } else if (e.data.type === 'INIT_ERROR') {
          worker.removeEventListener('message', handleMessage);
          reject(new Error(e.data.error));
        }
      };
      
      worker.addEventListener('message', handleMessage);
      worker.postMessage({ 
        type: 'INIT', 
        payload: { url: window.location.origin + '/data/destinations.json' } 
      });
    } catch (err) {
      reject(err);
    }
  });
  
  return initPromise;
}

export function useDestinationSuggestions() {
  const [isDataLoaded, setIsDataLoaded] = useState(isWorkerReady);
  const [suggestions, setSuggestions] = useState<DestinationEntry[]>([]);
  const isFetchingRef = useRef(false);
  const latestSearchIdRef = useRef(-1);

  // Eagerly load and prepare index in the background worker on mount
  useEffect(() => {
    if (!isWorkerReady && !isFetchingRef.current && typeof window !== 'undefined') {
      isFetchingRef.current = true;
      initWorkerData()
        .then(() => {
          setIsDataLoaded(true);
          isFetchingRef.current = false;
        })
        .catch(err => {
          console.error('Failed to init worker data:', err);
          isFetchingRef.current = false;
        });
    }
  }, []);

  const search = useCallback((query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || !isWorkerReady) {
      setSuggestions([]);
      return;
    }

    const worker = getWorker();
    const id = ++searchIdCounter;
    latestSearchIdRef.current = id;

    searchCallbacks.set(id, (results) => {
      // Only set suggestions if this is the latest search we requested
      if (latestSearchIdRef.current === id) {
        setSuggestions(results);
      }
    });

    worker.postMessage({ type: 'SEARCH', id, payload: { query: trimmed } });
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  const ensureDataLoaded = useCallback(() => {
    if (!isWorkerReady && !isFetchingRef.current && typeof window !== 'undefined') {
      isFetchingRef.current = true;
      initWorkerData()
        .then(() => {
          setIsDataLoaded(true);
          isFetchingRef.current = false;
        })
        .catch(console.error);
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
