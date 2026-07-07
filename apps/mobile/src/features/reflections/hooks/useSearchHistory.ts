import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback } from 'react';

const SEARCH_HISTORY_KEY = 'quickTrailSearchHistory';
const MAX_HISTORY = 10;

/** Persisted search history hook — isolated from search/selection logic. */
export function useSearchHistory() {
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(SEARCH_HISTORY_KEY).then(v => {
      if (v) try { setSearchHistory(JSON.parse(v)); } catch {}
    }).catch(() => {});
  }, []);

  const addToHistory = useCallback((query: string) => {
    setSearchHistory(prev => {
      const next = [query, ...prev.filter(h => h !== query)].slice(0, MAX_HISTORY);
      AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { searchHistory, addToHistory };
}
