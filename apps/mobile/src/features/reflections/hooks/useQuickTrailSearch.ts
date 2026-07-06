import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  computeCandidatePool, buildIndex, retrieveTopK,
  isAIRecommendAvailable, parseSmartQuery, semanticSearchReflections,
  createLogger,
} from '@egoless-do/core';
import type { MindReflection, SmartQueryResult, SmartQueryFilters, TrailFilters } from '@egoless-do/core';
import { useSearchHistory } from './useSearchHistory';

const log = createLogger('Reflections');

export type TimeRange = 'week' | 'month' | '3months' | 'all';
export type MatchMode = 'idle' | 'local' | 'ai' | 'ai-loading';

export interface AnalysisStep {
  id: string;
  text: string;
  status: 'pending' | 'loading' | 'done' | 'error';
  detail?: string;
}

const PAGE_SIZE = 20;

export function useQuickTrailSearch(
  reflections: MindReflection[],
  initialText: string,
  T: (key: string) => string,
  aiConfig?: { mode: string; models: unknown[] },
) {
  const analyzingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatHistoryRef = useRef<string[]>([]);

  useEffect(() => () => {
    if (analyzingTimerRef.current) clearTimeout(analyzingTimerRef.current);
  }, []);

  // ── Filters ───────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState(initialText);
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);

  // ── Smart query ───────────────────────────────────────────────
  const [smartResult, setSmartResult] = useState<SmartQueryResult | null>(null);
  const [chatHistory, setChatHistory] = useState<string[]>([]);

  // ── AI Analysis stream ────────────────────────────────────────
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([]);
  const [isSmartParsing, setIsSmartParsing] = useState(false);

  // ── Results ───────────────────────────────────────────────────
  const [matchMode, setMatchMode] = useState<MatchMode>('idle');
  const [matchResults, setMatchResults] = useState<MindReflection[]>([]);
  const [aiDegraded, setAiDegraded] = useState(false);

  // ── Selection ─────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [trailName, setTrailName] = useState('');

  // ── Pagination ───────────────────────────────────────────────
  const [page, setPage] = useState(1);

  // ── Data ──────────────────────────────────────────────────────
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

  const handleRemoveFilter = useCallback((type: keyof SmartQueryFilters, value?: string) => {
    if (type === 'tags' && value) {
      setSelectedTags(prev => prev.filter(t => t !== value));
    } else if (type === 'moods' && value) {
      setSelectedMoods(prev => prev.filter(m => m !== value));
    } else if (type === 'timeRange') {
      setTimeRange('month');
    }
    setSmartResult(prev => {
      if (!prev?.filters) return prev;
      const updated = { ...prev.filters };
      if (type === 'tags' && value) updated.tags = (updated.tags ?? []).filter(t => t !== value);
      else if (type === 'moods' && value) updated.moods = (updated.moods ?? []).filter(m => m !== value);
      else if (type === 'timeRange') updated.timeRange = undefined;
      return { ...prev, filters: updated };
    });
  }, []);

  // ── Candidate pool + recommendations ──────────────────────────
  const filters: TrailFilters = useMemo(() => ({
    timeRange,
    tags: selectedTags.length > 0 ? selectedTags : [],
    moods: selectedMoods.length > 0 ? selectedMoods : [],
  }), [timeRange, selectedTags, selectedMoods]);

  const candidates = useMemo(() =>
    computeCandidatePool(reflections, filters),
    [reflections, filters],
  );

  // ── Debounced search (local only, AI on-demand) ──────────────
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

  // ── Search history ─────────────────────────────────────────────
  const { searchHistory, addToHistory } = useSearchHistory();

  // ── AI Pipeline 共享逻辑 ───────────────────────────────────────
  interface PipelineResult {
    results: Array<{ ref: MindReflection; score: number; source: 'direct' | 'extended' }>;
    smartResult: SmartQueryResult | null;
    aiDegraded: boolean;
  }

  const runAIPhase2 = useCallback(async (
    reflections: MindReflection[],
    trimmed: string,
    candidates: MindReflection[],
    currentFilters: TrailFilters,
    allResults: Array<{ ref: MindReflection; score: number; source: 'direct' | 'extended' }>,
    existingIds: Set<string>,
  ): Promise<{ smartResult: SmartQueryResult | null; shouldReturn: boolean }> => {
    if (!aiAvailable) return { smartResult: null, shouldReturn: false };
    try {
      const result = await parseSmartQuery(reflections, trimmed, chatHistoryRef.current);
      if (result.question && chatHistoryRef.current.length < 3) {
        return { smartResult: result, shouldReturn: true };
      }
      if (result.topic || (result.filters && Object.keys(result.filters).length > 0)) {
        const newFilters: TrailFilters = {
          timeRange: result.filters.timeRange || currentFilters.timeRange,
          tags: result.filters.tags?.length ? result.filters.tags : currentFilters.tags,
          moods: result.filters.moods?.length ? result.filters.moods : currentFilters.moods,
        };
        const newCandidates = computeCandidatePool(reflections, newFilters);
        const newIndex = buildIndex(newCandidates);
        const topic = result.topic || trimmed;
        const newScored = retrieveTopK(topic, newIndex, 20);
        for (const s of newScored) {
          if (!existingIds.has(s.index.id)) {
            const ref = newCandidates.find(r => r.id === s.index.id);
            if (ref) { allResults.push({ ref, score: s.score, source: 'direct' }); existingIds.add(ref.id); }
          }
        }
        return { smartResult: result, shouldReturn: false };
      }
      return { smartResult: null, shouldReturn: false };
    } catch (e) {
      log.debug('AI Phase 2 failed:', e);
      return { smartResult: null, shouldReturn: false };
    }
  }, [aiAvailable]);

  const runAIPhase3 = useCallback(async (
    reflections: MindReflection[],
    trimmed: string,
    allResults: Array<{ ref: MindReflection; score: number; source: 'direct' | 'extended' }>,
    existingIds: Set<string>,
  ): Promise<{ count: number; failed: boolean }> => {
    if (!aiAvailable) return { count: 0, failed: false };
    try {
      const semanticResults = await semanticSearchReflections(reflections, trimmed);
      if (semanticResults.length > 0) {
        const sorted = semanticResults.sort((a, b) => b.relevance - a.relevance);
        for (const sr of sorted) {
          const ref = reflections[sr.reflectionIndex];
          if (ref && !existingIds.has(ref.id)) {
            allResults.push({ ref, score: sr.relevance * 0.5, source: 'extended' });
            existingIds.add(ref.id);
          }
        }
        return { count: semanticResults.length, failed: false };
      }
      return { count: 0, failed: false };
    } catch (e) {
      log.debug('AI Phase 3 failed:', e);
      return { count: 0, failed: true };
    }
  }, [aiAvailable]);

  const mergeResults = useCallback((
    allResults: Array<{ ref: MindReflection; score: number; source: 'direct' | 'extended' }>,
  ): MindReflection[] => {
    const direct = allResults.filter(r => r.source === 'direct').sort((a, b) => b.score - a.score);
    const extended = allResults.filter(r => r.source === 'extended').sort((a, b) => b.score - a.score);
    return [...direct, ...extended].map(r => r.ref);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────
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

  const updateStep = useCallback((id: string, updates: Partial<AnalysisStep>) => {
    setAnalysisSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  // ── Three-phase search pipeline ────────────────────────────────
  const [isAISearching, setIsAISearching] = useState(false);

  const handleSmartQuery = useCallback(async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setMatchMode('idle');
      setMatchResults([]);
      setSmartResult(null);
      setAnalysisSteps([]);
      return;
    }

    setIsSmartParsing(true);
    setIsAnalyzing(true);
    setMatchMode('ai-loading');
    setAiDegraded(false);
    setPage(1);

    const steps: AnalysisStep[] = [
      { id: 'phase1', text: T('searchPhaseLocal'), status: 'loading' },
      { id: 'phase2', text: T('searchPhaseIntent'), status: 'pending' },
      { id: 'phase3', text: T('searchPhaseSemantic'), status: 'pending' },
      { id: 'merge', text: T('searchPhaseMerge'), status: 'pending' },
    ];
    setAnalysisSteps(steps);

    try {
      // Phase 1: Local RAG search
      const index = buildIndex(candidates);
      const scored = retrieveTopK(trimmed, index, 20);
      const allResults: Array<{ ref: MindReflection; score: number; source: 'direct' | 'extended' }> = [];
      const existingIds = new Set<string>();
      for (const s of scored) {
        const ref = candidates.find(r => r.id === s.index.id);
        if (ref) { allResults.push({ ref, score: s.score, source: 'direct' }); existingIds.add(ref.id); }
      }
      updateStep('phase1', {
        status: 'done',
        detail: allResults.length > 0
          ? T('searchPhaseLocalResult').replace('{n}', String(allResults.length))
          : T('searchPhaseLocalEmpty')
      });

      // Phase 2: Intent understanding
      if (allResults.length <= 3) {
        updateStep('phase2', { status: 'loading' });
        const { smartResult: sr, shouldReturn } = await runAIPhase2(reflections, trimmed, candidates, filters, allResults, existingIds);
        if (sr) setSmartResult(sr);
        if (shouldReturn) {
          updateStep('phase2', { status: 'done', detail: T('searchPhaseIntentQuestion') });
          const sorted = allResults.sort((a, b) => b.score - a.score);
          setMatchResults(sorted.map(r => r.ref));
          setMatchMode(allResults.length > 0 ? 'local' : 'idle');
          setIsSmartParsing(false);
          if (analyzingTimerRef.current) clearTimeout(analyzingTimerRef.current);
          analyzingTimerRef.current = setTimeout(() => setIsAnalyzing(false), 2000);
          return;
        }
        updateStep('phase2', { status: 'done', detail: sr ? T('searchPhaseIntentResult').replace('{n}', String(allResults.length)) : T('searchPhaseIntentSkip') });
      } else {
        updateStep('phase2', { status: 'done', detail: T('searchPhaseIntentSkip') });
      }

      // Phase 3: Semantic expansion
      if (allResults.length <= 3) {
        updateStep('phase3', { status: 'loading' });
        const { count, failed } = await runAIPhase3(reflections, trimmed, allResults, existingIds);
        if (failed) { setAiDegraded(true); updateStep('phase3', { status: 'error', detail: T('searchPhaseSemanticFail') }); }
        else updateStep('phase3', { status: 'done', detail: count > 0 ? T('searchPhaseSemanticResult').replace('{n}', String(count)) : T('searchPhaseSemanticEmpty') });
      } else {
        updateStep('phase3', { status: 'done', detail: T('searchPhaseSemanticSkip') });
      }

      // Merge
      updateStep('merge', { status: 'loading' });
      const directCount = allResults.filter(r => r.source === 'direct').length;
      const extendedCount = allResults.filter(r => r.source === 'extended').length;
      const finalResults = mergeResults(allResults);
      setMatchResults(finalResults);
      setMatchMode(finalResults.length > 0 ? 'ai' : 'idle');
      if (finalResults.length > 0) addToHistory(trimmed);
      updateStep('merge', {
        status: 'done',
        detail: T('searchPhaseMergeResult')
          .replace('{n}', String(finalResults.length))
          .replace('{d}', String(directCount))
          .replace('{e}', String(extendedCount))
      });
    } catch (e) {
      log.warn('SmartQuery pipeline error:', e);
      const index = buildIndex(candidates);
      const scored = retrieveTopK(trimmed, index, 20);
      const fallback = scored.map(s => candidates.find(r => r.id === s.index.id)).filter(Boolean) as MindReflection[];
      setMatchResults(fallback);
      setMatchMode('local');
      setAiDegraded(true);
      setSmartResult(null);
      setAnalysisSteps(prev => prev.map(s =>
        s.status === 'loading' ? { ...s, status: 'error' as const, detail: T('searchDegraded') } : s
      ));
    } finally {
      setIsSmartParsing(false);
      if (analyzingTimerRef.current) clearTimeout(analyzingTimerRef.current);
      analyzingTimerRef.current = setTimeout(() => setIsAnalyzing(false), 2000);
    }
  }, [searchQuery, reflections, candidates, filters, aiAvailable, runAIPhase2, runAIPhase3, mergeResults, updateStep, addToHistory, T]);

  // AI on-demand search (Phase 2 + 3, appends to local results)
  const handleAISearch = useCallback(async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed || !aiAvailable) return;

    setIsAISearching(true);
    setIsSmartParsing(true);
    setIsAnalyzing(true);
    setAiDegraded(false);

    const steps: AnalysisStep[] = [
      { id: 'phase2', text: T('searchPhaseIntent'), status: 'loading' },
      { id: 'phase3', text: T('searchPhaseSemantic'), status: 'pending' },
      { id: 'merge', text: T('searchPhaseMerge'), status: 'pending' },
    ];
    setAnalysisSteps(steps);

    try {
      const existingIds = new Set(matchResults.map(r => r.id));
      const allResults: Array<{ ref: MindReflection; score: number; source: 'direct' | 'extended' }> =
        matchResults.map(r => ({ ref: r, score: 0, source: 'direct' as const }));

      // Phase 2
      const { smartResult: sr, shouldReturn } = await runAIPhase2(reflections, trimmed, [], filters, allResults, existingIds);
      if (sr) setSmartResult(sr);
      if (shouldReturn) {
        updateStep('phase2', { status: 'done', detail: T('searchPhaseIntentQuestion') });
        setIsSmartParsing(false);
        setIsAISearching(false);
        if (analyzingTimerRef.current) clearTimeout(analyzingTimerRef.current);
        analyzingTimerRef.current = setTimeout(() => setIsAnalyzing(false), 2000);
        return;
      }
      updateStep('phase2', { status: 'done', detail: sr ? T('searchPhaseIntentResult').replace('{n}', String(allResults.length)) : T('searchPhaseIntentSkip') });

      // Phase 3
      updateStep('phase3', { status: 'loading' });
      const { count, failed } = await runAIPhase3(reflections, trimmed, allResults, existingIds);
      if (failed) { setAiDegraded(true); updateStep('phase3', { status: 'error', detail: T('searchPhaseSemanticFail') }); }
      else updateStep('phase3', { status: 'done', detail: count > 0 ? T('searchPhaseSemanticResult').replace('{n}', String(count)) : T('searchPhaseSemanticEmpty') });

      // Merge
      updateStep('merge', { status: 'loading' });
      const directCount = allResults.filter(r => r.source === 'direct').length;
      const extendedCount = allResults.filter(r => r.source === 'extended').length;
      const finalResults = mergeResults(allResults);
      setMatchResults(finalResults);
      setMatchMode(finalResults.length > 0 ? 'ai' : 'idle');
      if (finalResults.length > 0) addToHistory(trimmed);
      updateStep('merge', {
        status: 'done',
        detail: T('searchPhaseMergeResult')
          .replace('{n}', String(finalResults.length))
          .replace('{d}', String(directCount))
          .replace('{e}', String(extendedCount))
      });
    } catch (e) {
      log.warn('AISearch pipeline error:', e);
      setAiDegraded(true);
    } finally {
      setIsSmartParsing(false);
      setIsAISearching(false);
      if (analyzingTimerRef.current) clearTimeout(analyzingTimerRef.current);
      analyzingTimerRef.current = setTimeout(() => setIsAnalyzing(false), 2000);
    }
  }, [searchQuery, reflections, matchResults, filters, aiAvailable, runAIPhase2, runAIPhase3, mergeResults, updateStep, addToHistory, T]);

  const handleSmartAnswer = useCallback((answer: string) => {
    setChatHistory(prev => {
      const next = [...prev, answer];
      chatHistoryRef.current = next;
      return next;
    });
    if (analyzingTimerRef.current) clearTimeout(analyzingTimerRef.current);
    analyzingTimerRef.current = setTimeout(() => { handleSmartQuery(); }, 100);
  }, [handleSmartQuery]);

  const handleClear = useCallback(() => {
    setSearchQuery('');
    setMatchMode('idle');
    setMatchResults([]);
    setSmartResult(null);
    setChatHistory([]);
    setPage(1);
    setAiDegraded(false);
  }, []);

  return {
    // State
    searchQuery, setSearchQuery,
    timeRange, setTimeRange,
    selectedTags, setSelectedTags, toggleTag,
    selectedMoods, setSelectedMoods, toggleMood,
    matchMode, matchResults,
    smartResult, setSmartResult,
    analysisSteps, isAnalyzing, isSmartParsing,
    aiDegraded,
    selectedIds, setSelectedIds,
    trailName, setTrailName,
    page, setPage,
    searchHistory,
    isAISearching,
    chatHistory, setChatHistory,
    // Derived
    reflectionsMap, userTags, userMoods, aiAvailable,
    candidates, filters,
    selectedReflections, selectedMoodsList, selectedDateRange,
    PAGE_SIZE,
    // Actions
    handleSmartQuery, handleAISearch, handleSmartAnswer, handleClear,
    handleLocalSearch, handleRemoveFilter, addToHistory,
    resetFilters: () => {
      setTimeRange('month');
      setSelectedTags([]);
      setSelectedMoods([]);
      setSearchQuery('');
      setMatchMode('idle');
      setMatchResults([]);
    },
  };
}
