import type { MindReflection } from '@egoless-do/core';
import { useState, useMemo, useCallback } from 'react';


/**
 * Selection + pagination state for the trail builder.
 * Owns selectedIds, trailName, page, and their derived views.
 *
 * Extracted from useQuickTrailSearch — see useQuickTrailSearch.ts for the
 * composition root. Source ref: original lines 60-64, 143-161, 425.
 */
export function useTrailSelection(reflectionsMap: Map<string, MindReflection>) {
  // ── Selection ─────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [trailName, setTrailName] = useState('');

  // ── Pagination ────────────────────────────────────────────────
  const [page, setPage] = useState(1);

  const resetPage = useCallback(() => setPage(1), []);

  // ── Selection derived ─────────────────────────────────────────
  const selectedReflections = useMemo(() => {
    return Array.from(selectedIds).map(id => reflectionsMap.get(id)).filter(Boolean) as MindReflection[];
  }, [selectedIds, reflectionsMap]);

  const selectedMoodsList = useMemo(() => {
    const sorted = [...selectedReflections].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
    const moods: string[] = [];
    let last = '';
    for (const r of sorted) {
      if (r.mood && r.mood !== last) { moods.push(r.mood); last = r.mood; }
    }
    return moods;
  }, [selectedReflections]);

  const selectedDateRange = useMemo(() => {
    if (selectedReflections.length === 0) return undefined;
    const sorted = [...selectedReflections].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
    return { start: sorted[0].timestamp, end: sorted[sorted.length - 1].timestamp };
  }, [selectedReflections]);

  return {
    selectedIds, setSelectedIds,
    trailName, setTrailName,
    page, setPage, resetPage,
    selectedReflections, selectedMoodsList, selectedDateRange,
  };
}
