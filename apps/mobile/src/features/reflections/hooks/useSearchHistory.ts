import { useState, useEffect, useCallback } from 'react';

import { safeGetItem, safeSetItem } from '../../../store/safeAsyncStorage';

const SEARCH_HISTORY_KEY = 'quickTrailSearchHistory';
const MAX_HISTORY = 10;

/** Persisted search history hook — isolated from search/selection logic. */
export function useSearchHistory() {
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  useEffect(() => {
    safeGetItem(SEARCH_HISTORY_KEY).then(v => {
      if (v) try { setSearchHistory(JSON.parse(v)); } catch { /* corrupted cache — ignore */ }
    }).catch(() => {});
  }, []);

  const addToHistory = useCallback((query: string) => {
    setSearchHistory(prev => {
      const next = [query, ...prev.filter(h => h !== query)].slice(0, MAX_HISTORY);
      safeSetItem(SEARCH_HISTORY_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { searchHistory, addToHistory };
}
