import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/types';
import {
  ArrowLeft, X, Send, Check, ChevronDown,
  RefreshCw, Plus, Sparkles, Loader2,
} from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, useT } from '../../components/UI';
import {
  FONT_TITLE, FONT_BODY, FONT_SMALL, FONT_TINY, FONT_BUTTON,
  getMoodIcon, generateTrailName,
  computeCandidatePool, buildIndex, retrieveTopK,
  formatDateShort,
  isAIRecommendAvailable, parseSmartQuery, semanticSearchReflections,
} from '@egoless-do/core';
import type { TrailFilters, MindReflection, SmartQueryResult, SmartQueryFilters } from '@egoless-do/core';
import SelectionSummary from './SelectionSummary';
import InsightPanel from './InsightPanel';
import { SmartQueryBubble } from './SmartQueryBubble';
import { FilterTags } from './FilterTags';
import { AIAnalysisStream, createAnalysisMessages } from './AIAnalysisStream';

type TimeRange = 'week' | 'month' | '3months' | 'all';

const SEARCH_HISTORY_KEY = 'quickTrailSearchHistory';
const PAGE_SIZE = 20;

const TIME_RANGE_OPTIONS: { key: TimeRange; labelKey: string }[] = [
  { key: 'week', labelKey: 'freqThisWeek' },
  { key: 'month', labelKey: 'freqThisMonth' },
  { key: '3months', labelKey: 'last3Months' },
  { key: 'all', labelKey: 'allTime' },
];

export default function QuickCreateTrailScreen() {
  const TH = useTheme();
  const T = useT();
  const nav = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'QuickCreateTrail'>>();
  const store = useAppStore();

  const initialText = route.params?.initialText ?? '';
  const initialSelectedIds = route.params?.selectedIds ?? [];

  // ── Filters ───────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState(initialText);
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showMoodDropdown, setShowMoodDropdown] = useState(false);

  // ── Smart query ───────────────────────────────────────────────
  const [chatHistory, setChatHistory] = useState<string[]>([]);
  const [smartResult, setSmartResult] = useState<SmartQueryResult | null>(null);
  const [isSmartParsing, setIsSmartParsing] = useState(false);

  // ── AI Analysis stream ────────────────────────────────────────
  const [analysisSteps, setAnalysisSteps] = useState<Array<{
    id: string;
    text: string;
    status: 'pending' | 'loading' | 'done' | 'error';
    detail?: string;
  }>>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // ── Results ───────────────────────────────────────────────────
  const [matchResults, setMatchResults] = useState<MindReflection[]>([]);
  const [matchMode, setMatchMode] = useState<'idle' | 'local' | 'ai' | 'ai-loading'>('idle');
  const [isMatching, setIsMatching] = useState(false);

  // ── Selection ─────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelectedIds));
  const [trailName, setTrailName] = useState('');
  const [skipThreshold, setSkipThreshold] = useState(false);

  // ── Pagination ───────────────────────────────────────────────
  const [page, setPage] = useState(1);

  // ── Search history ───────────────────────────────────────────
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // ── AI degradation ───────────────────────────────────────────
  const [aiDegraded, setAiDegraded] = useState(false);

  // ── Debounce ──────────────────────────────────────────────────
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleLocalSearchRef = useRef<() => void>(() => {});

  // ── Data ──────────────────────────────────────────────────────
  const reflections = useMemo(() =>
    (store.reflections ?? []).filter(r => !r.deleted),
    [store.reflections]
  );

  // O(1) lookup map
  const reflectionsMap = useMemo(() => {
    const map = new Map<string, MindReflection>();
    for (const r of reflections) map.set(r.id, r);
    return map;
  }, [reflections]);

  const userTags = useMemo(() => {
    const tagSet = new Set<string>();
    reflections.forEach(r => r.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).slice(0, 10);
  }, [reflections]);

  const userMoods = useMemo(() => {
    const moodSet = new Set<string>();
    reflections.forEach(r => { if (r.mood) moodSet.add(r.mood); });
    return Array.from(moodSet).slice(0, 6);
  }, [reflections]);

  const aiAvailable = useMemo(() => {
    return isAIRecommendAvailable({ mode: store.aiMode, models: store.aiModels });
  }, [store.aiMode, store.aiModels]);

  const handleRemoveFilter = useCallback((type: keyof SmartQueryFilters, value?: string) => {
    switch (type) {
      case 'timeRange':
        setTimeRange('month');
        break;
      case 'tags':
        if (value) setSelectedTags(prev => prev.filter(t => t !== value));
        break;
      case 'moods':
        if (value) setSelectedMoods(prev => prev.filter(m => m !== value));
        break;
      case 'keywords':
        // keywords are part of searchQuery, just clear smartResult
        break;
    }
  }, []);

  // ── Candidate pool + recommendations ──────────────────────────
  const filters: TrailFilters = useMemo(() => ({
    timeRange,
    tags: selectedTags,
    moods: selectedMoods,
    query: searchQuery || undefined,
  }), [timeRange, selectedTags, selectedMoods, searchQuery]);

  const candidates = useMemo(() =>
    computeCandidatePool(reflections, filters),
    [reflections, filters]
  );

  // ── Debounced search (local only, AI on-demand) ──────────────
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setMatchMode('idle');
      setMatchResults([]);
      setSmartResult(null);
      setChatHistory([]);
      setPage(1);
      setAiDegraded(false);
      return;
    }

    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { handleLocalSearchRef.current(); }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery, candidates]);

  // ── Selection derived ─────────────────────────────────────────
  const selectedReflections = useMemo(() => {
    const idSet = selectedIds;
    return reflections.filter(r => idSet.has(r.id));
  }, [reflections, selectedIds]);

  const selectedMoodsList = useMemo(() => {
    const sorted = [...selectedReflections].sort((a, b) => a.timestamp - b.timestamp);
    const moods: string[] = [];
    let last = '';
    for (const r of sorted) {
      if (r.mood && r.mood !== last) { moods.push(r.mood); last = r.mood; }
    }
    return moods;
  }, [selectedReflections]);

  const selectedDateRange = useMemo(() => {
    if (selectedReflections.length === 0) return undefined;
    const sorted = [...selectedReflections].sort((a, b) => a.timestamp - b.timestamp);
    return { start: sorted[0].timestamp, end: sorted[sorted.length - 1].timestamp };
  }, [selectedReflections]);

  // Auto-generate trail name when selection changes
  useEffect(() => {
    if (selectedIds.size > 0 && !trailName) {
      const name = generateTrailName(selectedReflections, T);
      setTrailName(name);
    } else if (selectedIds.size === 0) {
      setTrailName('');
    }
  }, [selectedIds.size]);

  // ── Handlers ──────────────────────────────────────────────────
  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => {
      const isRemoving = prev.includes(tag);
      // Inject/clear tag text in search input
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
      // Inject/clear mood text in search input
      setSearchQuery(q => {
        if (isRemoving) return q.replace(new RegExp(`(?:^|\\s)${mood}(?=\\s|$)`, 'g'), '').replace(/\s+/g, ' ').trim();
        return q ? `${q} ${mood}` : mood;
      });
      return isRemoving ? prev.filter(m => m !== mood) : [...prev, mood];
    });
  }, []);

  // ── Search history load/save ───────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(SEARCH_HISTORY_KEY).then(raw => {
      if (raw) { try { setSearchHistory(JSON.parse(raw)); } catch {} }
    });
  }, []);

  const addToHistory = useCallback((query: string) => {
    setSearchHistory(prev => {
      const next = [query, ...prev.filter(q => q !== query)].slice(0, 5);
      AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const handleLocalSearch = useCallback(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setMatchMode('idle');
      setMatchResults([]);
      return;
    }
    setMatchMode('local');
    setAiDegraded(false);
    setPage(1);
    const index = buildIndex(candidates);
    const scored = retrieveTopK(trimmed, index, 50);
    const results = scored.map(s => candidates.find(r => r.id === s.index.id)).filter(Boolean) as MindReflection[];
    setMatchResults(results);
  }, [searchQuery, candidates]);

  // Keep local search ref always pointing to latest callback
  handleLocalSearchRef.current = handleLocalSearch;

  const updateStep = useCallback((id: string, updates: Partial<typeof analysisSteps[0]>) => {
    setAnalysisSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  // ── Three-phase search pipeline ────────────────────────────────
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

    const steps = [
      { id: 'phase1', text: T('searchPhaseLocal'), status: 'loading' as const },
      { id: 'phase2', text: T('searchPhaseIntent'), status: 'pending' as const },
      { id: 'phase3', text: T('searchPhaseSemantic'), status: 'pending' as const },
      { id: 'merge', text: T('searchPhaseMerge'), status: 'pending' as const },
    ];
    setAnalysisSteps(steps);

    try {
      // ── Phase 1: RAG local multi-dimensional search (candidates) ─
      const index = buildIndex(candidates);
      const scored = retrieveTopK(trimmed, index, 20);

      const directResults: Array<{ ref: MindReflection; score: number; source: 'direct' }> = [];
      for (const s of scored) {
        const ref = candidates.find(r => r.id === s.index.id);
        if (ref) directResults.push({ ref, score: s.score, source: 'direct' });
      }

      updateStep('phase1', {
        status: 'done',
        detail: directResults.length > 0
          ? T('searchPhaseLocalResult').replace('{n}', String(directResults.length))
          : T('searchPhaseLocalEmpty')
      });

      let allResults = directResults;

      // ── Phase 2: Intent understanding (if <= 3 results) ─────────
      if (directResults.length <= 3 && aiAvailable) {
        updateStep('phase2', { status: 'loading' });

        try {
          const result = await parseSmartQuery(reflections, trimmed, chatHistory);

          if (result.question && chatHistory.length < 3) {
            setSmartResult(result);
            updateStep('phase2', { status: 'done', detail: T('searchPhaseIntentQuestion') });
            const sorted = allResults.sort((a, b) => b.score - a.score);
            setMatchResults(sorted.map(r => r.ref));
            setMatchMode(allResults.length > 0 ? 'local' : 'idle');
            setIsSmartParsing(false);
            setTimeout(() => setIsAnalyzing(false), 2000);
            return;
          }

          if (result.topic || (result.filters && Object.keys(result.filters).length > 0)) {
            setSmartResult(result);
            const newFilters: TrailFilters = {
              timeRange: result.filters.timeRange || timeRange,
              tags: result.filters.tags?.length ? result.filters.tags : selectedTags,
              moods: result.filters.moods?.length ? result.filters.moods : selectedMoods,
            };
            const newCandidates = computeCandidatePool(reflections, newFilters);
            const newIndex = buildIndex(newCandidates);
            const topic = result.topic || trimmed;
            const newScored = retrieveTopK(topic, newIndex, 20);

            const existingIds = new Set(allResults.map(r => r.ref.id));
            for (const s of newScored) {
              if (!existingIds.has(s.index.id)) {
                const ref = newCandidates.find(r => r.id === s.index.id);
                if (ref) {
                  allResults.push({ ref, score: s.score, source: 'direct' });
                  existingIds.add(ref.id);
                }
              }
            }
            updateStep('phase2', {
              status: 'done',
              detail: T('searchPhaseIntentResult').replace('{n}', String(allResults.length))
            });
          } else {
            updateStep('phase2', { status: 'done', detail: T('searchPhaseIntentSkip') });
          }
        } catch (e) {
          console.log('[SmartQuery] Phase 2 failed:', e);
          updateStep('phase2', { status: 'done', detail: T('searchPhaseIntentFail') });
        }
      } else {
        updateStep('phase2', { status: 'done', detail: T('searchPhaseIntentSkip') });
      }

      // ── Phase 3: Semantic expansion (if still <= 3 results) ─────
      if (allResults.length <= 3 && aiAvailable) {
        updateStep('phase3', { status: 'loading' });

        try {
          const semanticResults = await semanticSearchReflections(reflections, trimmed);

          if (semanticResults.length > 0) {
            const existingIds = new Set(allResults.map(r => r.ref.id));
            const sorted = semanticResults.sort((a, b) => b.relevance - a.relevance);
            for (const sr of sorted) {
              const ref = reflections[sr.reflectionIndex];
              if (ref && !existingIds.has(ref.id)) {
                allResults.push({ ref, score: sr.relevance * 0.5, source: 'extended' });
                existingIds.add(ref.id);
              }
            }
            updateStep('phase3', {
              status: 'done',
              detail: T('searchPhaseSemanticResult').replace('{n}', String(semanticResults.length))
            });
          } else {
            updateStep('phase3', { status: 'done', detail: T('searchPhaseSemanticEmpty') });
          }
        } catch (e) {
          console.log('[SmartQuery] Phase 3 failed:', e);
          setAiDegraded(true);
          updateStep('phase3', { status: 'error', detail: T('searchPhaseSemanticFail') });
        }
      } else {
        updateStep('phase3', { status: 'done', detail: T('searchPhaseSemanticSkip') });
      }

      // ── Merge: sort direct first, then extended ─────────────────
      updateStep('merge', { status: 'loading' });

      const direct = allResults.filter(r => r.source === 'direct').sort((a, b) => b.score - a.score);
      const extended = allResults.filter(r => r.source === 'extended').sort((a, b) => b.score - a.score);
      const finalResults = [...direct, ...extended];

      setMatchResults(finalResults.map(r => r.ref));
      setMatchMode(finalResults.length > 0 ? 'ai' : 'idle');

      if (finalResults.length > 0) {
        addToHistory(trimmed);
      }

      updateStep('merge', {
        status: 'done',
        detail: T('searchPhaseMergeResult')
          .replace('{n}', String(finalResults.length))
          .replace('{d}', String(direct.length))
          .replace('{e}', String(extended.length))
      });

    } catch (e) {
      console.log('[SmartQuery] pipeline error:', e);
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
      setTimeout(() => setIsAnalyzing(false), 2000);
    }
  }, [searchQuery, reflections, candidates, chatHistory, aiAvailable, timeRange, selectedTags, selectedMoods, updateStep, addToHistory, T]);

  // ── AI on-demand search (Phase 2 + 3, appends to local results) ─
  const [isAISearching, setIsAISearching] = useState(false);

  const handleAISearch = useCallback(async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed || !aiAvailable) return;

    setIsAISearching(true);
    setIsSmartParsing(true);
    setIsAnalyzing(true);
    setAiDegraded(false);

    const steps = [
      { id: 'phase2', text: T('searchPhaseIntent'), status: 'loading' as const },
      { id: 'phase3', text: T('searchPhaseSemantic'), status: 'pending' as const },
      { id: 'merge', text: T('searchPhaseMerge'), status: 'pending' as const },
    ];
    setAnalysisSteps(steps);

    try {
      // Existing local results as base
      const existingIds = new Set(matchResults.map(r => r.id));
      const allResults: Array<{ ref: MindReflection; score: number; source: 'direct' | 'extended' }> = matchResults.map(r => ({ ref: r, score: 0, source: 'direct' as const }));

      // ── Phase 2: Intent understanding ─────────────────────────
      try {
        const result = await parseSmartQuery(reflections, trimmed, chatHistory);

        if (result.question && chatHistory.length < 3) {
          setSmartResult(result);
          updateStep('phase2', { status: 'done', detail: T('searchPhaseIntentQuestion') });
          setIsSmartParsing(false);
          setIsAISearching(false);
          setTimeout(() => setIsAnalyzing(false), 2000);
          return;
        }

        if (result.topic || (result.filters && Object.keys(result.filters).length > 0)) {
          setSmartResult(result);
          const newFilters: TrailFilters = {
            timeRange: result.filters.timeRange || timeRange,
            tags: result.filters.tags?.length ? result.filters.tags : selectedTags,
            moods: result.filters.moods?.length ? result.filters.moods : selectedMoods,
          };
          const newCandidates = computeCandidatePool(reflections, newFilters);
          const newIndex = buildIndex(newCandidates);
          const topic = result.topic || trimmed;
          const newScored = retrieveTopK(topic, newIndex, 20);

          for (const s of newScored) {
            if (!existingIds.has(s.index.id)) {
              const ref = newCandidates.find(r => r.id === s.index.id);
              if (ref) {
                allResults.push({ ref, score: s.score, source: 'direct' });
                existingIds.add(ref.id);
              }
            }
          }
          updateStep('phase2', {
            status: 'done',
            detail: T('searchPhaseIntentResult').replace('{n}', String(allResults.length))
          });
        } else {
          updateStep('phase2', { status: 'done', detail: T('searchPhaseIntentSkip') });
        }
      } catch (e) {
        console.log('[AISearch] Phase 2 failed:', e);
        updateStep('phase2', { status: 'done', detail: T('searchPhaseIntentFail') });
      }

      // ── Phase 3: Semantic expansion ───────────────────────────
      updateStep('phase3', { status: 'loading' });
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
          updateStep('phase3', {
            status: 'done',
            detail: T('searchPhaseSemanticResult').replace('{n}', String(semanticResults.length))
          });
        } else {
          updateStep('phase3', { status: 'done', detail: T('searchPhaseSemanticEmpty') });
        }
      } catch (e) {
        console.log('[AISearch] Phase 3 failed:', e);
        setAiDegraded(true);
        updateStep('phase3', { status: 'error', detail: T('searchPhaseSemanticFail') });
      }

      // ── Merge: direct first, then extended ────────────────────
      updateStep('merge', { status: 'loading' });
      const direct = allResults.filter(r => r.source === 'direct').sort((a, b) => b.score - a.score);
      const extended = allResults.filter(r => r.source === 'extended').sort((a, b) => b.score - a.score);
      const finalResults = [...direct, ...extended];

      setMatchResults(finalResults.map(r => r.ref));
      setMatchMode(finalResults.length > 0 ? 'ai' : 'idle');

      if (finalResults.length > 0) {
        addToHistory(trimmed);
      }

      updateStep('merge', {
        status: 'done',
        detail: T('searchPhaseMergeResult')
          .replace('{n}', String(finalResults.length))
          .replace('{d}', String(direct.length))
          .replace('{e}', String(extended.length))
      });

    } catch (e) {
      console.log('[AISearch] pipeline error:', e);
      setAiDegraded(true);
    } finally {
      setIsSmartParsing(false);
      setIsAISearching(false);
      setTimeout(() => setIsAnalyzing(false), 2000);
    }
  }, [searchQuery, reflections, matchResults, chatHistory, aiAvailable, timeRange, selectedTags, selectedMoods, updateStep, addToHistory, T]);

  const handleSmartAnswer = useCallback((answer: string) => {
    setChatHistory(prev => [...prev, answer]);
    setTimeout(() => { handleSmartQuery(); }, 100);
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

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(matchResults.map(r => r.id)));
  }, [matchResults]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleOnlyUnassigned = useCallback(() => {
    const list = matchResults.filter(r => !r.thoughtTrailIds?.length).map(r => r.id);
    setSelectedIds(new Set(list));
  }, [matchResults]);

  const handleCreate = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const name = trailName || generateTrailName(
      ids.map(id => reflectionsMap.get(id)).filter(Boolean) as MindReflection[],
      T
    );

    const trailId = store.createThoughtTrail(name, '', ids, 'manual');

    setSelectedIds(new Set());
    setTrailName('');
    (nav as any).navigate('ThoughtTrailDetail', { trailId });
  }, [selectedIds, trailName, reflectionsMap, store, nav, T]);

  const resetFilters = useCallback(() => {
    setTimeRange('month');
    setSelectedTags([]);
    setSelectedMoods([]);
    setSearchQuery('');
    setMatchMode('idle');
    setMatchResults([]);
  }, []);

  const handleGoRecord = useCallback(() => {
    (nav as any).navigate('Reflections', { showNew: true });
  }, [nav]);

  // ── Preview mode ───────────────────────────────────────────────
  const [showPreview, setShowPreview] = useState(initialSelectedIds.length > 0);

  // ── Render helpers ────────────────────────────────────────────
  const timeRangeLabel = TIME_RANGE_OPTIONS.find(o => o.key === timeRange)?.labelKey ?? 'thisMonth';

  const showInsightPanel = !searchQuery && !showPreview;
  const showMatchResults = matchMode !== 'idle' || searchQuery.length > 0;
  const showPreviewSection = showPreview && selectedIds.size > 0 && !showMatchResults;

  // Empty state: not enough reflections (skip if user chose manual mode)
  if (reflections.length < 5 && !skipThreshold) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: TH.border }}>
          <TouchableOpacity onPress={() => nav.goBack()}>
            <ArrowLeft size={24} color={TH.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>{T('quickCreateTrail')}</Text>
          <TouchableOpacity onPress={() => nav.goBack()}>
            <X size={24} color={TH.sub} />
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>📝</Text>
          <Text style={{ fontSize: FONT_BODY, color: TH.text, textAlign: 'center', marginBottom: 8 }}>
            {T('quickTrailNotEnough').replace('{n}', String(reflections.length))}
          </Text>
          <Text style={{ fontSize: FONT_SMALL, color: TH.sub, textAlign: 'center', lineHeight: 20 }}>
            {T('quickTrailKeepRecording')}
          </Text>
          <TouchableOpacity
            onPress={() => (nav as any).navigate('Reflections', { showNew: true })}
            style={{ backgroundColor: TH.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, marginTop: 20 }}
          >
            <Text style={{ color: '#fff', fontSize: FONT_BUTTON, fontWeight: '600' }}>{T('quickTrailGoRecord')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSkipThreshold(true)}
            style={{ marginTop: 16, paddingVertical: 8 }}
          >
            <Text style={{ fontSize: FONT_SMALL, color: TH.primary }}>{T('quickTrailManualSelect')} →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: TH.border }}>
          <TouchableOpacity onPress={() => nav.goBack()}>
            <ArrowLeft size={24} color={TH.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>{T('quickCreateTrail')}</Text>
          {selectedIds.size > 0 ? (
            <TouchableOpacity
              onPress={handleCreate}
              style={{ backgroundColor: TH.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
            >
              <Text style={{ color: '#fff', fontSize: FONT_SMALL, fontWeight: '700' }}>确认创建</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => nav.goBack()}>
              <X size={24} color={TH.sub} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => { setShowTimeDropdown(false); setShowTagDropdown(false); setShowMoodDropdown(false); }}
        >
          {/* Backdrop: close dropdowns on tap outside */}
          {(showTimeDropdown || showTagDropdown || showMoodDropdown) && (
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => { setShowTimeDropdown(false); setShowTagDropdown(false); setShowMoodDropdown(false); }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}
            />
          )}

          {/* Smart query bubble */}
          {smartResult?.question && chatHistory.length < 3 && (
            <SmartQueryBubble
              question={smartResult.question}
              onAnswer={handleSmartAnswer}
              onSkip={() => {
                setSmartResult(prev => prev ? { ...prev, question: null } : null);
                handleSmartQuery();
              }}
            />
          )}

          {/* AI Analysis stream */}
          {analysisSteps.length > 0 && (
            <AIAnalysisStream
              messages={createAnalysisMessages(analysisSteps)}
              isAnalyzing={isAnalyzing}
              onComplete={() => setAnalysisSteps([])}
            />
          )}

          {/* Conversation input */}
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <View style={{
              backgroundColor: TH.card, borderRadius: 16,
              borderWidth: 1, borderColor: TH.border,
              paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8,
              minHeight: 100,
            }}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleLocalSearch}
                placeholder={T('quickTrailSearchPlaceholder')}
                placeholderTextColor={TH.sub}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={{
                  color: TH.text, fontSize: FONT_BODY, padding: 0,
                  minHeight: 60, maxHeight: 140,
                }}
                returnKeyType="send"
                blurOnSubmit
              />

              {/* Bottom row: actions */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={handleClear} style={{ padding: 4 }}>
                      <X size={16} color={TH.sub} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={handleLocalSearch}
                    style={{
                      width: 36, height: 36, borderRadius: 18,
                      backgroundColor: searchQuery.trim() ? TH.primary : `${TH.sub}20`,
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Send size={16} color={searchQuery.trim() ? '#fff' : TH.sub} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* AI on-demand search button */}
          {searchQuery.trim().length > 0 && aiAvailable && (
            <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
              <TouchableOpacity
                onPress={handleAISearch}
                disabled={isAISearching}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  alignSelf: 'flex-start',
                  paddingHorizontal: 14, paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: isAISearching ? `${TH.sub}15` : '#8B5CF615',
                  borderWidth: 1,
                  borderColor: isAISearching ? TH.border : '#8B5CF630',
                  opacity: isAISearching ? 0.7 : 1,
                }}
              >
                {isAISearching ? (
                  <Loader2 size={16} color="#8B5CF6" />
                ) : (
                  <Sparkles size={16} color="#8B5CF6" />
                )}
                <Text style={{
                  fontSize: FONT_SMALL,
                  color: '#8B5CF6',
                  fontWeight: '600',
                }}>
                  {isAISearching ? T('aiSearching') : T('aiSearchButton')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Filter row: dropdowns */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginTop: 12, gap: 8 }}>
            {/* Time range dropdown */}
            <View style={{ position: 'relative', flex: 1 }}>
              <TouchableOpacity
                onPress={() => { setShowTimeDropdown(!showTimeDropdown); setShowTagDropdown(false); setShowMoodDropdown(false); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: 12, paddingVertical: 10,
                  borderRadius: 10, borderWidth: 1,
                  backgroundColor: timeRange !== 'month' ? `${TH.primary}15` : TH.card,
                  borderColor: timeRange !== 'month' ? TH.primary : TH.border,
                }}
              >
                <Text style={{ fontSize: FONT_SMALL, color: TH.text }}>{T(timeRangeLabel)}</Text>
                <ChevronDown size={14} color={TH.sub} />
              </TouchableOpacity>
              {showTimeDropdown && (
                <View style={{
                  position: 'absolute', top: 44, left: 0, right: 0, zIndex: 20,
                  backgroundColor: TH.card, borderRadius: 12,
                  borderWidth: 1, borderColor: TH.border,
                  overflow: 'hidden', elevation: 5,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8,
                }}>
                  {TIME_RANGE_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => {
                        setTimeRange(opt.key);
                        setShowTimeDropdown(false);
                        // Inject time range label into search input
                        const label = T(opt.labelKey);
                        setSearchQuery(q => {
                          // Remove any previous time range labels
                          const cleaned = q.replace(new RegExp(`(?:^|\\s)(?:${TIME_RANGE_OPTIONS.map(o => T(o.labelKey)).join('|')})(?=\\s|$)`, 'g'), '').replace(/\s+/g, ' ').trim();
                          return cleaned ? `${cleaned} ${label}` : label;
                        });
                      }}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 10,
                        backgroundColor: timeRange === opt.key ? `${TH.primary}15` : 'transparent',
                      }}
                    >
                      <Text style={{ fontSize: FONT_SMALL, color: timeRange === opt.key ? TH.primary : TH.text }}>
                        {T(opt.labelKey)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Tags dropdown */}
            <View style={{ position: 'relative', flex: 1 }}>
              <TouchableOpacity
                onPress={() => { setShowTagDropdown(!showTagDropdown); setShowTimeDropdown(false); setShowMoodDropdown(false); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: 12, paddingVertical: 10,
                  borderRadius: 10, borderWidth: 1,
                  backgroundColor: selectedTags.length > 0 ? `${TH.primary}15` : TH.card,
                  borderColor: selectedTags.length > 0 ? TH.primary : TH.border,
                }}
              >
                <Text style={{ fontSize: FONT_SMALL, color: TH.text }}>
                  {selectedTags.length > 0 ? `标签 (${selectedTags.length})` : '标签'}
                </Text>
                <ChevronDown size={14} color={TH.sub} />
              </TouchableOpacity>
              {showTagDropdown && (
                <View style={{
                  position: 'absolute', top: 44, left: 0, right: 0, zIndex: 20,
                  backgroundColor: TH.card, borderRadius: 12,
                  borderWidth: 1, borderColor: TH.border,
                  overflow: 'hidden', maxHeight: 240, elevation: 5,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8,
                }}>
                  <ScrollView>
                    <TouchableOpacity
                      onPress={() => setSelectedTags([])}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 8,
                        paddingHorizontal: 14, paddingVertical: 10,
                        backgroundColor: selectedTags.length === 0 ? `${TH.primary}15` : 'transparent',
                      }}
                    >
                      <View style={{
                        width: 18, height: 18, borderRadius: 4, borderWidth: 1.5,
                        borderColor: selectedTags.length === 0 ? TH.primary : TH.border,
                        backgroundColor: selectedTags.length === 0 ? TH.primary : 'transparent',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        {selectedTags.length === 0 && <Check size={12} color="#fff" />}
                      </View>
                      <Text style={{ fontSize: FONT_SMALL, color: TH.text }}>全部</Text>
                    </TouchableOpacity>
                    {userTags.map(tag => {
                      const active = selectedTags.includes(tag);
                      return (
                        <TouchableOpacity
                          key={tag}
                          onPress={() => toggleTag(tag)}
                          style={{
                            flexDirection: 'row', alignItems: 'center', gap: 8,
                            paddingHorizontal: 14, paddingVertical: 10,
                            backgroundColor: active ? `${TH.primary}15` : 'transparent',
                          }}
                        >
                          <View style={{
                            width: 18, height: 18, borderRadius: 4, borderWidth: 1.5,
                            borderColor: active ? TH.primary : TH.border,
                            backgroundColor: active ? TH.primary : 'transparent',
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                            {active && <Check size={12} color="#fff" />}
                          </View>
                          <Text style={{ fontSize: FONT_SMALL, color: TH.text }}>{tag}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Moods dropdown */}
            <View style={{ position: 'relative', flex: 1 }}>
              <TouchableOpacity
                onPress={() => { setShowMoodDropdown(!showMoodDropdown); setShowTimeDropdown(false); setShowTagDropdown(false); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: 12, paddingVertical: 10,
                  borderRadius: 10, borderWidth: 1,
                  backgroundColor: selectedMoods.length > 0 ? '#8B5CF615' : TH.card,
                  borderColor: selectedMoods.length > 0 ? '#8B5CF6' : TH.border,
                }}
              >
                <Text style={{ fontSize: FONT_SMALL, color: TH.text }}>
                  {selectedMoods.length > 0 ? `心情 (${selectedMoods.length})` : '心情'}
                </Text>
                <ChevronDown size={14} color={TH.sub} />
              </TouchableOpacity>
              {showMoodDropdown && (
                <View style={{
                  position: 'absolute', top: 44, left: 0, right: 0, zIndex: 20,
                  backgroundColor: TH.card, borderRadius: 12,
                  borderWidth: 1, borderColor: TH.border,
                  overflow: 'hidden', maxHeight: 240, elevation: 5,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8,
                }}>
                  <ScrollView>
                    <TouchableOpacity
                      onPress={() => setSelectedMoods([])}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 8,
                        paddingHorizontal: 14, paddingVertical: 10,
                        backgroundColor: selectedMoods.length === 0 ? '#8B5CF615' : 'transparent',
                      }}
                    >
                      <View style={{
                        width: 18, height: 18, borderRadius: 4, borderWidth: 1.5,
                        borderColor: selectedMoods.length === 0 ? '#8B5CF6' : TH.border,
                        backgroundColor: selectedMoods.length === 0 ? '#8B5CF6' : 'transparent',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        {selectedMoods.length === 0 && <Check size={12} color="#fff" />}
                      </View>
                      <Text style={{ fontSize: FONT_SMALL, color: TH.text }}>全部</Text>
                    </TouchableOpacity>
                    {userMoods.map(mood => {
                      const active = selectedMoods.includes(mood);
                      return (
                        <TouchableOpacity
                          key={mood}
                          onPress={() => toggleMood(mood)}
                          style={{
                            flexDirection: 'row', alignItems: 'center', gap: 8,
                            paddingHorizontal: 14, paddingVertical: 10,
                            backgroundColor: active ? '#8B5CF615' : 'transparent',
                          }}
                        >
                          <View style={{
                            width: 18, height: 18, borderRadius: 4, borderWidth: 1.5,
                            borderColor: active ? '#8B5CF6' : TH.border,
                            backgroundColor: active ? '#8B5CF6' : 'transparent',
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                            {active && <Check size={12} color="#fff" />}
                          </View>
                          <Text style={{ fontSize: FONT_SMALL, color: TH.text }}>
                            {getMoodIcon(mood)} {mood}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          {/* Smart query filter tags */}
          {smartResult && Object.keys(smartResult.filters).length > 0 && (
            <FilterTags
              filters={smartResult.filters}
              onRemoveFilter={handleRemoveFilter}
              onAddPress={() => { setShowTimeDropdown(true); }}
            />
          )}

          {/* Reset filters */}
          {(selectedTags.length > 0 || selectedMoods.length > 0 || timeRange !== 'month') && (
            <View style={{ alignItems: 'flex-end', paddingHorizontal: 16, marginTop: 6 }}>
              <TouchableOpacity onPress={resetFilters}>
                <Text style={{ fontSize: FONT_TINY, color: TH.sub }}>{T('quickTrailResetFilters')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Inline creation panel ── */}
          {selectedIds.size > 0 && (
            <View style={{
              marginHorizontal: 16, marginTop: 16,
              backgroundColor: TH.card, borderRadius: 12,
              borderWidth: 1, borderColor: TH.border,
              padding: 14,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <SelectionSummary
                  count={selectedIds.size}
                  moods={selectedMoodsList}
                  startDate={selectedDateRange?.start}
                  endDate={selectedDateRange?.end}
                />
                <TouchableOpacity
                  onPress={handleCreate}
                  style={{
                    backgroundColor: TH.primary, borderRadius: 10,
                    paddingHorizontal: 16, paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: FONT_BUTTON, fontWeight: '700' }}>
                    {T('quickTrailCreate')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Assigned notice */}
              {(() => {
                const assignedCount = selectedReflections.filter(r => r.thoughtTrailIds && r.thoughtTrailIds.length > 0).length;
                return assignedCount > 0 ? (
                  <Text style={{ fontSize: FONT_TINY, color: TH.sub, marginTop: 4 }}>
                    ℹ️ {T('quickTrailAssignedNotice').replace('{n}', String(assignedCount))} {T('quickTrailAssignedExplain')}
                  </Text>
                ) : null;
              })()}

              {/* Trail name input */}
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: TH.bg, borderRadius: 10,
                paddingHorizontal: 12, paddingVertical: 8,
                borderWidth: 1, borderColor: TH.border,
                marginTop: 8,
              }}>
                <TextInput
                  value={trailName}
                  onChangeText={setTrailName}
                  placeholder={T('quickTrailNamePlaceholder')}
                  placeholderTextColor={TH.sub}
                  style={{ flex: 1, color: TH.text, fontSize: FONT_SMALL, padding: 0 }}
                />
                <TouchableOpacity onPress={() => setTrailName(generateTrailName(selectedReflections, T))}>
                  <RefreshCw size={14} color={TH.sub} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Preview: pre-selected reflections ── */}
          {showPreviewSection && (
            <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>
                  已选感念 · {selectedIds.size}{T('quickTrailReflections')}
                </Text>
                <TouchableOpacity
                  onPress={() => { setShowPreview(false); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Plus size={14} color={TH.primary} />
                  <Text style={{ fontSize: FONT_SMALL, color: TH.primary, fontWeight: '500' }}>添加更多</Text>
                </TouchableOpacity>
              </View>

              {selectedReflections.map(ref => (
                <View
                  key={ref.id}
                  style={{
                    flexDirection: 'row', alignItems: 'flex-start',
                    backgroundColor: TH.card, borderRadius: 12,
                    borderWidth: 1, borderColor: TH.primary,
                    padding: 12, marginBottom: 8, gap: 10,
                  }}
                >
                  {/* Content */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>
                        {formatDateShort(ref.timestamp)}
                      </Text>
                      <Text style={{ fontSize: FONT_SMALL }}>{getMoodIcon(ref.mood)}</Text>
                      {ref.tags.slice(0, 2).map(tag => (
                        <Text key={tag} style={{
                          fontSize: FONT_TINY, color: TH.primary,
                          backgroundColor: `${TH.primary}15`,
                          paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
                        }}>
                          {tag}
                        </Text>
                      ))}
                    </View>
                    <Text style={{
                      fontSize: FONT_BODY, color: TH.text, marginTop: 4,
                      lineHeight: 20,
                    }} numberOfLines={2}>
                      {ref.content}
                    </Text>
                  </View>

                  {/* Remove button */}
                  <TouchableOpacity
                    onPress={() => toggleSelect(ref.id)}
                    style={{ padding: 4, marginTop: 2 }}
                  >
                    <X size={18} color={TH.sub} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* ── Insight Panel (empty input) ── */}
          {showInsightPanel && (
            <View style={{ marginTop: 8 }}>
            <InsightPanel
              visible
              reflections={reflections}
              onTagPress={(tag) => setSearchQuery(tag)}
              onMoodPress={(mood) => setSearchQuery(mood)}
              onGoRecord={handleGoRecord}
            />
            </View>
          )}

          {/* ── Search history ── */}
          {showInsightPanel && searchHistory.length > 0 && (
            <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
              <Text style={{ fontSize: FONT_TINY, color: TH.sub, marginBottom: 8 }}>{T('searchHistory')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {searchHistory.map((q, i) => (
                  <TouchableOpacity
                    key={`${q}-${i}`}
                    onPress={() => setSearchQuery(q)}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 6,
                      borderRadius: 16, backgroundColor: TH.card,
                      borderWidth: 1, borderColor: TH.border,
                    }}
                  >
                    <Text style={{ fontSize: FONT_SMALL, color: TH.text }}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── Match results section ── */}
          {showMatchResults && (
            <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
              {/* AI degradation indicator */}
              {aiDegraded && (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  backgroundColor: '#FEF3C7', borderRadius: 8,
                  paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12,
                }}>
                  <Text style={{ fontSize: FONT_TINY }}>⚠️</Text>
                  <Text style={{ fontSize: FONT_TINY, color: '#92400E' }}>{T('searchDegraded')}</Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>
                  {T('quickTrailMatch')} · {matchResults.length}{T('quickTrailReflections')}
                </Text>
              </View>

              {matchResults.length > 0 ? (
                <>
                  {/* Bulk actions - top */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: TH.border }}>
                    <View style={{ flexDirection: 'row', gap: 14 }}>
                      <TouchableOpacity onPress={handleSelectAll}>
                        <Text style={{ fontSize: FONT_SMALL, color: TH.primary, fontWeight: '500' }}>{T('quickTrailSelectAll')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleDeselectAll}>
                        <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>{T('quickTrailDeselectAll')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleOnlyUnassigned}>
                        <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>{T('quickTrailOnlyUnassigned')}</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>
                      {T('quickTrailSelected').replace('{n}', String(selectedIds.size))}
                    </Text>
                  </View>

                  {matchResults.slice(0, page * PAGE_SIZE).map(ref => (
                    <ReflectionCheckItem
                      key={ref.id}
                      ref={ref}
                      isSelected={selectedIds.has(ref.id)}
                      onToggle={() => toggleSelect(ref.id)}
                    />
                  ))}

                  {/* Load more button */}
                  {matchResults.length > page * PAGE_SIZE && (
                    <TouchableOpacity
                      onPress={() => setPage(p => p + 1)}
                      style={{
                        alignItems: 'center', paddingVertical: 12,
                        marginTop: 4, borderRadius: 10,
                        backgroundColor: `${TH.primary}10`,
                      }}
                    >
                      <Text style={{ fontSize: FONT_SMALL, color: TH.primary }}>
                        {T('searchLoadMore').replace('{n}', String(Math.min(PAGE_SIZE, matchResults.length - page * PAGE_SIZE)))}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : !isMatching ? (
                <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>🔍</Text>
                  <Text style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 4 }}>
                    {T('quickTrailNoResults')}
                  </Text>
                  <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>
                    {T('quickTrailTryAgain')}
                  </Text>
                  <TouchableOpacity onPress={resetFilters} style={{ marginTop: 12 }}>
                    <Text style={{ fontSize: FONT_SMALL, color: TH.primary }}>{T('quickTrailResetFilters')}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Reflection check item ────────────────────────────────────────

function ReflectionCheckItem({
  ref, isSelected, onToggle,
}: {
  ref: MindReflection; isSelected: boolean; onToggle: () => void;
}) {
  const TH = useTheme();
  const T = useT();

  return (
    <TouchableOpacity
      onPress={onToggle}
      style={{
        flexDirection: 'row', alignItems: 'flex-start',
        backgroundColor: TH.card, borderRadius: 12,
        borderWidth: 1, borderColor: isSelected ? TH.primary : TH.border,
        padding: 12, marginBottom: 8, gap: 10,
      }}
    >
      {/* Checkbox */}
      <View style={{
        width: 22, height: 22, borderRadius: 6, borderWidth: 2,
        borderColor: isSelected ? TH.primary : TH.border,
        backgroundColor: isSelected ? TH.primary : 'transparent',
        alignItems: 'center', justifyContent: 'center',
        marginTop: 2,
      }}>
        {isSelected && <Check size={14} color="#fff" />}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>
            {formatDateShort(ref.timestamp)}
          </Text>
          <Text style={{ fontSize: FONT_SMALL }}>{getMoodIcon(ref.mood)}</Text>
          {ref.tags.slice(0, 2).map(tag => (
            <Text key={tag} style={{
              fontSize: FONT_TINY, color: TH.primary,
              backgroundColor: `${TH.primary}15`,
              paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
            }}>
              {tag}
            </Text>
          ))}
        </View>
        <Text style={{
          fontSize: FONT_BODY, color: TH.text, marginTop: 4,
          lineHeight: 20,
        }} numberOfLines={2}>
          {ref.content}
        </Text>
        {ref.thoughtTrailIds && ref.thoughtTrailIds.length > 0 && (
          <Text style={{ fontSize: FONT_TINY, color: TH.sub, marginTop: 4 }}>
            📎 {T('quickTrailAssignedNotice').replace('{n}', String(ref.thoughtTrailIds.length))}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
