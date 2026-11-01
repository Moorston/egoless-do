import type { MindReflection, SmartQueryFilters } from '@egoless-do/core';
import { useCallback } from 'react';


import { useSearchHistory } from './useSearchHistory';
import { useTrailAIAnalysis, type AnalysisStep } from './useTrailAIAnalysis';
import { useTrailFilters } from './useTrailFilters';
import { useTrailResults } from './useTrailResults';
import { useTrailSelection } from './useTrailSelection';

export type { TimeRange } from './useTrailFilters';
export type { MatchMode } from './useTrailResults';
export type { AnalysisStep };

const PAGE_SIZE = 20;

/**
 * Composition root for the trail-builder search UI.
 *
 * Delegates to four single-responsibility hooks:
 *   - useTrailFilters    — searchQuery, tags/moods/timeRange, candidate pool
 *   - useTrailResults    — matchMode, matchResults, smartResult, debounce
 *   - useTrailAIAnalysis — three-phase AI pipeline, chat history, steps
 *   - useTrailSelection  — selectedIds, trailName, page, derived views
 *
 * useSearchHistory is hoisted here so both Results (debounced local search)
 * and AIAnalysis (smart-query search) can record history without a circular
 * useSearchHistory() dependency between them.
 *
 * Return contract (25 fields) is preserved from the original monolithic hook.
 */
export function useQuickTrailSearch(
  reflections: MindReflection[],
  initialText: string,
  T: (key: string) => string,
  _aiConfig?: { mode: string; models: unknown[] },
) {
  // ── Search history (hoisted — shared by Results + AI layers) ───────
  const { searchHistory, addToHistory } = useSearchHistory();

  // ── Filters + candidate pool ─────────────────────────────────────
  const f = useTrailFilters(reflections, initialText);

  // ── Results + debounced local search ──────────────────────────────
  const r = useTrailResults(f.candidates, f.searchQuery, f.filters, addToHistory);

  // ── Selection + pagination (before AI, so setPage can be injected) ──
  const s = useTrailSelection(f.reflectionsMap);

  // ── AI pipeline (three-phase smart query) ─────────────────────────
  const ai = useTrailAIAnalysis(
    reflections, f.candidates, f.searchQuery, f.filters,
    r.matchResults, f.aiAvailable, T, addToHistory,
    {
      setMatchResults: r.setMatchResults,
      setMatchMode: r.setMatchMode,
      setSmartResult: r.setSmartResult,
      setAiDegraded: r.setAiDegraded,
      setPage: s.setPage,
    },
  );

  // ── Cross-layer coordination (handlers that touch >1 layer) ───────
  const handleRemoveFilter = useCallback((type: keyof SmartQueryFilters, value?: string) => {
    f.handleRemoveFilter(type, value);
    r.clearSmartFilters(type, value);
  }, [f, r]);

  const handleClear = useCallback(() => {
    f.resetQuery();
    r.reset();
    ai.resetAI();
    s.resetPage();
  }, [f, r, ai, s]);

  const resetFilters = useCallback(() => {
    f.resetFilters();
    r.resetMatchState();
  }, [f, r]);

  return {
    // State — Filters
    searchQuery: f.searchQuery, setSearchQuery: f.setSearchQuery,
    timeRange: f.timeRange, setTimeRange: f.setTimeRange,
    selectedTags: f.selectedTags, setSelectedTags: f.setSelectedTags, toggleTag: f.toggleTag,
    selectedMoods: f.selectedMoods, setSelectedMoods: f.setSelectedMoods, toggleMood: f.toggleMood,
    // State — Results
    matchMode: r.matchMode, matchResults: r.matchResults,
    smartResult: r.smartResult, setSmartResult: r.setSmartResult,
    aiDegraded: r.aiDegraded,
    // State — AI Analysis
    analysisSteps: ai.analysisSteps, isAnalyzing: ai.isAnalyzing, isSmartParsing: ai.isSmartParsing,
    isAISearching: ai.isAISearching,
    chatHistory: ai.chatHistory, setChatHistory: ai.setChatHistory,
    // State — Selection
    selectedIds: s.selectedIds, setSelectedIds: s.setSelectedIds,
    trailName: s.trailName, setTrailName: s.setTrailName,
    page: s.page, setPage: s.setPage,
    // State — History
    searchHistory,
    // Derived
    reflectionsMap: f.reflectionsMap, userTags: f.userTags, userMoods: f.userMoods,
    aiAvailable: f.aiAvailable,
    candidates: f.candidates, filters: f.filters,
    selectedReflections: s.selectedReflections,
    selectedMoodsList: s.selectedMoodsList,
    selectedDateRange: s.selectedDateRange,
    PAGE_SIZE,
    // Actions
    handleSmartQuery: ai.handleSmartQuery, handleAISearch: ai.handleAISearch,
    handleSmartAnswer: ai.handleSmartAnswer, handleClear,
    handleLocalSearch: r.handleLocalSearch, handleRemoveFilter,
    addToHistory, resetFilters,
  };
}
