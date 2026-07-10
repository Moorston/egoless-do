import { ensureOrderContains, TAGS_PRESET, MOODS, REFLECTION_CATEGORIES, dateStr, formatDate, formatTime } from '@egoless-do/core';
import {
  filterReflections, groupReflectionsByDate, computeDynamicTagCounts, computeDynamicMoodCounts,
  computeMoodTrend, computeWritingHeatmap, computeTagCooccurrence,
  computeSmartCollections, DEFAULT_REFLECTION_FILTERS,
  type MindReflection, type SmartCollection,
  type ReflectionFilters, type MoodTrendPoint, type HeatmapDay, type TagGraph,
} from '@egoless-do/core';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Share } from 'react-native';

import { useAppStore, useShallowStore } from '../../../store/useAppStore';


/** Debounce hook */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useReflections() {
  const {
    reflectionFilters, setReflectionFilters, habits, reflections,
    customTags, allTagsOrder, customMoods, allMoodsOrder, planItems,
  } = useShallowStore(s => ({
    reflectionFilters: s.reflectionFilters,
    setReflectionFilters: s.setReflectionFilters,
    habits: s.habits,
    reflections: s.reflections,
    customTags: s.customTags,
    allTagsOrder: s.allTagsOrder,
    customMoods: s.customMoods,
    allMoodsOrder: s.allMoodsOrder,
    planItems: s.planItems,
  }));

  // ── Filter state (from store, persisted) ────────────────────
  const filters = reflectionFilters ?? { ...DEFAULT_REFLECTION_FILTERS };
  const setFilters = setReflectionFilters;

  // Local search input with debounce
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const inputSourceRef = useRef<'user' | 'sync'>('sync');

  // Sync debounced search back to filters (only when user typed)
  useEffect(() => {
    if (inputSourceRef.current === 'user' && debouncedSearch !== filters.search) {
      setFilters(prev => ({ ...prev, search: debouncedSearch }));
    }
  }, [debouncedSearch]);

  // Sync filters.search to local input when filters change externally (not from user typing)
  useEffect(() => {
    if (inputSourceRef.current === 'sync' && filters.search !== searchInput) {
      setSearchInput(filters.search);
    }
    inputSourceRef.current = 'sync';
  }, [filters.search]);

  // ── UI state (not persisted) ────────────────────────────────
  const [showDeletedTags, setShowDeletedTags] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showInsights, setShowInsights] = useState(false);
  const [insightsTab, setInsightsTab] = useState<'stats' | 'heatmap' | 'mood' | 'tags'>('stats');
  const [moodTrendDays, setMoodTrendDays] = useState(30);

  // ── Tag options ──────────────────────────────────────────────
  const habitTags = useMemo(() =>
    (habits ?? []).filter(h => !h.deleted && h.createTag).map(h => `#${h.name}`),
    [habits],
  );

  const allTags = useMemo(() => {
    const reflTags = [...new Set((reflections ?? []).filter(r => !r.deleted).flatMap(r => r.tags ?? []))];
    const allAvailable = [...new Set([...reflTags, ...habitTags])];
    const order = allTagsOrder ?? [];
    if (order.length > 0) {
      const ordered = order.filter(t => allAvailable.includes(t));
      const remaining = allAvailable.filter(t => !order.includes(t));
      return [...ordered, ...remaining];
    }
    const customSet = new Set(customTags ?? []);
    const customInUse = (customTags ?? []).filter(t => allAvailable.includes(t));
    const others = allAvailable.filter(t => !customSet.has(t));
    return [...customInUse, ...others];
  }, [reflections, customTags, allTagsOrder, habitTags]);

  const allUsedTags = useMemo(() => {
    const reflTags = [...new Set((reflections ?? []).filter(r => !r.deleted).flatMap(r => r.tags ?? []))];
    return [...new Set([...reflTags, ...habitTags])];
  }, [reflections, habitTags]);

  const deletedTagsWithData = useMemo(() => {
    const availableSet = new Set(allTags);
    return allUsedTags.filter(t => !availableSet.has(t));
  }, [allTags, allUsedTags]);

  const visibleTags = showDeletedTags ? allUsedTags : allTags;

  const allTagOptions = useMemo(() => {
    const required = [...TAGS_PRESET, ...(customTags ?? [])];
    const order = allTagsOrder ?? [];
    const effective = order.length > 0 ? ensureOrderContains(order, required) : required;
    return [...effective, ...habitTags];
  }, [allTagsOrder, customTags, habitTags]);

  const allMoodOptions = useMemo(() => {
    const required = [...MOODS, ...(customMoods ?? [])];
    const order = allMoodsOrder ?? [];
    return order.length > 0 ? ensureOrderContains(order, required) : required;
  }, [allMoodsOrder, customMoods]);

  // ── Smart collections ───────────────────────────────────────
  const smartCollections = useMemo<SmartCollection[]>(
    () => computeSmartCollections(reflections ?? []),
    [reflections],
  );

  // ── Filtered reflections (using core function) ──────────────
  const filtered = useMemo(() => {
    let result = filterReflections(reflections ?? [], filters, planItems);
    if (filters.collectionId) {
      const col = smartCollections.find(c => c.id === filters.collectionId);
      if (col) result = result.filter(col.filter);
    }
    return result;
  }, [reflections, filters, smartCollections, planItems]);

  const byDay = useMemo(
    () => groupReflectionsByDate(filtered),
    [filtered],
  );

  // ── Dynamic counts (based on other active filters) ──────────
  const dynamicTagCounts = useMemo(
    () => computeDynamicTagCounts(reflections ?? [], filters),
    [reflections, filters.moods, filters.search, filters.dateRange, filters.hasLink, filters.hasLinkedTask],
  );

  const dynamicMoodCounts = useMemo(
    () => computeDynamicMoodCounts(reflections ?? [], filters),
    [reflections, filters.tags, filters.search, filters.dateRange, filters.hasLink, filters.hasLinkedTask],
  );

  // ── Stats ────────────────────────────────────────────────────
  const totalCount = (reflections ?? []).filter(r => !r.deleted).length;

  const topTag = useMemo(() => {
    const counts: Record<string, number> = {};
    (reflections ?? []).filter(r => !r.deleted).forEach(r =>
      (r.tags ?? []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }),
    );
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] ?? '-';
  }, [reflections]);

  const streakDays = useMemo(() => {
    const dates = [...new Set(
      (reflections ?? []).filter(r => !r.deleted).map(r =>
        dateStr(new Date(r.timestamp ?? 0)),
      ),
    )].sort().reverse();
    let streak = 0;
    let current = new Date(); // eslint-disable-line prefer-const
    for (const d of dates) {
      const expected = dateStr(current);
      if (d === expected) { streak++; current.setDate(current.getDate() - 1); }
      else break;
    }
    return streak;
  }, [reflections]);

  const sparklineData = useMemo(() => {
    const today = new Date();
    const data: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = dateStr(d);
      const count = (reflections ?? []).filter(r =>
        !r.deleted && dateStr(new Date(r.timestamp ?? 0)) === ds,
      ).length;
      data.push(count);
    }
    return data;
  }, [reflections]);

  const moodStats = useMemo(() => {
    const counts: Record<string, number> = {};
    (reflections ?? []).filter(r => !r.deleted).forEach(r => {
      if (r.mood) counts[r.mood] = (counts[r.mood] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [reflections]);

  const allMoods = useMemo(() => {
    return [...new Set((reflections ?? []).filter(r => !r.deleted).map(r => r.mood).filter(Boolean))] as string[];
  }, [reflections]);

  // ── Analytics ────────────────────────────────────────────────
  const moodTrend = useMemo<MoodTrendPoint[]>(
    () => computeMoodTrend(reflections ?? [], moodTrendDays),
    [reflections, moodTrendDays],
  );

  const heatmapData = useMemo<HeatmapDay[]>(
    () => computeWritingHeatmap(reflections ?? [], 20),
    [reflections],
  );

  const tagGraph = useMemo<TagGraph>(
    () => computeTagCooccurrence(reflections ?? []),
    [reflections],
  );

  const tagFrequency = useMemo(() => {
    const counts: Record<string, number> = {};
    (reflections ?? []).filter(r => !r.deleted).forEach(r =>
      (r.tags ?? []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }),
    );
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [reflections]);

  // ── Filter actions (use functional updater to avoid stale closures) ──
  const toggleTag = useCallback((tag: string) => {
    setFilters(prev => {
      const tags = prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag];
      return { ...prev, tags, collectionId: undefined };
    });
  }, [setFilters]);

  const toggleMood = useCallback((mood: string) => {
    if (!mood) {
      setFilters(prev => ({ ...prev, moods: [], collectionId: undefined }));
      return;
    }
    setFilters(prev => {
      const moods = prev.moods.includes(mood) ? prev.moods.filter(m => m !== mood) : [...prev.moods, mood];
      return { ...prev, moods, collectionId: undefined };
    });
  }, [setFilters]);

  const setDateRange = useCallback((from?: number, to?: number) => {
    setFilters(prev => ({
      ...prev,
      dateRange: from !== undefined ? { from, to: to ?? Date.now() } : undefined,
      collectionId: undefined,
    }));
  }, [setFilters]);

  const setHasLink = useCallback((v?: boolean) => {
    setFilters(prev => ({ ...prev, hasLink: v, collectionId: undefined }));
  }, [setFilters]);

  const setHasLinkedTask = useCallback((v?: boolean) => {
    setFilters(prev => ({ ...prev, hasLinkedTask: v, collectionId: undefined }));
  }, [setFilters]);

  const applyCollection = useCallback((col: SmartCollection) => {
    setFilters(prev => ({ ...prev, collectionId: col.id, tags: [], moods: [] }));
  }, [setFilters]);

  const clearAllFilters = useCallback(() => {
    inputSourceRef.current = 'user';
    setSearchInput('');
    setFilters({ ...DEFAULT_REFLECTION_FILTERS });
  }, [setFilters]);

  const removeFilter = useCallback((key: string, value?: string) => {
    if (key === 'search') {
      inputSourceRef.current = 'user';
      setSearchInput('');
      setFilters(prev => ({ ...prev, search: '' }));
    } else if (key === 'tag' && value) {
      setFilters(prev => ({ ...prev, tags: prev.tags.filter(t => t !== value), collectionId: undefined }));
    } else if (key === 'mood' && value) {
      setFilters(prev => ({ ...prev, moods: prev.moods.filter(m => m !== value), collectionId: undefined }));
    } else if (key === 'dateRange') {
      setFilters(prev => ({ ...prev, dateRange: undefined, datePreset: undefined, collectionId: undefined }));
    } else if (key === 'hasLink') {
      setFilters(prev => ({ ...prev, hasLink: undefined, collectionId: undefined }));
    } else if (key === 'hasLinkedTask') {
      setFilters(prev => ({ ...prev, hasLinkedTask: undefined, collectionId: undefined }));
    } else if (key === 'collectionId') {
      setFilters(prev => ({ ...prev, collectionId: undefined }));
    }
  }, [setFilters]);

  // ── Active filters list for display ──────────────────────────
  const activeFilters = useMemo(() => {
    const list: { key: string; label: string; value?: string }[] = [];
    if (filters.search) list.push({ key: 'search', label: `搜索: ${filters.search}` });
    filters.tags.forEach(t => list.push({ key: 'tag', label: t, value: t }));
    filters.moods.forEach(m => list.push({ key: 'mood', label: m, value: m }));
    if (filters.dateRange) {
      const from = formatDate(new Date(filters.dateRange.from), 'zh', { month: 'short', day: 'numeric' });
      const to = formatDate(new Date(filters.dateRange.to), 'zh', { month: 'short', day: 'numeric' });
      list.push({ key: 'dateRange', label: `${from} - ${to}` });
    }
    if (filters.hasLink) list.push({ key: 'hasLink', label: '有链接' });
    if (filters.hasLinkedTask) list.push({ key: 'hasLinkedTask', label: '关联任务' });
    if (filters.collectionId) {
      const col = smartCollections.find(c => c.id === filters.collectionId);
      if (col) list.push({ key: 'collectionId', label: col.name });
    }
    return list;
  }, [filters, smartCollections]);

  const hasActiveFilters = activeFilters.length > 0;

  // ── Actions ──────────────────────────────────────────────────
  const toggleCardExpand = useCallback((id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleShare = useCallback(async (r: MindReflection, mode?: 'text' | 'image') => {
    try {
      if (mode === 'image') {
        // Return the reflection for ShareCard to handle
        return { type: 'image', reflection: r };
      }
      const tagsStr = r.tags?.length ? `\n🏷️ ${r.tags.join(' ')}` : '';
      const moodStr = r.mood ? `\n💭 ${r.mood}` : '';
      const linkStr = r.link ? `\n🔗 ${r.link}` : '';
      const timeStr = formatDate(new Date(r.timestamp ?? 0), 'zh', { year: 'numeric', month: 'long', day: 'numeric' });
      await Share.share({
        message: `「${r.content}」${tagsStr}${moodStr}${linkStr}\n\n📅 ${timeStr}\n— 来自心流纪 · Egoless Do\nhttps://egoless-do.app`,
      });
      return { type: 'text' };
    } catch { /* Share API unavailable — ignore */ }
  }, []);

  return {
    // Filter state
    filters, setFilters,
    searchInput, setSearchInput: (v: string) => { inputSourceRef.current = 'user'; setSearchInput(v); },
    showDeletedTags, setShowDeletedTags,
    expandedCards, showInsights, setShowInsights,
    insightsTab, setInsightsTab,
    moodTrendDays, setMoodTrendDays,

    // Filter actions
    toggleTag, toggleMood, setDateRange, setHasLink, setHasLinkedTask,
    applyCollection, clearAllFilters, removeFilter,
    activeFilters, hasActiveFilters,

    // Data
    allTags, allUsedTags, deletedTagsWithData, visibleTags,
    allTagOptions, allMoodOptions, habitTags,
    filtered, byDay,
    dynamicTagCounts, dynamicMoodCounts,
    totalCount, topTag, streakDays,
    sparklineData, moodStats, allMoods,

    // Analytics
    moodTrend, heatmapData, tagGraph, smartCollections, tagFrequency,

    // Actions
    toggleCardExpand, handleShare,
  };
}
