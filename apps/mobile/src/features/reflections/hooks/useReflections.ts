import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Share } from 'react-native';
import { useAppStore } from '../../../store/useAppStore';
import { ensureOrderContains, TAGS_PRESET, MOODS, REFLECTION_CATEGORIES, dateStr } from '@egoless-do/core';
import {
  filterReflections, groupReflectionsByDate, computeDynamicTagCounts, computeDynamicMoodCounts,
  computeMoodTrend, computeWritingHeatmap, computeTagCooccurrence,
  computeSmartCollections, type SmartCollection,
  type ReflectionFilters, DEFAULT_REFLECTION_FILTERS,
  type MoodTrendPoint, type HeatmapDay, type TagGraph,
} from '@egoless-do/core';

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
  const store = useAppStore();

  // ── Filter state (from store, persisted) ────────────────────
  const filters = store.reflectionFilters ?? { ...DEFAULT_REFLECTION_FILTERS };
  const setFilters = store.setReflectionFilters;

  // Local search input with debounce
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  // Sync debounced search back to filters
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      setFilters(prev => ({ ...prev, search: debouncedSearch }));
    }
  }, [debouncedSearch, setFilters, filters.search]);

  // Sync filters.search to local input when filters change externally
  useEffect(() => {
    if (filters.search !== searchInput) {
      setSearchInput(filters.search);
    }
  }, [filters.search]);

  // ── UI state (not persisted) ────────────────────────────────
  const [showDeletedTags, setShowDeletedTags] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showInsights, setShowInsights] = useState(false);
  const [insightsTab, setInsightsTab] = useState<'stats' | 'heatmap' | 'mood' | 'tags'>('stats');
  const [moodTrendDays, setMoodTrendDays] = useState(30);

  // ── Tag options ──────────────────────────────────────────────
  const habitTags = useMemo(() =>
    (store.habits ?? []).filter(h => !h.deleted && h.createTag).map(h => `#${h.name}`),
    [store.habits],
  );

  const allTags = useMemo(() => {
    const reflTags = [...new Set((store.reflections ?? []).filter(r => !r.deleted).flatMap(r => r.tags ?? []))];
    const allAvailable = [...new Set([...reflTags, ...habitTags])];
    const order = store.allTagsOrder ?? [];
    if (order.length > 0) {
      const ordered = order.filter(t => allAvailable.includes(t));
      const remaining = allAvailable.filter(t => !order.includes(t));
      return [...ordered, ...remaining];
    }
    const customSet = new Set(store.customTags ?? []);
    const customInUse = (store.customTags ?? []).filter(t => allAvailable.includes(t));
    const others = allAvailable.filter(t => !customSet.has(t));
    return [...customInUse, ...others];
  }, [store.reflections, store.customTags, store.allTagsOrder, habitTags]);

  const allUsedTags = useMemo(() => {
    const reflTags = [...new Set((store.reflections ?? []).filter(r => !r.deleted).flatMap(r => r.tags ?? []))];
    return [...new Set([...reflTags, ...habitTags])];
  }, [store.reflections, habitTags]);

  const deletedTagsWithData = useMemo(() => {
    const availableSet = new Set(allTags);
    return allUsedTags.filter(t => !availableSet.has(t));
  }, [allTags, allUsedTags]);

  const visibleTags = showDeletedTags ? allUsedTags : allTags;

  const allTagOptions = useMemo(() => {
    const required = [...TAGS_PRESET, ...(store.customTags ?? [])];
    const order = store.allTagsOrder ?? [];
    const effective = order.length > 0 ? ensureOrderContains(order, required) : required;
    return [...effective, ...habitTags];
  }, [store.allTagsOrder, store.customTags, habitTags]);

  const allMoodOptions = useMemo(() => {
    const required = [...MOODS, ...(store.customMoods ?? [])];
    const order = store.allMoodsOrder ?? [];
    return order.length > 0 ? ensureOrderContains(order, required) : required;
  }, [store.allMoodsOrder, store.customMoods]);

  // ── Smart collections ───────────────────────────────────────
  const smartCollections = useMemo<SmartCollection[]>(
    () => computeSmartCollections(store.reflections ?? []),
    [store.reflections],
  );

  // ── Filtered reflections (using core function) ──────────────
  const filtered = useMemo(() => {
    let result = filterReflections(store.reflections ?? [], filters, store.planItems);
    if (filters.collectionId) {
      const col = smartCollections.find(c => c.id === filters.collectionId);
      if (col) result = result.filter(col.filter);
    }
    return result;
  }, [store.reflections, filters, smartCollections, store.planItems]);

  const byDay = useMemo(
    () => groupReflectionsByDate(filtered),
    [filtered],
  );

  // ── Dynamic counts (based on other active filters) ──────────
  const dynamicTagCounts = useMemo(
    () => computeDynamicTagCounts(store.reflections ?? [], filters),
    [store.reflections, filters.moods, filters.search, filters.dateRange, filters.hasLink, filters.hasLinkedTask],
  );

  const dynamicMoodCounts = useMemo(
    () => computeDynamicMoodCounts(store.reflections ?? [], filters),
    [store.reflections, filters.tags, filters.search, filters.dateRange, filters.hasLink, filters.hasLinkedTask],
  );

  // ── Stats ────────────────────────────────────────────────────
  const totalCount = (store.reflections ?? []).filter(r => !r.deleted).length;

  const topTag = useMemo(() => {
    const counts: Record<string, number> = {};
    (store.reflections ?? []).filter(r => !r.deleted).forEach(r =>
      (r.tags ?? []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }),
    );
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] ?? '-';
  }, [store.reflections]);

  const streakDays = useMemo(() => {
    const dates = [...new Set(
      (store.reflections ?? []).filter(r => !r.deleted).map(r =>
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
  }, [store.reflections]);

  const sparklineData = useMemo(() => {
    const today = new Date();
    const data: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = dateStr(d);
      const count = (store.reflections ?? []).filter(r =>
        !r.deleted && dateStr(new Date(r.timestamp ?? 0)) === ds,
      ).length;
      data.push(count);
    }
    return data;
  }, [store.reflections]);

  const moodStats = useMemo(() => {
    const counts: Record<string, number> = {};
    (store.reflections ?? []).filter(r => !r.deleted).forEach(r => {
      if (r.mood) counts[r.mood] = (counts[r.mood] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [store.reflections]);

  const allMoods = useMemo(() => {
    return [...new Set((store.reflections ?? []).filter(r => !r.deleted).map(r => r.mood).filter(Boolean))] as string[];
  }, [store.reflections]);

  // ── Analytics ────────────────────────────────────────────────
  const moodTrend = useMemo<MoodTrendPoint[]>(
    () => computeMoodTrend(store.reflections ?? [], moodTrendDays),
    [store.reflections, moodTrendDays],
  );

  const heatmapData = useMemo<HeatmapDay[]>(
    () => computeWritingHeatmap(store.reflections ?? [], 20),
    [store.reflections],
  );

  const tagGraph = useMemo<TagGraph>(
    () => computeTagCooccurrence(store.reflections ?? []),
    [store.reflections],
  );

  const tagFrequency = useMemo(() => {
    const counts: Record<string, number> = {};
    (store.reflections ?? []).filter(r => !r.deleted).forEach(r =>
      (r.tags ?? []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }),
    );
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [store.reflections]);

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
    setFilters({ ...DEFAULT_REFLECTION_FILTERS });
    setSearchInput('');
  }, [setFilters]);

  const removeFilter = useCallback((key: string, value?: string) => {
    if (key === 'search') {
      setFilters(prev => ({ ...prev, search: '' }));
      setSearchInput('');
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
      const from = new Date(filters.dateRange.from).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
      const to = new Date(filters.dateRange.to).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
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

  const handleShare = useCallback(async (r: any, mode?: 'text' | 'image') => {
    try {
      if (mode === 'image') {
        // Return the reflection for ShareCard to handle
        return { type: 'image', reflection: r };
      }
      const tagsStr = r.tags?.length ? `\n🏷️ ${r.tags.join(' ')}` : '';
      const moodStr = r.mood ? `\n💭 ${r.mood}` : '';
      const linkStr = r.link ? `\n🔗 ${r.link}` : '';
      const timeStr = new Date(r.timestamp ?? 0).toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
      await Share.share({
        message: `「${r.content}」${tagsStr}${moodStr}${linkStr}\n\n📅 ${timeStr}\n— 来自心流纪 · Egoless Do\nhttps://egoless-do.app`,
      });
      return { type: 'text' };
    } catch {}
  }, []);

  return {
    // Filter state
    filters, setFilters,
    searchInput, setSearchInput,
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
