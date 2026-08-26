
import {
  buildIndex, retrieveTopK, createLogger,
} from '@egoless-do/core';
import type { MindReflection, SmartQueryResult, TrailFilters } from '@egoless-do/core';
import { useState, useCallback, useRef, useEffect } from 'react';

import { runAIPhase2, runAIPhase3, mergeResults } from './searchPipeline';

const log = createLogger('Reflections');

export interface AnalysisStep {
  id: string;
  text: string;
  status: 'pending' | 'loading' | 'done' | 'error';
  detail?: string;
}

type ScoredResult = { ref: MindReflection; score: number; source: 'direct' | 'extended' };

interface ResultSetters {
  setMatchResults: (r: MindReflection[] | ((prev: MindReflection[]) => MindReflection[])) => void;
  setMatchMode: (m: 'idle' | 'local' | 'ai' | 'ai-loading') => void;
  setSmartResult: (r: SmartQueryResult | null | ((prev: SmartQueryResult | null) => SmartQueryResult | null)) => void;
  setAiDegraded: (v: boolean) => void;
  setPage: (p: number | ((prev: number) => number)) => void;
}

/**
 * Three-phase AI search pipeline (smart query + on-demand AI search).
 * Owns isAnalyzing, analysisSteps, isSmartParsing, isAISearching, chatHistory.
 *
 * Result-layer state (matchResults/matchMode/smartResult/aiDegraded/page) is
 * injected as setters so this hook can drive the UI through a shared result
 * view. searchHistory/addToHistory is injected from the composition root to
 * avoid a circular useSearchHistory() dependency with useTrailResults.
 *
 * Extracted from useQuickTrailSearch — see useQuickTrailSearch.ts for composition.
 * Source ref: original lines 32-37, 46-52, 163-186, 228-417.
 */
export function useTrailAIAnalysis(
  reflections: MindReflection[],
  candidates: MindReflection[],
  searchQuery: string,
  filters: TrailFilters,
  matchResults: MindReflection[],
  aiAvailable: boolean,
  T: (key: string) => string,
  addToHistory: (q: string) => void,
  setters: ResultSetters,
) {
  const { setMatchResults, setMatchMode, setSmartResult, setAiDegraded, setPage } = setters;

  // ── State ──────────────────────────────────────────────────────
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([]);
  const [isSmartParsing, setIsSmartParsing] = useState(false);
  const [isAISearching, setIsAISearching] = useState(false);
  const [chatHistory, setChatHistory] = useState<string[]>([]);

  // ── Refs ───────────────────────────────────────────────────────
  const analyzingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatHistoryRef = useRef<string[]>([]);

  useEffect(() => () => {
    if (analyzingTimerRef.current) clearTimeout(analyzingTimerRef.current);
  }, []);

  // ── AI Pipeline — thin wrappers over pure functions ──────────────
  const runAIPhase2Wrapped = useCallback(async (
    refs: MindReflection[],
    trimmed: string,
    curFilters: TrailFilters,
    allResults: ScoredResult[],
    existingIds: Set<string>,
  ) => {
    if (!aiAvailable) return { smartResult: null as SmartQueryResult | null, shouldReturn: false };
    return runAIPhase2(refs, trimmed, curFilters, allResults, existingIds, chatHistoryRef.current);
  }, [aiAvailable]);

  const runAIPhase3Wrapped = useCallback(async (
    refs: MindReflection[],
    trimmed: string,
    allResults: ScoredResult[],
    existingIds: Set<string>,
  ) => {
    if (!aiAvailable) return { count: 0, failed: false };
    return runAIPhase3(refs, trimmed, allResults, existingIds);
  }, [aiAvailable]);

  // ── Step helper ────────────────────────────────────────────────
  const updateStep = useCallback((id: string, updates: Partial<AnalysisStep>) => {
    setAnalysisSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  // ── Three-phase smart search ────────────────────────────────────
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
      const allResults: ScoredResult[] = [];
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
        const { smartResult: sr, shouldReturn } = await runAIPhase2Wrapped(reflections, trimmed, filters, allResults, existingIds);
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
        const { count, failed } = await runAIPhase3Wrapped(reflections, trimmed, allResults, existingIds);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- warning-reduction: behavior preserved, proper exhaustive-deps fix deferred
  }, [searchQuery, reflections, candidates, filters, aiAvailable, runAIPhase2Wrapped, runAIPhase3Wrapped, updateStep, addToHistory, T]);

  // ── AI on-demand search (Phase 2 + 3, appends to local results) ─
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
      const allResults: ScoredResult[] =
        matchResults.map(r => ({ ref: r, score: 0, source: 'direct' as const }));

      // Phase 2
      const { smartResult: sr, shouldReturn } = await runAIPhase2Wrapped(reflections, trimmed, filters, allResults, existingIds);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- warning-reduction: behavior preserved, proper exhaustive-deps fix deferred
  }, [searchQuery, reflections, matchResults, filters, aiAvailable, runAIPhase2Wrapped, runAIPhase3Wrapped, updateStep, addToHistory, T]);

  const handleSmartAnswer = useCallback((answer: string) => {
    setChatHistory(prev => {
      const next = [...prev, answer];
      chatHistoryRef.current = next;
      return next;
    });
    if (analyzingTimerRef.current) clearTimeout(analyzingTimerRef.current);
    analyzingTimerRef.current = setTimeout(() => { handleSmartQuery().catch(err => log.error(err, { message: 'handleSmartQuery' })); }, 100);
  }, [handleSmartQuery]);

  const resetAI = useCallback(() => {
    setChatHistory([]);
    chatHistoryRef.current = [];
    setAnalysisSteps([]);
    setIsAnalyzing(false);
    setIsSmartParsing(false);
    setIsAISearching(false);
    if (analyzingTimerRef.current) {
      clearTimeout(analyzingTimerRef.current);
      analyzingTimerRef.current = null;
    }
  }, []);

  return {
    // state
    isAnalyzing, analysisSteps, isSmartParsing, isAISearching,
    chatHistory, setChatHistory,
    // actions
    handleSmartQuery, handleAISearch, handleSmartAnswer,
    updateStep, resetAI,
  };
}
