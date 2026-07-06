import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../../navigation/types';
import {
  ArrowLeft, X, Send, Check, ChevronDown,
  RefreshCw, Plus, Sparkles, Loader2,
} from 'lucide-react-native';
import { useAppStore, useShallowStore } from '../../../store/useAppStore';
import { useTheme, useT } from '../../../components/UI';
import {
  FONT_TITLE, FONT_BODY, FONT_SMALL, FONT_TINY, FONT_BUTTON,
  getMoodIcon, generateTrailName, formatDateShort,
} from '@egoless-do/core';
import type { MindReflection } from '@egoless-do/core';
import SelectionSummary from '../shared/SelectionSummary';
import InsightPanel from '../insights/InsightPanel';
import { SmartQueryBubble } from '../insights/SmartQueryBubble';
import { FilterTags } from '../core/FilterTags';
import { AIAnalysisStream, createAnalysisMessages } from '../insights/AIAnalysisStream';
import { useQuickTrailSearch, type TimeRange } from '../hooks/useQuickTrailSearch';
import ReflectionCheckItem from './ReflectionCheckItem';

const TIME_RANGE_OPTIONS: { key: TimeRange; labelKey: string }[] = [
  { key: 'week', labelKey: 'freqThisWeek' },
  { key: 'month', labelKey: 'freqThisMonth' },
  { key: '3months', labelKey: 'last3Months' },
  { key: 'all', labelKey: 'allTime' },
];

export default function QuickCreateTrailScreen() {
  const TH = useTheme();
  const T = useT();
  const nav = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'QuickCreateTrail'>>();
  const { reflections: rawReflections, aiMode, aiModels, createThoughtTrail } = useShallowStore(s => ({
    reflections: s.reflections,
    aiMode: s.aiMode,
    aiModels: s.aiModels,
    createThoughtTrail: s.createThoughtTrail,
  }));

  const initialText = route.params?.initialText ?? '';
  const initialSelectedIds = route.params?.selectedIds ?? [];

  const reflections = useMemo(() =>
    (rawReflections ?? []).filter(r => !r.deleted),
    [rawReflections]
  );

  const aiConfig = useMemo(() => ({
    mode: aiMode,
    models: aiModels,
  }), [aiMode, aiModels]);

  const {
    searchQuery, setSearchQuery,
    timeRange, setTimeRange,
    selectedTags, setSelectedTags, toggleTag,
    selectedMoods, setSelectedMoods, toggleMood,
    matchMode, matchResults,
    smartResult, setSmartResult,
    analysisSteps, isAnalyzing,
    aiDegraded,
    selectedIds, setSelectedIds,
    trailName, setTrailName,
    page, setPage,
    searchHistory,
    isAISearching,
    chatHistory,
    reflectionsMap, userTags, userMoods, aiAvailable,
    selectedReflections, selectedMoodsList, selectedDateRange,
    PAGE_SIZE,
    handleSmartQuery, handleAISearch, handleSmartAnswer, handleClear,
    handleLocalSearch, handleRemoveFilter,
    resetFilters,
  } = useQuickTrailSearch(reflections, initialText, T, aiConfig);

  // ── UI-only state ─────────────────────────────────────────────
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showMoodDropdown, setShowMoodDropdown] = useState(false);
  const [skipThreshold, setSkipThreshold] = useState(false);
  const [showPreview, setShowPreview] = useState(initialSelectedIds.length > 0);

  // ── Selection with initial IDs ────────────────────────────────
  const initializedRef = React.useRef(false);
  if (!initializedRef.current && initialSelectedIds.length > 0) {
    setSelectedIds(new Set(initialSelectedIds));
    initializedRef.current = true;
  }

  // Auto-generate trail name when selection changes
  React.useEffect(() => {
    if (selectedIds.size > 0 && !trailName) {
      const name = generateTrailName(selectedReflections, T);
      setTrailName(name);
    } else if (selectedIds.size === 0) {
      setTrailName('');
    }
  }, [selectedIds.size, selectedReflections, trailName, T]);

  // ── Component-level handlers ──────────────────────────────────
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [setSelectedIds]);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(matchResults.map(r => r.id)));
  }, [matchResults, setSelectedIds]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, [setSelectedIds]);

  const handleOnlyUnassigned = useCallback(() => {
    const list = matchResults.filter(r => !r.thoughtTrailIds?.length).map(r => r.id);
    setSelectedIds(new Set(list));
  }, [matchResults, setSelectedIds]);

  const handleCreate = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const name = trailName || generateTrailName(
      ids.map(id => reflectionsMap.get(id)).filter(Boolean) as MindReflection[],
      T
    );

    const trailId = createThoughtTrail(name, '', ids, 'manual');

    setSelectedIds(new Set());
    setTrailName('');
    nav.navigate('ThoughtTrailDetail', { trailId });
  }, [selectedIds, trailName, reflectionsMap, createThoughtTrail, nav, T, setSelectedIds, setTrailName]);

  const handleGoRecord = useCallback(() => {
    nav.navigate('Reflections' as never, { showNew: true } as never);
  }, [nav]);

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
            onPress={() => nav.navigate('Reflections' as never, { showNew: true } as never)}
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
              onComplete={() => {}}
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
                        const label = T(opt.labelKey);
                        setSearchQuery(q => {
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
              ) : (
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
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── ReflectionCheckItem moved to ./ReflectionCheckItem.tsx ──────
