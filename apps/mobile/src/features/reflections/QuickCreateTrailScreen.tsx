import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/types';
import {
  ArrowLeft, X, Send, Check, ChevronDown,
  RefreshCw,
} from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, useT } from '../../components/UI';
import {
  FONT_TITLE, FONT_BODY, FONT_SMALL, FONT_TINY, FONT_BUTTON,
  getMoodIcon, generateTrailName,
  computeCandidatePool, matchByKeyword,
  formatDateShort,
  isAIRecommendAvailable, matchReflectionsToTopic, parseSmartQuery, semanticSearchReflections,
} from '@egoless-do/core';
import type { TrailFilters, MindReflection, SmartQueryResult, SmartQueryFilters } from '@egoless-do/core';
import SelectionSummary from './SelectionSummary';
import InsightPanel from './InsightPanel';
import { SmartQueryBubble } from './SmartQueryBubble';
import { FilterTags } from './FilterTags';
import { AIAnalysisStream, createAnalysisMessages } from './AIAnalysisStream';

type TimeRange = 'week' | 'month' | '3months' | 'all';

// ── Emotional context extraction ───────────────────────────────────
const EMOTION_KEYWORDS: Record<string, string[]> = {
  '焦虑': ['焦虑', '紧张', '不安', '担心', '忧虑', '压力', '压力大'],
  '开心': ['开心', '高兴', '快乐', '愉快', '喜悦', '满足', '幸福'],
  '平静': ['平静', '安宁', '放松', '淡定', '从容', '安心'],
  '沮丧': ['沮丧', '失落', '难过', '悲伤', '低落', '郁闷', '烦'],
  '愤怒': ['愤怒', '生气', '恼火', '烦躁', '气愤', '不满'],
  '疲惫': ['累', '疲惫', '疲倦', '疲劳', '困', '没精神'],
};

function extractEmotionalContext(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) {
      found.push(emotion);
    }
  }
  return found;
}

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

  // ── Debounce ──────────────────────────────────────────────────
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSmartQueryRef = useRef<() => void>(() => {});
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

  // ── Debounced search (smart mode) ────────────────────────────
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setMatchMode('idle');
      setMatchResults([]);
      setSmartResult(null);
      setChatHistory([]);
      return;
    }

    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (trimmed.length > 1) {
      // 2+ 字符 → AI 智能查询（内部自动降级为本地匹配）
      searchTimer.current = setTimeout(() => { handleSmartQueryRef.current(); }, 500);
    } else {
      // 单字符 → 本地匹配
      searchTimer.current = setTimeout(() => { handleLocalSearchRef.current(); }, 300);
    }
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery, candidates, aiAvailable]);

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
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }, []);

  const toggleMood = useCallback((mood: string) => {
    setSelectedMoods(prev => prev.includes(mood) ? prev.filter(m => m !== mood) : [...prev, mood]);
  }, []);

  const handleLocalSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setMatchMode('idle');
      setMatchResults([]);
      return;
    }
    setMatchMode('local');
    const localResults = matchByKeyword(searchQuery, candidates);
    setMatchResults(localResults);
  }, [searchQuery, candidates]);

  // Keep local search ref always pointing to latest callback
  handleLocalSearchRef.current = handleLocalSearch;

  const updateStep = useCallback((id: string, updates: Partial<typeof analysisSteps[0]>) => {
    setAnalysisSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const handleSmartQuery = useCallback(async () => {
    const trimmed = searchQuery.trim();
    console.log('[SmartQuery] called, input:', trimmed, 'aiAvailable:', aiAvailable, 'reflections:', reflections.length);
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

    // Initialize analysis steps - multi-round search
    const steps = [
      { id: 'local', text: '本地关键词匹配', status: 'loading' as const },
      { id: 'intent', text: 'AI 理解查询语义', status: 'pending' as const },
      { id: 'expand', text: 'AI 语义相似搜索', status: 'pending' as const },
      { id: 'mood', text: '情绪维度匹配', status: 'pending' as const },
      { id: 'merge', text: '合并排序结果', status: 'pending' as const },
    ];
    setAnalysisSteps(steps);

    const allResults = new Map<string, MindReflection>();
    const addResults = (results: MindReflection[]) => {
      for (const r of results) {
        if (!allResults.has(r.id)) allResults.set(r.id, r);
      }
    };

    let usedAI = false;

    try {
      // ── Round 1: Local keyword matching ──────────────────────────
      const localResults = matchByKeyword(trimmed, candidates);
      addResults(localResults);
      updateStep('local', {
        status: 'done',
        detail: localResults.length > 0
          ? `找到 ${localResults.length} 条直接匹配`
          : '未找到直接匹配，尝试AI语义搜索'
      });

      // ── Round 2 & 3: 根据本地结果决定策略 ───────────────────────
      console.log('[SmartQuery] Round 1 done, localResults:', localResults.length);

      // 始终调用 AI 语义搜索（不管本地有没有结果）
      updateStep('intent', { status: 'done', detail: '跳过意图解析，直接语义搜索' });
      updateStep('expand', { status: 'loading' });

      try {
        console.log('[SmartQuery] calling semanticSearchReflections...');
        const semanticResults = await semanticSearchReflections(reflections, trimmed);
        console.log('[SmartQuery] semanticResults:', semanticResults.length);

        if (semanticResults.length > 0) {
          usedAI = true;
          const sorted = semanticResults.sort((a, b) => b.relevance - a.relevance);
          const aiReflections = sorted
            .map(r => reflections[r.reflectionIndex])
            .filter(Boolean);
          addResults(aiReflections);
          updateStep('expand', {
            status: 'done',
            detail: `AI 语义匹配 ${semanticResults.length} 条，共 ${allResults.size} 条`
          });
        } else {
          // AI 无结果，降级为关键词扩展
          const topicResults = matchByKeyword(trimmed, reflections);
          addResults(topicResults);
          updateStep('expand', {
            status: 'done',
            detail: `AI 无结果，关键词扩展 ${topicResults.length} 条`
          });
        }
      } catch (e) {
        console.log('[SmartQuery] semantic search failed:', e);
        const topicResults = matchByKeyword(trimmed, reflections);
        addResults(topicResults);
        updateStep('expand', {
          status: 'done',
          detail: `AI 失败，本地扩展 ${topicResults.length} 条`
        });
      }

      // ── Round 4: Mood-based search ──────────────────────────────
      updateStep('mood', { status: 'loading' });

      // 从查询中提取情绪关键词
      const emotionalKeywords = extractEmotionalContext(trimmed);
      if (emotionalKeywords.length > 0) {
        const moodQuery = emotionalKeywords.join(' ');
        const moodResults = matchByKeyword(moodQuery, reflections);
        addResults(moodResults);
        updateStep('mood', {
          status: 'done',
          detail: `情绪匹配增加 ${moodResults.length} 条`
        });
      } else {
        updateStep('mood', { status: 'done', detail: '无明显情绪特征' });
      }

      // ── Round 5: Merge and rank results ─────────────────────────
      updateStep('merge', { status: 'loading' });

      const finalResults = Array.from(allResults.values());

      // Sort by relevance: direct keyword match first, then by timestamp
      const keywordSet = new Set(trimmed.toLowerCase().split(/\s+/));
      finalResults.sort((a, b) => {
        const aMatch = a.content.toLowerCase().split(/\s+/).some(w => keywordSet.has(w)) ? 1 : 0;
        const bMatch = b.content.toLowerCase().split(/\s+/).some(w => keywordSet.has(w)) ? 1 : 0;
        if (aMatch !== bMatch) return bMatch - aMatch;
        return b.timestamp - a.timestamp;
      });

      setMatchResults(finalResults);
      setMatchMode(usedAI ? 'ai' : 'local');

      updateStep('merge', {
        status: 'done',
        detail: `最终返回 ${finalResults.length} 条相关感念${usedAI ? ' (AI增强)' : ''}`
      });

    } catch (e) {
      console.log('[SmartQuery] error:', e);
      const fallback = matchByKeyword(trimmed, candidates);
      setMatchResults(fallback);
      setMatchMode('local');
      setSmartResult(null);
      setAnalysisSteps(prev => prev.map(s =>
        s.status === 'loading' ? { ...s, status: 'error' as const, detail: '已降级为本地匹配' } : s
      ));
    } finally {
      setIsSmartParsing(false);
      setTimeout(() => setIsAnalyzing(false), 2000);
    }
  }, [searchQuery, reflections, candidates, chatHistory, aiAvailable, timeRange, selectedTags, selectedMoods, updateStep]);

  // Keep ref always pointing to latest handleSmartQuery
  handleSmartQueryRef.current = handleSmartQuery;

  const handleSmartAnswer = useCallback((answer: string) => {
    setChatHistory(prev => [...prev, answer]);
    // 触发重新查询
    setTimeout(() => { handleSmartQuery(); }, 100);
  }, [handleSmartQuery]);

  const handleClear = useCallback(() => {
    setSearchQuery('');
    setMatchMode('idle');
    setMatchResults([]);
    setSmartResult(null);
    setChatHistory([]);
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

  // ── Render helpers ────────────────────────────────────────────
  const timeRangeLabel = TIME_RANGE_OPTIONS.find(o => o.key === timeRange)?.labelKey ?? 'thisMonth';

  const showInsightPanel = !searchQuery;
  const showMatchResults = matchMode !== 'idle' || searchQuery.length > 0;

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
          <TouchableOpacity onPress={() => nav.goBack()}>
            <X size={24} color={TH.sub} />
          </TouchableOpacity>
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
                onSubmitEditing={searchQuery.trim().length > 1 ? handleSmartQuery : handleLocalSearch}
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

              {/* Bottom row: smart indicator + actions */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                {/* Smart mode indicator */}
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
                  backgroundColor: isSmartParsing ? '#8B5CF615' : `${TH.sub}10`,
                }}>
                  <Text style={{
                    fontSize: FONT_TINY,
                    color: isSmartParsing ? '#8B5CF6' : TH.sub,
                    fontWeight: isSmartParsing ? '600' : '400',
                  }}>
                    {isSmartParsing ? '🧠 智能解析中...' : '🧠 智能'}
                  </Text>
                </View>

                {/* Action buttons */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {matchMode === 'ai-loading' && (
                    <Text style={{ fontSize: FONT_TINY, color: TH.sub }}>⏳</Text>
                  )}
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={handleClear} style={{ padding: 4 }}>
                      <X size={16} color={TH.sub} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={searchQuery.trim().length > 1 ? handleSmartQuery : handleLocalSearch}
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
                      onPress={() => { setTimeRange(opt.key); setShowTimeDropdown(false); }}
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

          {/* ── Match results section ── */}
          {showMatchResults && (
            <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
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

                  {matchResults.map(ref => (
                    <ReflectionCheckItem
                      key={ref.id}
                      ref={ref}
                      isSelected={selectedIds.has(ref.id)}
                      onToggle={() => toggleSelect(ref.id)}
                    />
                  ))}
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
