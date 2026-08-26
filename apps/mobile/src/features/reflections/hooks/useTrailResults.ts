
import { buildIndex, retrieveTopK } from '@egoless-do/core';
import type { MindReflection, SmartQueryResult, SmartQueryFilters, TrailFilters } from '@egoless-do/core';
import { useState, useRef, useEffect, useCallback } from 'react';

export type MatchMode = 'idle' | 'local' | 'ai' | 'ai-loading';

/**
 * Search-result state + debounced local search.
 * Owns matchMode, matchResults, smartResult, aiDegraded.
 *
 * candidates and searchQuery are injected from useTrailFilters so this hook
 * does not re-derive the candidate pool. addToHistory is injected so the
 * debounced path can record successful local searches.
 *
 * Extracted from useQuickTrailSearch — see useQuickTrailSearch.ts for composition.
 * Source ref: original lines 54-57, 124-140, 211-226, 419-427, 453-460.
 */
export function useTrailResults(
  candidates: MindReflection[],
  searchQuery: string,
  _filters: TrailFilters,
  addToHistory: (q: string) => void,
) {
  const [matchMode, setMatchMode] = useState<MatchMode>('idle');
  const [matchResults, setMatchResults] = useState<MindReflection[]>([]);
  const [smartResult, setSmartResult] = useState<SmartQueryResult | null>(null);
  const [aiDegraded, setAiDegraded] = useState(false);

  // ── Debounced search (local only, AI on-demand) ────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = searchQuery.trim();
      if (!trimmed) {
        setMatchMode('idle');
        setMatchResults([]);
        return;
      }
      const index = buildIndex(candidates);
      const scored = retrieveTopK(trimmed, index, 20);
      const results = scored.map(s => candidates.find(r => r.id === s.index.id)).filter(Boolean) as MindReflection[];
      setMatchResults(results);
      setMatchMode(results.length > 0 ? 'local' : 'idle');
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, candidates]);

  // ── Actions ────────────────────────────────────────────────────
  const handleLocalSearch = useCallback(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setMatchMode('idle');
      setMatchResults([]);
      setSmartResult(null);
      return;
    }
    const index = buildIndex(candidates);
    const scored = retrieveTopK(trimmed, index, 20);
    const results = scored.map(s => candidates.find(r => r.id === s.index.id)).filter(Boolean) as MindReflection[];
    setMatchResults(results);
    setMatchMode(results.length > 0 ? 'local' : 'idle');
    setSmartResult(null);
    if (results.length > 0) addToHistory(trimmed);
  }, [searchQuery, candidates, addToHistory]);

  // Clears smartResult.filters entries that correspond to a removed filter.
  // Called by the composition root alongside useTrailFilters.handleRemoveFilter.
  const clearSmartFilters = useCallback((type: keyof SmartQueryFilters, value?: string) => {
    setSmartResult(prev => {
      if (!prev?.filters) return prev;
      const updated = { ...prev.filters };
      if (type === 'tags' && value) updated.tags = (updated.tags ?? []).filter(t => t !== value);
      else if (type === 'moods' && value) updated.moods = (updated.moods ?? []).filter(m => m !== value);
      else if (type === 'timeRange') updated.timeRange = undefined;
      return { ...prev, filters: updated };
    });
  }, []);

  const reset = useCallback(() => {
    setMatchMode('idle');
    setMatchResults([]);
    setSmartResult(null);
    setAiDegraded(false);
  }, []);

  const resetMatchState = useCallback(() => {
    setMatchMode('idle');
    setMatchResults([]);
  }, []);

  return {
    // state
    matchMode, setMatchMode,
    matchResults, setMatchResults,
    smartResult, setSmartResult,
    aiDegraded, setAiDegraded,
    // actions
    handleLocalSearch, clearSmartFilters,
    reset, resetMatchState,
  };
}
