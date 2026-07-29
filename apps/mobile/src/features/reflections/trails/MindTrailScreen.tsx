import {FONT_TITLE, FONT_TINY, FONT_BODY, FONT_SMALL, FONT_LABEL, createLogger, MS_PER_DAY,
  getTrailStats, getMoodIcon,
  computeRecommendations, applyUserPreferences, buildIgnoredPattern, mergeAndRank,
  isAIRecommendAvailable, parseSmartQuery, matchReflectionsToTopic, matchByKeyword, computeCandidatePool,
  recommendTrailsViaAI } from '@egoless-do/core';
import type { TrailRecommendation, SmartQueryResult, TrailFilters, MindReflection, ThoughtTrail } from '@egoless-do/core';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ArrowLeft, Plus, Zap, Send, RefreshCw, X, Trash2 } from 'lucide-react-native';
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, StyleSheet, Alert, ListRenderItemInfo } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT } from '../../../components/UI';
import type { RootStackParamList } from '../../../navigation/types';
import { safeGetItem, safeSetItem } from '../../../store/safeAsyncStorage';
import { useAppStore, useShallowStore } from '../../../store/useAppStore';

const log = createLogger('Reflections');
import RecommendCard from '../insights/RecommendCard';

import CreateThoughtTrailModal from './CreateThoughtTrailModal';
import SmartQueryPanel from './SmartQueryPanel';

const TRAIL_IGNORED_KEY = 'trailIgnoredPatterns';

export default function MindTrailScreen() {
  // ═══════════════════════════════════════════════════════════════
  // Section 1: Store Data & Navigation
  // ═══════════════════════════════════════════════════════════════
  const TH = useTheme();
  const T = useT();
  const { ignoredRecPatterns, aiMode, aiModels, thoughtTrails: rawThoughtTrails, reflections: rawReflections, createThoughtTrail, deleteThoughtTrail, addIgnoredRecPattern } = useShallowStore(s => ({
    ignoredRecPatterns: s.ignoredRecPatterns,
    aiMode: s.aiMode,
    aiModels: s.aiModels,
    thoughtTrails: s.thoughtTrails,
    reflections: s.reflections,
    createThoughtTrail: s.createThoughtTrail,
    deleteThoughtTrail: s.deleteThoughtTrail,
    addIgnoredRecPattern: s.addIgnoredRecPattern,
  }));
  const nav = useNavigation<StackNavigationProp<RootStackParamList>>();

  // ═══════════════════════════════════════════════════════════════
  // Section 2: Local State & Refs
  // ═══════════════════════════════════════════════════════════════
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inputText, setInputText] = useState('');
  const [recommendations, setRecommendations] = useState<TrailRecommendation[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const aiGenerationRef = useRef(0);
  const smartAnswerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (smartAnswerTimerRef.current) clearTimeout(smartAnswerTimerRef.current); }, []);
  useEffect(() => () => { if (smartAbortRef.current) smartAbortRef.current.abort(); }, []);

  // Smart query state (integrated into bottom input)
  const [smartResult, setSmartResult] = useState<SmartQueryResult | null>(null);
  const [chatHistory, setChatHistory] = useState<string[]>([]);
  const chatHistoryRef = useRef<string[]>([]);
  const [isSmartParsing, setIsSmartParsing] = useState(false);
  const [queryResults, setQueryResults] = useState<MindReflection[]>([]);
  const [showQueryPanel, setShowQueryPanel] = useState(false);
  const smartAbortRef = useRef<AbortController | null>(null);

  // AsyncStorage-based ignored patterns (persists across sessions, local only)
  const ignoredPatternsRef = useRef<string[]>([]);
  const [ignoredVersion, setIgnoredVersion] = useState(0);
  useEffect(() => {
    void safeGetItem(TRAIL_IGNORED_KEY).then(raw => {
      if (raw) {
        try { ignoredPatternsRef.current = JSON.parse(raw) as string[]; } catch { /* corrupted cache — ignore */ }
      }
    });
  }, []);

  // All ignored patterns: merge store (session) + AsyncStorage (persistent)
  const allIgnoredPatterns = useMemo(() => {
    const storePatterns = ignoredRecPatterns ?? [];
    return [...new Set([...storePatterns, ...ignoredPatternsRef.current])];
  }, [ignoredRecPatterns, ignoredVersion]);

  // ═══════════════════════════════════════════════════════════════
  // Section 3: Data Filtering & AI Availability
  // ═══════════════════════════════════════════════════════════════
  const aiAvailable = useMemo(() => {
    return isAIRecommendAvailable({ mode: aiMode, models: aiModels });
  }, [aiMode, aiModels]);

  const thoughtTrails = useMemo(() =>
    (rawThoughtTrails ?? []).filter(t => !t.deleted),
    [rawThoughtTrails]
  );

  const manualTrails = useMemo(() =>
    thoughtTrails.filter(t => t.source === 'manual' || !t.source),
    [thoughtTrails]
  );

  const aiTrails = useMemo(() =>
    thoughtTrails.filter(t => t.source === 'ai'),
    [thoughtTrails]
  );

  const reflections = useMemo(() =>
    (rawReflections ?? []).filter(r => !r.deleted),
    [rawReflections]
  );

  // 推荐候选源：最近 30 天内、未分配到任何思维脉络的感念
  const recommendationCandidates = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * MS_PER_DAY;
    return reflections.filter(r =>
      r.timestamp >= thirtyDaysAgo &&
      (!r.thoughtTrailIds || r.thoughtTrailIds.length === 0)
    );
  }, [reflections]);

  // ═══════════════════════════════════════════════════════════════
  // Section 4: Recommendation Engine
  // ═══════════════════════════════════════════════════════════════

  // Progressive loading: local first, then AI
  // 用 ref 读取 thoughtTrails 和 ignoredPatterns，避免 store rehydration 触发 effect 重新执行
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);
  const thoughtTrailsRef = useRef(thoughtTrails);
  thoughtTrailsRef.current = thoughtTrails;
  const ignoredPatternsForRecsRef = useRef(allIgnoredPatterns);
  ignoredPatternsForRecsRef.current = allIgnoredPatterns;

  useEffect(() => {
    // 候选不足 3 条时不推荐
    if (recommendationCandidates.length < 3) {
      setRecommendations([]);
      setIsLoadingRecs(false);
      return;
    }

    const currentTrails = thoughtTrailsRef.current;
    const currentIgnored = ignoredPatternsForRecsRef.current;
    // 用 generation 计数器代替 abort：旧请求自然完成但不采用结果
    const gen = ++aiGenerationRef.current;

    const loadRecs = async () => {
      setIsLoadingRecs(true);
      setIsAILoading(false);

      try {
        // Step 1: Load local recommendations immediately (<100ms)
        const localRecs = computeRecommendations(recommendationCandidates, currentTrails).slice(0, 2);
        const localWithReason = localRecs.map(rec => ({
          ...rec,
          reason: rec.reason || '',
          source: 'local' as const,
        }));
        const withPrefs = applyUserPreferences(localWithReason, currentIgnored);
        if (!mountedRef.current) return;
        setRecommendations(withPrefs);
        setIsLoadingRecs(false);

        // Step 2: Load AI recommendations in background (if available)
        if (aiAvailable && recommendationCandidates.length >= 3) {
          setIsAILoading(true);

          try {
            const aiResult = await recommendTrailsViaAI(recommendationCandidates);
            // 如果 effect 已经重新执行（新一轮），忽略旧结果
            if (aiGenerationRef.current !== gen) return;
            if (aiResult.recommendations.length > 0) {
              const tgt = aiResult.targetReflections;
              const aiRecs: TrailRecommendation[] = aiResult.recommendations.slice(0, 2).map(rec => ({
                name: rec.name,
                narrative: rec.description,
                reflectionIds: rec.reflectionIndices.map(i => tgt[i]?.id).filter(Boolean),
                moods: rec.reflectionIndices.map(i => tgt[i]?.mood).filter(Boolean) as string[],
                primaryTag: '',
                startDate: rec.reflectionIndices.length > 0 ? Math.min(...rec.reflectionIndices.map(i => tgt[i]?.timestamp ?? Infinity)) : Date.now(),
                endDate: rec.reflectionIndices.length > 0 ? Math.max(...rec.reflectionIndices.map(i => tgt[i]?.timestamp ?? -Infinity)) : Date.now(),
                spanDays: 1,
                trend: 'flat' as const,
                assignedCount: 0,
                score: rec.confidence,
                type: 'ai' as const,
                reason: rec.description,
                source: 'ai' as const,
              }));

              // 使用 mergeAndRank 替代简单拼接，>50% 重叠去重
              const latestIgnored = ignoredPatternsForRecsRef.current;
              const merged = mergeAndRank(localWithReason, aiRecs).slice(0, 2);
              const mergedWithPrefs = applyUserPreferences(merged, latestIgnored);
              if (mountedRef.current) setRecommendations(mergedWithPrefs);
            }
          } catch (e) {
            log.debug('AI recommendations failed (using local only):', e);
          } finally {
            if (aiGenerationRef.current === gen) {
              setIsAILoading(false);
            }
          }
        }
      } catch (e) {
        log.error(e, { message: 'Failed to load recommendations' });
        if (mountedRef.current) setIsLoadingRecs(false);
      }
    };

    void loadRecs();
  }, [recommendationCandidates, aiAvailable, refreshKey]);

  const visibleRecs = recommendations;

  const handleCreateTrail = useCallback((trailId: string) => {
    nav.navigate('ThoughtTrailDetail', { trailId });
  }, [nav]);

  const handleOneClickCreate = useCallback((rec: TrailRecommendation) => {
    const trailId = createThoughtTrail(rec.name, rec.reason || rec.narrative, rec.reflectionIds, 'ai');
    setRecommendations(prev => prev.filter(r => r !== rec));
    Alert.alert('创建成功', `「${rec.name}」已创建`, [
      { text: '查看详情', onPress: () => nav.navigate('ThoughtTrailDetail', { trailId }) },
      { text: '继续浏览', style: 'cancel' },
    ]);
  }, [createThoughtTrail, nav]);

  const handleCustomCreate = useCallback((rec: TrailRecommendation) => {
    setRecommendations(prev => prev.filter(r => r !== rec));
    nav.navigate('QuickCreateTrail', { selectedIds: rec.reflectionIds });
  }, [nav]);

  const handleNotInterested = useCallback((rec: TrailRecommendation) => {
    const pattern = buildIgnoredPattern(rec);
    addIgnoredRecPattern(pattern);
    // 同时写入 AsyncStorage，确保重启后仍然忽略
    const next = [...new Set([...ignoredPatternsRef.current, pattern])];
    ignoredPatternsRef.current = next;
    safeSetItem(TRAIL_IGNORED_KEY, JSON.stringify(next)).catch((e) => log.error(e));
    // 触发 allIgnoredPatterns 重新计算
    setIgnoredVersion(k => k + 1);
    setRecommendations(prev => prev.filter(r => r !== rec));
  }, [addIgnoredRecPattern]);

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const handleDeleteTrail = useCallback((trailId: string, trailName: string) => {
    Alert.alert(
      '删除思维脉络',
      `确定要删除「${trailName}」吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => deleteThoughtTrail(trailId),
        },
      ]
    );
  }, [deleteThoughtTrail]);

  // Smart query handlers
  const handleSmartQuery = useCallback(async (text?: string) => {
    const trimmed = (text ?? inputText).trim();
    if (!trimmed) {
      setSmartResult(null);
      setQueryResults([]);
      setShowQueryPanel(false);
      return;
    }

    // 短输入：直接跳转
    if (trimmed.length <= 6) {
      setInputText('');
      nav.navigate('QuickCreateTrail', { initialText: trimmed });
      return;
    }

    // 长输入：智能查询
    setShowQueryPanel(true);
    setIsSmartParsing(true);

    // Cancel previous smart query
    if (smartAbortRef.current) {
      smartAbortRef.current.abort();
    }
    const controller = new AbortController();
    smartAbortRef.current = controller;

    if (!aiAvailable) {
      const localResults = matchByKeyword(trimmed, reflections);
      setQueryResults(localResults);
      setIsSmartParsing(false);
      return;
    }

    try {
      const result = await parseSmartQuery(reflections, trimmed, chatHistoryRef.current, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setSmartResult(result);

      if (result.question && chatHistoryRef.current.length < 3) {
        setIsSmartParsing(false);
        return;
      }

      const filters: TrailFilters = {
        timeRange: result.filters.timeRange || 'all',
        tags: result.filters.tags || [],
        moods: result.filters.moods || [],
      };
      const filteredCandidates = computeCandidatePool(reflections, filters);
      const topic = result.topic || trimmed;

      const aiResults = await matchReflectionsToTopic(filteredCandidates, topic, { signal: controller.signal });
      if (controller.signal.aborted) return;
      const localResults = matchByKeyword(topic, filteredCandidates);

      if (aiResults.length > 0) {
        const aiReflections = aiResults
          .map(r => filteredCandidates[r.reflectionIndex])
          .filter(Boolean);
        const localIds = new Set(localResults.map(r => r.id));
        const merged = [...localResults];
        for (const r of aiReflections) {
          if (!localIds.has(r.id)) merged.push(r);
        }
        setQueryResults(merged);
      } else {
        setQueryResults(localResults);
      }
    } catch (e) {
      if (controller.signal.aborted) return;
      log.debug('SmartQuery error:', e);
      setQueryResults(matchByKeyword(trimmed, reflections));
      setSmartResult(null);
    } finally {
      if (!controller.signal.aborted) {
        setIsSmartParsing(false);
      }
    }
  }, [inputText, reflections, aiAvailable, nav]);

  const handleSmartAnswer = useCallback((answer: string) => {
    setChatHistory(prev => {
      const next = [...prev, answer];
      chatHistoryRef.current = next;
      return next;
    });
    if (smartAnswerTimerRef.current) clearTimeout(smartAnswerTimerRef.current);
    smartAnswerTimerRef.current = setTimeout(() => { void handleSmartQuery(answer); }, 100);
  }, [handleSmartQuery]);

  const handleCloseQueryPanel = useCallback(() => {
    if (smartAbortRef.current) {
      smartAbortRef.current.abort();
    }
    setShowQueryPanel(false);
    setSmartResult(null);
    setQueryResults([]);
    setChatHistory([]);
    setInputText('');
  }, []);

  const handleSubmitEditing = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;

    if (text.length <= 6) {
      setInputText('');
      nav.navigate('QuickCreateTrail', { initialText: text });
    } else {
      void handleSmartQuery(text);
    }
  }, [inputText, nav, handleSmartQuery]);

  // ── FlatList data building ──
  type TrailFlatItem =
    | { type: 'manual-header' }
    | { type: 'manual-empty' }
    | { type: 'manual-trail'; trail: ThoughtTrail; stats: ReturnType<typeof getTrailStats> }
    | { type: 'ai-header' }
    | { type: 'ai-trail'; trail: ThoughtTrail; stats: ReturnType<typeof getTrailStats> }
    | { type: 'rec-header' }
    | { type: 'rec-item'; rec: TrailRecommendation; realIdx: number }
    | { type: 'rec-refresh' }
    | { type: 'rec-empty' };

  const trailFlatData: TrailFlatItem[] = useMemo(() => {
    const items: TrailFlatItem[] = [];

    // Manual Trails section
    items.push({ type: 'manual-header' });
    if (manualTrails.length === 0) {
      items.push({ type: 'manual-empty' });
    } else {
      for (const trail of manualTrails) {
        items.push({ type: 'manual-trail', trail, stats: getTrailStats(trail, reflections) });
      }
    }

    // AI Trails section
    if (aiTrails.length > 0) {
      items.push({ type: 'ai-header' });
      for (const trail of aiTrails) {
        items.push({ type: 'ai-trail', trail, stats: getTrailStats(trail, reflections) });
      }
    }

    // Recommendations section
    items.push({ type: 'rec-header' });
    if (visibleRecs.length > 0) {
      visibleRecs.forEach((rec, _i) => {
        items.push({ type: 'rec-item', rec, realIdx: recommendations.indexOf(rec) });
      });
      items.push({ type: 'rec-refresh' });
    } else if (!isLoadingRecs) {
      items.push({ type: 'rec-empty' });
    }

    return items;
  }, [manualTrails, aiTrails, visibleRecs, reflections, isLoadingRecs, recommendations]);

  const trailKeyExtractor = useCallback((item: TrailFlatItem, index: number) => {
    if (item.type === 'manual-trail') return `manual-${item.trail.id}`;
    if (item.type === 'ai-trail') return `ai-${item.trail.id}`;
    if (item.type === 'rec-item') return `rec-${item.realIdx}`;
    return `${item.type}-${index}`;
  }, []);

  const renderTrailItem = useCallback(({ item }: ListRenderItemInfo<TrailFlatItem>) => {
    switch (item.type) {
      case 'manual-header':
        return (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: TH.text }]}>
              {T('thoughtTrail')} ({manualTrails.length})
            </Text>
          </View>
        );
      case 'manual-empty':
        return (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: TH.sub }]}>暂无手动创建的脉络</Text>
          </View>
        );
      case 'manual-trail': {
        const stats = item.stats;
        return (
          <TouchableOpacity
            onPress={() => nav.navigate('ThoughtTrailDetail', { trailId: item.trail.id })}
            style={[styles.trailCard, { backgroundColor: TH.cardSolid, borderColor: TH.border }]}
          >
            <View style={styles.trailCardHeader}>
              <Text style={[styles.trailName, { color: TH.text, flex: 1 }]}>{item.trail.name}</Text>
              <TouchableOpacity
                onPress={() => handleDeleteTrail(item.trail.id, item.trail.name)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Trash2 size={16} color={TH.sub} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.trailInfo, { color: TH.sub }]}>
              {String(stats.count)} {T('thoughtTrailReflections')}
              {stats.dateRange ? ` · ${stats.dateRange.start} ~ ${stats.dateRange.end}` : ''}
            </Text>
            {stats.moodChanges.length > 0 && (
              <Text style={[styles.moodChanges, { color: TH.sub }]}>
                心情变化: {stats.moodChanges.map(m => getMoodIcon(m)).join(' → ')}
              </Text>
            )}
          </TouchableOpacity>
        );
      }
      case 'ai-header':
        return (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: TH.text }]}>
              AI 创建的脉络 ({aiTrails.length})
            </Text>
          </View>
        );
      case 'ai-trail': {
        const stats = item.stats;
        return (
          <TouchableOpacity
            onPress={() => nav.navigate('ThoughtTrailDetail', { trailId: item.trail.id })}
            style={[styles.trailCard, { backgroundColor: TH.cardSolid, borderColor: TH.border }]}
          >
            <View style={styles.trailCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                <View style={{
                  backgroundColor: '#8B5CF620', borderRadius: 4,
                  paddingHorizontal: 6, paddingVertical: 2,
                }}>
                  <Text style={{ fontSize: FONT_TINY(), color: '#8B5CF6' }}>AI</Text>
                </View>
                <Text style={[styles.trailName, { color: TH.text, marginBottom: 0 }]}>{item.trail.name}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteTrail(item.trail.id, item.trail.name)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Trash2 size={16} color={TH.sub} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.trailInfo, { color: TH.sub }]}>
              {String(stats.count)} {T('thoughtTrailReflections')}
              {stats.dateRange ? ` · ${stats.dateRange.start} ~ ${stats.dateRange.end}` : ''}
            </Text>
            {stats.moodChanges.length > 0 && (
              <Text style={[styles.moodChanges, { color: TH.sub }]}>
                心情变化: {stats.moodChanges.map(m => getMoodIcon(m)).join(' → ')}
              </Text>
            )}
          </TouchableOpacity>
        );
      }
      case 'rec-header':
        return (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: TH.text }]}>
              推荐思维脉络
            </Text>
            {isLoadingRecs && (
              <Text style={{ fontSize: FONT_TINY(), color: TH.sub }}>加载中...</Text>
            )}
            {isAILoading && !isLoadingRecs && (
              <Text style={{ fontSize: FONT_TINY(), color: TH.primary }}>AI 推荐加载中...</Text>
            )}
          </View>
        );
      case 'rec-item':
        return (
          <RecommendCard
            rec={item.rec}
            onOneClickCreate={handleOneClickCreate}
            onCustomCreate={handleCustomCreate}
            onNotInterested={handleNotInterested}
          />
        );
      case 'rec-refresh':
        return (
          <TouchableOpacity
            onPress={handleRefresh}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 6, paddingVertical: 12,
            }}
          >
            <RefreshCw size={14} color={TH.primary} />
            <Text style={{ fontSize: FONT_SMALL(), color: TH.primary }}>换一批</Text>
          </TouchableOpacity>
        );
      case 'rec-empty':
        return (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: TH.sub }]}>暂无推荐</Text>
            <Text style={[styles.emptyText, { color: TH.sub, marginTop: 4 }]}>
              多记录感念后会自动生成推荐
            </Text>
          </View>
        );
    }
    return null;
  }, [
    TH, T, nav, manualTrails, aiTrails, isLoadingRecs, isAILoading,
    handleDeleteTrail, handleOneClickCreate, handleCustomCreate,
    handleNotInterested, handleRefresh,
  ]);

  // ═══════════════════════════════════════════════════════════════
  // Section 5: Render
  // ═══════════════════════════════════════════════════════════════

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={TH.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: TH.text }]}>{T('mindTrail')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <FlatList
        data={trailFlatData}
        renderItem={renderTrailItem}
        keyExtractor={trailKeyExtractor}
        removeClippedSubviews={true}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Smart Query Panel */}
      <SmartQueryPanel
        show={showQueryPanel}
        onClose={handleCloseQueryPanel}
        smartResult={smartResult}
        onSmartAnswer={handleSmartAnswer}
        onSmartQuery={handleSmartQuery}
        isSmartParsing={isSmartParsing}
        queryResults={queryResults}
        onQuickCreate={(selectedIds) => {
          handleCloseQueryPanel();
          nav.navigate('QuickCreateTrail', { selectedIds });
        }}
        chatHistory={chatHistory}
      />

      {/* Bottom Bar */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.bottomBar, { backgroundColor: TH.bg, borderTopColor: TH.border }]}>
          <View style={[styles.inputRow, { backgroundColor: TH.card, borderColor: TH.border }]}>
            <Zap size={16} color="#8B5CF6" />
            <TextInput
              style={[styles.input, { color: TH.text }]}
              placeholder="描述你想追踪的思维脉络..."
              placeholderTextColor={TH.sub}
              value={inputText}
              onChangeText={setInputText}
              returnKeyType="send"
              onSubmitEditing={handleSubmitEditing}
            />
            {inputText.length > 0 && (
              <TouchableOpacity onPress={() => { setInputText(''); handleCloseQueryPanel(); }}>
                <X size={16} color={TH.sub} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleSubmitEditing}
              style={[styles.sendBtn, { backgroundColor: inputText.trim() ? '#8B5CF6' : `${TH.sub}20` }]}
            >
              <Send size={16} color={inputText.trim() ? '#fff' : TH.sub} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            style={[styles.manualBtn, { borderColor: TH.primary }]}
          >
            <Plus size={18} color={TH.primary} />
            <Text style={[styles.manualBtnText, { color: TH.primary }]}>{T('manualCreateTrail')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Create Modal */}
      <CreateThoughtTrailModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateTrail}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_TITLE(),
    fontWeight: '700',
  },
  tabContent: {
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: FONT_LABEL(),
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: FONT_BODY(),
  },
  trailCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  trailCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  trailName: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
    marginBottom: 4,
  },
  trailInfo: {
    fontSize: FONT_SMALL(),
    marginBottom: 4,
  },
  moodChanges: {
    fontSize: FONT_SMALL(),
  },
  queryPanel: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: FONT_BODY(),
    paddingVertical: 4,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  manualBtnText: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
  },
});
