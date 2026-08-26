
import {
  computeCandidatePool,
  isAIRecommendAvailable,
} from '@egoless-do/core';
import type { MindReflection, SmartQueryFilters, TrailFilters } from '@egoless-do/core';
import { useState, useMemo, useCallback } from 'react';

export type TimeRange = 'week' | 'month' | '3months' | 'all';

/**
 * Filter state + derived candidate pool for the trail builder.
 * Owns searchQuery, timeRange, selectedTags, selectedMoods + the
 * reflections-derived maps (tags/moods/candidates).
 *
 * handleRemoveFilter only touches OWN filter state; the composition root
 * also calls useTrailResults.clearSmartFilters for smartResult.
 *
 * Extracted from useQuickTrailSearch. Source ref: original lines 39-119, 189-209.
 */
export function useTrailFilters(reflections: MindReflection[], initialText: string) {
  // ── Filters ───────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState(initialText);
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);

  // ── Data ───────────────────────────────────────────────────────
  const reflectionsMap = useMemo(() => {
    const map = new Map<string, MindReflection>();
    for (const r of reflections) map.set(r.id, r);
    return map;
  }, [reflections]);

  const userTags = useMemo(() => {
    const tags = new Set<string>();
    for (const r of reflections) {
      if (r.tags) for (const t of r.tags) tags.add(t);
    }
    return Array.from(tags).sort();
  }, [reflections]);

  const userMoods = useMemo(() => {
    const moods = new Set<string>();
    for (const r of reflections) {
      if (r.mood) moods.add(r.mood);
    }
    return Array.from(moods).sort();
  }, [reflections]);

  const aiAvailable = useMemo(() => isAIRecommendAvailable(), []);

  const filters: TrailFilters = useMemo(() => ({
    timeRange,
    tags: selectedTags.length > 0 ? selectedTags : [],
    moods: selectedMoods.length > 0 ? selectedMoods : [],
  }), [timeRange, selectedTags, selectedMoods]);

  const candidates = useMemo(() =>
    computeCandidatePool(reflections, filters),
    [reflections, filters],
  );

  // ── Actions ────────────────────────────────────────────────────
  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => {
      const isRemoving = prev.includes(tag);
      setSearchQuery(q => {
        if (isRemoving) return q.replace(new RegExp(`(?:^|\\s)${tag}(?=\\s|$)`, 'g'), '').replace(/\s+/g, ' ').trim();
        return q ? `${q} ${tag}` : tag;
      });
      return isRemoving ? prev.filter(t => t !== tag) : [...prev, tag];
    });
  }, []);

  const toggleMood = useCallback((mood: string) => {
    setSelectedMoods(prev => {
      const isRemoving = prev.includes(mood);
      setSearchQuery(q => {
        if (isRemoving) return q.replace(new RegExp(`(?:^|\\s)${mood}(?=\\s|$)`, 'g'), '').replace(/\s+/g, ' ').trim();
        return q ? `${q} ${mood}` : mood;
      });
      return isRemoving ? prev.filter(m => m !== mood) : [...prev, mood];
    });
  }, []);

  // Only clears this layer's filter state; smartResult is owned by useTrailResults.
  const handleRemoveFilter = useCallback((type: keyof SmartQueryFilters, value?: string) => {
    if (type === 'tags' && value) {
      setSelectedTags(prev => prev.filter(t => t !== value));
    } else if (type === 'moods' && value) {
      setSelectedMoods(prev => prev.filter(m => m !== value));
    } else if (type === 'timeRange') {
      setTimeRange('month');
    }
  }, []);

  const resetQuery = useCallback(() => {
    setSearchQuery('');
  }, []);

  const resetFilters = useCallback(() => {
    setTimeRange('month');
    setSelectedTags([]);
    setSelectedMoods([]);
    setSearchQuery('');
  }, []);

  return {
    searchQuery, setSearchQuery,
    timeRange, setTimeRange,
    selectedTags, setSelectedTags,
    selectedMoods, setSelectedMoods,
    reflectionsMap, userTags, userMoods, aiAvailable,
    filters, candidates,
    toggleTag, toggleMood,
    handleRemoveFilter, resetQuery, resetFilters,
  };
}
