import fuzzysort from 'fuzzysort';

export type DestinationEntry = {
  type: 'city' | 'country';
  name: string;
  country: string;
  population: number;
  aliases: string[];
};

export type PreparedDestinationEntry = DestinationEntry & {
  aliasesText: string;
};

let cachedDestinations: PreparedDestinationEntry[] = [];
let isReady = false;

self.onmessage = async (e: MessageEvent) => {
  const { type, payload, id } = e.data;

  if (type === 'INIT') {
    if (isReady) {
      self.postMessage({ type: 'INIT_DONE' });
      return;
    }
    
    try {
      const res = await fetch(payload.url);
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
      const rawData: DestinationEntry[] = await res.json();
      
      cachedDestinations = rawData.map(entry => ({
        ...entry,
        aliasesText: Array.isArray(entry.aliases) && entry.aliases.length > 0
          ? entry.aliases.join(' ')
          : '',
      }));
      
      // Pre-prepare strings so the first search is instant
      cachedDestinations.forEach(obj => {
        // fuzzysort caches prepared strings on the object using these exact keys
        // @ts-ignore
        obj['fuzzysort_prepared_name'] = fuzzysort.prepare(obj.name);
        // @ts-ignore
        obj['fuzzysort_prepared_aliasesText'] = fuzzysort.prepare(obj.aliasesText);
      });
      
      isReady = true;
      self.postMessage({ type: 'INIT_DONE' });
    } catch (err) {
      console.error('Worker INIT error:', err);
      self.postMessage({ type: 'INIT_ERROR', error: String(err) });
    }
  } else if (type === 'SEARCH') {
    if (!isReady || !payload.query || payload.query.length < 2) {
      self.postMessage({ type: 'SEARCH_RESULT', id, suggestions: [] });
      return;
    }
    
    const results = fuzzysort.go(payload.query, cachedDestinations, {
      keys: ['name', 'aliasesText'],
      limit: 8,
      threshold: -10000,
    });
    
    const suggestions = results.map(r => r.obj);
    self.postMessage({ type: 'SEARCH_RESULT', id, suggestions });
  }
};
