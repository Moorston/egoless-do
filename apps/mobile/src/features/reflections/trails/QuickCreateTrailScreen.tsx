import {FONT_TITLE, FONT_BODY, FONT_SMALL, FONT_TINY, FONT_BUTTON,
  getMoodIcon, generateTrailName, formatDateShort, scaleFontSize, FONT_HERO} from '@egoless-do/core';
import type { MindReflection } from '@egoless-do/core';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  ArrowLeft, X, Send,
  RefreshCw, Plus, Sparkles, Loader2,
} from 'lucide-react-native';
import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT } from '../../../components/UI';
import type { RootStackParamList } from '../../../navigation/types';
import { useShallowStore } from '../../../store/useAppStore';
import { FilterTags } from '../core/FilterTags';
import { useQuickTrailSearch, type MatchMode, type TimeRange } from '../hooks/useQuickTrailSearch';
import { AIAnalysisStream, createAnalysisMessages } from '../insights/AIAnalysisStream';
import InsightPanel from '../insights/InsightPanel';
import { SmartQueryBubble } from '../insights/SmartQueryBubble';
import SelectionSummary from '../shared/SelectionSummary';

import { FilterDropdown } from './FilterDropdown';
import ReflectionCheckItem from './ReflectionCheckItem';

const TIME_RANGE_OPTIONS: { key: TimeRange; labelKey: string }[] = [
  { key: 'week', labelKey: 'freqThisWeek' },
  { key: 'month', labelKey: 'freqThisMonth' },
  { key: '3months', labelKey: 'last3Months' },
  { key: 'all', labelKey: 'allTime' },
];

/**
 * Section 显隐/门槛标志派生 —— 从主函数提取，收拢条件分支（与原行内派生逐字等价）：
 * - showThresholdGate: 感念不足 5 条且用户未选择手动继续
 * - hasActiveFilters: 任一筛选激活（重置按钮可见）
 * - showInsightPanel / showMatchResults / showPreviewSection: 三段互斥展示
 */
function deriveSectionFlags(
  reflectionsCount: number,
  skipThreshold: boolean,
  searchQuery: string,
  showPreview: boolean,
  matchMode: MatchMode,
  selectedIdsCount: number,
  selectedTagsCount: number,
  selectedMoodsCount: number,
  timeRange: TimeRange,
) {
  const showMatchResults = matchMode !== 'idle' || searchQuery.length > 0;
  return {
    showThresholdGate: reflectionsCount < 5 && !skipThreshold,
    hasActiveFilters: selectedTagsCount > 0 || selectedMoodsCount > 0 || timeRange !== 'month',
    showInsightPanel: !searchQuery && !showPreview,
    showMatchResults,
    showPreviewSection: showPreview && selectedIdsCount > 0 && !showMatchResults,
    timeRangeLabelKey: TIME_RANGE_OPTIONS.find(o => o.key === timeRange)?.labelKey ?? 'thisMonth',
  };
}

/** Dropdown 触发文案：有选中带计数，无选中去 " (n)" 后缀 */
function formatTriggerLabel(template: string, count: number): string {
  return count > 0
    ? template.replace('{n}', String(count))
    : template.replace(' ({n})', '');
}

// Main screen: state wiring + section composition. Sections extracted as
// sub-components (below) and FilterDropdown; remaining length is handler wiring.
// Only max-lines exceeded — complexity is ≤15.
// eslint-disable-next-line max-lines-per-function
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
  // 三个 dropdown 互斥展开（同时最多一个开）——单枚举归口
  const [openDropdown, setOpenDropdown] = useState<'time' | 'tags' | 'moods' | null>(null);
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
  }, [selectedIds.size, selectedReflections, trailName, T, setTrailName]);

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
    (nav.navigate as (route: string, params: Record<string, unknown>) => void)('Reflections', { showNew: true });
  }, [nav]);

  // 时间范围为单选：选中即关闭菜单，并把搜索词里的旧时间标签替换为新标签
  const handleTimeRangeSelect = useCallback((key: string) => {
    const opt = TIME_RANGE_OPTIONS.find(o => o.key === key);
    if (!opt) return;
    setTimeRange(opt.key);
    setOpenDropdown(null);
    const label = T(opt.labelKey);
    setSearchQuery(q => {
      const cleaned = q.replace(new RegExp(`(?:^|\\s)(?:${TIME_RANGE_OPTIONS.map(o => T(o.labelKey)).join('|')})(?=\\s|$)`, 'g'), '').replace(/\s+/g, ' ').trim();
      return cleaned ? `${cleaned} ${label}` : label;
    });
  }, [setTimeRange, setSearchQuery, T]);

  // ── Render helpers ────────────────────────────────────────────
  const {
    showThresholdGate, hasActiveFilters, showInsightPanel, showMatchResults, showPreviewSection,
    timeRangeLabelKey,
  } = deriveSectionFlags(
    reflections.length, skipThreshold, searchQuery, showPreview,
    matchMode, selectedIds.size, selectedTags.length, selectedMoods.length, timeRange,
  );

  // Empty state: not enough reflections (skip if user chose manual mode)
  if (showThresholdGate) {
    return (
      <EmptyThresholdState
        count={reflections.length}
        onBack={() => nav.goBack()}
        onGoRecord={handleGoRecord}
        onSkip={() => setSkipThreshold(true)}
      />
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: TH.bg }]}>
      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => nav.goBack()}>
            <ArrowLeft size={24} color={TH.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: TH.text }]}>{T('quickCreateTrail')}</Text>
          {selectedIds.size > 0 ? (
            <TouchableOpacity
              onPress={handleCreate}
              style={[styles.createBtnSmall, { backgroundColor: TH.primary }]}
            >
              <Text style={styles.createBtnSmallText}>{T('quickTrailConfirmCreate')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => nav.goBack()}>
              <X size={24} color={TH.sub} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          style={styles.flex1}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => { setOpenDropdown(null); }}
        >
          {/* Backdrop: close dropdowns on tap outside */}
          {openDropdown !== null && (
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => { setOpenDropdown(null); }}
              style={styles.backdrop}
            />
          )}

          {/* Smart query bubble */}
          {smartResult?.question && chatHistory.length < 3 && (
            <SmartQueryBubble
              question={smartResult.question}
              onAnswer={handleSmartAnswer}
              onSkip={() => {
                setSmartResult(prev => prev ? { ...prev, question: null } : null);
                void handleSmartQuery();
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

          <ConversationInputSection
            searchQuery={searchQuery}
            onQueryChange={setSearchQuery}
            onSubmit={handleLocalSearch}
            onClear={handleClear}
            onAISearch={handleAISearch}
            aiAvailable={aiAvailable}
            isAISearching={isAISearching}
          />

          {/* Filter row: dropdowns */}
          <View style={styles.filterRow}>
            {/* Time range dropdown */}
            <FilterDropdown
              triggerLabel={T(timeRangeLabelKey)}
              isActive={timeRange !== 'month'}
              activeColor={TH.primary}
              options={TIME_RANGE_OPTIONS.map(o => ({ key: o.key, label: T(o.labelKey) }))}
              activeKeys={[timeRange]}
              onSelect={handleTimeRangeSelect}
              itemStyle="plain"
              scrollable={false}
              isOpen={openDropdown === 'time'}
              onOpenChange={open => setOpenDropdown(open ? 'time' : null)}
            />

            {/* Tags dropdown */}
            <FilterDropdown
              triggerLabel={formatTriggerLabel(T('quickTrailTagsLabel'), selectedTags.length)}
              isActive={selectedTags.length > 0}
              activeColor={TH.primary}
              options={userTags.map(tag => ({ key: tag, label: tag }))}
              activeKeys={selectedTags}
              onSelect={toggleTag}
              onClear={() => setSelectedTags([])}
              allLabel={T('quickTrailFilterAll')}
              itemStyle="checkbox"
              scrollable
              isOpen={openDropdown === 'tags'}
              onOpenChange={open => setOpenDropdown(open ? 'tags' : null)}
            />

            {/* Moods dropdown */}
            <FilterDropdown
              triggerLabel={formatTriggerLabel(T('quickTrailMoodsLabel'), selectedMoods.length)}
              isActive={selectedMoods.length > 0}
              activeColor="#8B5CF6"
              options={userMoods.map(mood => ({ key: mood, label: `${getMoodIcon(mood)} ${mood}` }))}
              activeKeys={selectedMoods}
              onSelect={toggleMood}
              onClear={() => setSelectedMoods([])}
              allLabel={T('quickTrailFilterAll')}
              itemStyle="checkboxMood"
              scrollable
              isOpen={openDropdown === 'moods'}
              onOpenChange={open => setOpenDropdown(open ? 'moods' : null)}
            />
          </View>

          {/* Smart query filter tags */}
          {smartResult && Object.keys(smartResult.filters).length > 0 && (
            <FilterTags
              filters={smartResult.filters}
              onRemoveFilter={handleRemoveFilter}
              onAddPress={() => { setOpenDropdown('time'); }}
            />
          )}

          {/* Reset filters */}
          <ResetFiltersRow visible={hasActiveFilters} onReset={resetFilters} />

          {/* ── Inline creation panel ── */}
          <CreationPanel
            count={selectedIds.size}
            moods={selectedMoodsList}
            dateRange={selectedDateRange}
            reflections={selectedReflections}
            trailName={trailName}
            onTrailNameChange={setTrailName}
            onRegenerateName={() => setTrailName(generateTrailName(selectedReflections, T))}
            onCreate={handleCreate}
          />

          {/* ── Preview: pre-selected reflections ── */}
          <SelectedPreviewSection
            visible={showPreviewSection}
            count={selectedIds.size}
            reflections={selectedReflections}
            onRemove={toggleSelect}
            onAddMore={() => { setShowPreview(false); }}
          />

          {/* ── Insight Panel (empty input) ── */}
          {showInsightPanel && (
            <View style={styles.insightPanelWrapper}>
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
          <SearchHistorySection visible={showInsightPanel} history={searchHistory} onPick={setSearchQuery} />

          {/* ── Match results section ── */}
          <MatchResultsSection
            visible={showMatchResults}
            aiDegraded={aiDegraded}
            matchResults={matchResults}
            selectedIds={selectedIds}
            page={page}
            pageSize={PAGE_SIZE}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onOnlyUnassigned={handleOnlyUnassigned}
            onToggle={toggleSelect}
            onLoadMore={() => setPage(p => p + 1)}
            onResetFilters={resetFilters}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Section sub-components ─────────────────────────────────────────────────
// 从主函数提取的展示性 section（props 显式参数化，与原 JSX 逐字等价）。
// TH/T 由各组件自取（useTheme/useT）；数据与回调全部显式传入。

/** 感念数量门槛拦截页（不足 5 条时的 early return 分支） */
function EmptyThresholdState({ count, onBack, onGoRecord, onSkip }: {
  count: number;
  onBack: () => void;
  onGoRecord: () => void;
  onSkip: () => void;
}) {
  const TH = useTheme();
  const T = useT();
  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safeArea, { backgroundColor: TH.bg }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack}>
          <ArrowLeft size={24} color={TH.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: TH.text }]}>{T('quickCreateTrail')}</Text>
        <TouchableOpacity onPress={onBack}>
          <X size={24} color={TH.sub} />
        </TouchableOpacity>
      </View>

      <View style={styles.emptyCenter}>
        <Text style={styles.emptyEmoji}>📝</Text>
        <Text style={[styles.emptyMessage, { color: TH.text }]}>
          {T('quickTrailNotEnough').replace('{n}', String(count))}
        </Text>
        <Text style={[styles.emptySubtext, { color: TH.sub }]}>
          {T('quickTrailKeepRecording')}
        </Text>
        <TouchableOpacity
          onPress={onGoRecord}
          style={[styles.emptyGoRecordBtn, { backgroundColor: TH.primary }]}
        >
          <Text style={styles.emptyGoRecordText}>{T('quickTrailGoRecord')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onSkip}
          style={styles.skipBtn}
        >
          <Text style={[styles.smallText, { color: TH.primary }]}>{T('quickTrailManualSelect')} →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/** 对话输入框 + 发送/清空动作 + AI 按需搜索按钮 */
function ConversationInputSection({
  searchQuery, onQueryChange, onSubmit, onClear, onAISearch, aiAvailable, isAISearching,
}: {
  searchQuery: string;
  onQueryChange: (q: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  onAISearch: () => void;
  aiAvailable: boolean;
  isAISearching: boolean;
}) {
  const TH = useTheme();
  const T = useT();
  return (
    <>
      {/* Conversation input */}
      <View style={styles.inputSection}>
        <View style={[styles.inputContainer, { backgroundColor: TH.card, borderColor: TH.border }]}>
          <TextInput
            value={searchQuery}
            onChangeText={onQueryChange}
            onSubmitEditing={onSubmit}
            placeholder={T('quickTrailSearchPlaceholder')}
            placeholderTextColor={TH.sub}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={[styles.textInput, { color: TH.text }]}
            returnKeyType="send"
            blurOnSubmit
          />

          {/* Bottom row: actions */}
          <View style={styles.inputActionsRow}>
            <View style={styles.inputActionsInner}>
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={onClear} style={styles.clearBtn}>
                  <X size={16} color={TH.sub} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={onSubmit}
                style={[
                  styles.sendBtn,
                  { backgroundColor: searchQuery.trim() ? TH.primary : `${TH.sub}20` },
                ]}
              >
                <Send size={16} color={searchQuery.trim() ? '#fff' : TH.sub} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* AI on-demand search button */}
      {searchQuery.trim().length > 0 && aiAvailable && (
        <View style={styles.aiSearchSection}>
          <TouchableOpacity
            onPress={onAISearch}
            disabled={isAISearching}
            style={[
              styles.aiSearchBtn,
              {
                backgroundColor: isAISearching ? `${TH.sub}15` : '#8B5CF615',
                borderColor: isAISearching ? TH.border : '#8B5CF630',
                opacity: isAISearching ? 0.7 : 1,
              },
            ]}
          >
            {isAISearching ? (
              <Loader2 size={16} color="#8B5CF6" />
            ) : (
              <Sparkles size={16} color="#8B5CF6" />
            )}
            <Text style={styles.aiSearchBtnText}>
              {isAISearching ? T('aiSearching') : T('aiSearchButton')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

/** 筛选重置按钮（任一筛选激活时可见） */
function ResetFiltersRow({ visible, onReset }: {
  visible: boolean;
  onReset: () => void;
}) {
  const TH = useTheme();
  const T = useT();
  if (!visible) return null;
  return (
    <View style={styles.resetFiltersRow}>
      <TouchableOpacity onPress={onReset}>
        <Text style={{ fontSize: FONT_TINY(), color: TH.sub }}>{T('quickTrailResetFilters')}</Text>
      </TouchableOpacity>
    </View>
  );
}

/** 内联创建面板：选择摘要 + 已分配提示 + 脉络命名 */
function CreationPanel({
  count, moods, dateRange, reflections, trailName, onTrailNameChange, onRegenerateName, onCreate,
}: {
  count: number;
  moods: string[];
  dateRange: { start: number; end: number } | undefined;
  reflections: MindReflection[];
  trailName: string;
  onTrailNameChange: (name: string) => void;
  onRegenerateName: () => void;
  onCreate: () => void;
}) {
  const TH = useTheme();
  const T = useT();
  if (count === 0) return null;
  return (
    <View style={[styles.creationPanel, { backgroundColor: TH.card, borderColor: TH.border }]}>
      <View style={styles.creationPanelHeader}>
        <SelectionSummary
          count={count}
          moods={moods}
          startDate={dateRange?.start}
          endDate={dateRange?.end}
        />
        <TouchableOpacity
          onPress={onCreate}
          style={[styles.createBtnLarge, { backgroundColor: TH.primary }]}
        >
          <Text style={styles.createBtnLargeText}>
            {T('quickTrailCreate')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Assigned notice */}
      {(() => {
        const assignedCount = reflections.filter(r => r.thoughtTrailIds && r.thoughtTrailIds.length > 0).length;
        return assignedCount > 0 ? (
          <Text style={[styles.assignedNotice, { color: TH.sub }]}>
            ℹ️ {T('quickTrailAssignedNotice').replace('{n}', String(assignedCount))} {T('quickTrailAssignedExplain')}
          </Text>
        ) : null;
      })()}

      {/* Trail name input */}
      <View style={[styles.trailNameRow, { borderColor: TH.border, backgroundColor: TH.bg }]}>
        <TextInput
          value={trailName}
          onChangeText={onTrailNameChange}
          placeholder={T('quickTrailNamePlaceholder')}
          placeholderTextColor={TH.sub}
          style={[styles.trailNameInput, { color: TH.text }]}
        />
        <TouchableOpacity onPress={onRegenerateName}>
          <RefreshCw size={14} color={TH.sub} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/** 已选感念预览区（携带初始选中进入时的分支） */
function SelectedPreviewSection({
  visible, count, reflections, onRemove, onAddMore,
}: {
  visible: boolean;
  count: number;
  reflections: MindReflection[];
  onRemove: (id: string) => void;
  onAddMore: () => void;
}) {
  const TH = useTheme();
  const T = useT();
  if (!visible) return null;
  return (
    <View style={styles.previewSection}>
      <View style={[styles.rowBetween, { marginBottom: 12 }]}>
        <Text style={[styles.bodyBold, { color: TH.text }]}>
          {T('quickTrailSelectedPrefix')}{`${count}`}{T('quickTrailReflections')}
        </Text>
        <TouchableOpacity
          onPress={onAddMore}
          style={styles.addMoreBtn}
        >
          <Plus size={14} color={TH.primary} />
          <Text style={[styles.smallTextPrimary, { color: TH.primary }]}>{T('quickTrailAddMore')}</Text>
        </TouchableOpacity>
      </View>

      {reflections.map(ref => (
        <View
          key={ref.id}
          style={[styles.previewCard, { backgroundColor: TH.card, borderColor: TH.primary }]}
        >
          {/* Content */}
          <View style={styles.flex1}>
            <View style={styles.previewMetaRow}>
              <Text style={[styles.smallText, { color: TH.sub }]}>
                {formatDateShort(ref.timestamp)}
              </Text>
              <Text style={styles.previewMoodIcon}>{getMoodIcon(ref.mood)}</Text>
              {ref.tags.slice(0, 2).map(tag => (
                <Text key={tag} style={[styles.previewTag, { color: TH.primary, backgroundColor: `${TH.primary}15` }]}>
                  {tag}
                </Text>
              ))}
            </View>
            <Text style={[styles.previewContent, { color: TH.text }]} numberOfLines={2}>
              {ref.content}
            </Text>
          </View>

          {/* Remove button */}
          <TouchableOpacity
            onPress={() => onRemove(ref.id)}
            style={styles.removeBtn}
          >
            <X size={18} color={TH.sub} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

/** 搜索历史标签（InsightPanel 面板下的快捷入口） */
function SearchHistorySection({ visible, history, onPick }: {
  visible: boolean;
  history: string[];
  onPick: (q: string) => void;
}) {
  const TH = useTheme();
  const T = useT();
  if (!visible || history.length === 0) return null;
  return (
    <View style={styles.searchHistorySection}>
      <Text style={[styles.searchHistoryLabel, { color: TH.sub }]}>{T('searchHistory')}</Text>
      <View style={styles.searchHistoryTags}>
        {history.map((q, i) => (
          <TouchableOpacity
            key={`${q}-${i}`}
            onPress={() => onPick(q)}
            style={[styles.searchHistoryTag, { backgroundColor: TH.card, borderColor: TH.border }]}
          >
            <Text style={[styles.smallText, { color: TH.text }]}>{q}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/** 匹配结果区：降级提示 + 批量选择 + 分页列表 + 加载更多 + 空结果 */
function MatchResultsSection({
  visible, aiDegraded, matchResults, selectedIds, page, pageSize,
  onSelectAll, onDeselectAll, onOnlyUnassigned, onToggle, onLoadMore, onResetFilters,
}: {
  visible: boolean;
  aiDegraded: boolean;
  matchResults: MindReflection[];
  selectedIds: ReadonlySet<string>;
  page: number;
  pageSize: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onOnlyUnassigned: () => void;
  onToggle: (id: string) => void;
  onLoadMore: () => void;
  onResetFilters: () => void;
}) {
  const TH = useTheme();
  const T = useT();
  if (!visible) return null;
  return (
    <View style={styles.matchResultsSection}>
      {/* AI degradation indicator */}
      {aiDegraded && (
        <View style={styles.aiDegradedBanner}>
          <Text style={styles.aiDegradedIcon}>⚠️</Text>
          <Text style={styles.aiDegradedText}>{T('searchDegraded')}</Text>
        </View>
      )}

      <View style={[styles.rowBetween, { marginBottom: 12 }]}>
        <Text style={[styles.bodyBold, { color: TH.text }]}>
          {T('quickTrailMatch')} · {`${matchResults.length}`}{T('quickTrailReflections')}
        </Text>
      </View>

      {matchResults.length > 0 ? (
        <>
          {/* Bulk actions - top */}
          <View style={[styles.bulkActionsRow, { borderBottomColor: TH.border }]}>
            <View style={styles.bulkActionsLeft}>
              <TouchableOpacity onPress={onSelectAll}>
                <Text style={[styles.smallTextPrimary, { color: TH.primary }]}>{T('quickTrailSelectAll')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onDeselectAll}>
                <Text style={[styles.smallText, { color: TH.sub }]}>{T('quickTrailDeselectAll')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onOnlyUnassigned}>
                <Text style={[styles.smallText, { color: TH.sub }]}>{T('quickTrailOnlyUnassigned')}</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.smallText, { color: TH.sub }]}>
              {T('quickTrailSelected').replace('{n}', String(selectedIds.size))}
            </Text>
          </View>

          {matchResults.slice(0, page * pageSize).map(ref => (
            <ReflectionCheckItem
              key={ref.id}
              ref={ref}
              isSelected={selectedIds.has(ref.id)}
              onToggle={() => onToggle(ref.id)}
            />
          ))}

          {/* Load more button */}
          {matchResults.length > page * pageSize && (
            <TouchableOpacity
              onPress={onLoadMore}
              style={[styles.loadMoreBtn, { backgroundColor: `${TH.primary}10` }]}
            >
              <Text style={[styles.smallText, { color: TH.primary }]}>
                {T('searchLoadMore').replace('{n}', String(Math.min(pageSize, matchResults.length - page * pageSize)))}
              </Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsEmoji}>🔍</Text>
          <Text style={[styles.noResultsText, { color: TH.sub }]}>
            {T('quickTrailNoResults')}
          </Text>
          <Text style={[styles.smallText, { color: TH.sub }]}>
            {T('quickTrailTryAgain')}
          </Text>
          <TouchableOpacity onPress={onResetFilters} style={styles.noResultsResetBtn}>
            <Text style={[styles.smallText, { color: TH.primary }]}>{T('quickTrailResetFilters')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  safeArea: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: FONT_TITLE(), fontWeight: '700' },
  createBtnSmall: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  createBtnSmallText: { color: '#fff', fontSize: FONT_SMALL(), fontWeight: '700' },
  scrollContent: { paddingBottom: 32 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 },
  inputSection: { paddingHorizontal: 16, paddingTop: 12 },
  inputContainer: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    minHeight: 100,
  },
  textInput: {
    fontSize: FONT_BODY(),
    padding: 0,
    minHeight: 60,
    maxHeight: 140,
  },
  inputActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  inputActionsInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clearBtn: { padding: 4 },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiSearchSection: { paddingHorizontal: 16, marginTop: 8 },
  aiSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  aiSearchBtnText: {
    fontSize: FONT_SMALL(),
    color: '#8B5CF6',
    fontWeight: '600',
  },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 12, gap: 8 },
  resetFiltersRow: { alignItems: 'flex-end', paddingHorizontal: 16, marginTop: 6 },
  creationPanel: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  creationPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createBtnLarge: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  createBtnLargeText: { color: '#fff', fontSize: FONT_BUTTON(), fontWeight: '700' },
  assignedNotice: { fontSize: FONT_TINY(), marginTop: 4 },
  trailNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  trailNameInput: { flex: 1, fontSize: FONT_SMALL(), padding: 0 },
  previewSection: { paddingHorizontal: 16, marginTop: 16 },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bodyBold: { fontSize: FONT_BODY(), fontWeight: '600' },
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  previewMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewMoodIcon: { fontSize: FONT_SMALL() },
  previewTag: {
    fontSize: FONT_TINY(),
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  previewContent: { fontSize: FONT_BODY(), marginTop: 4, lineHeight: 20 },
  removeBtn: { padding: 4, marginTop: 2 },
  insightPanelWrapper: { marginTop: 8 },
  searchHistorySection: { paddingHorizontal: 16, marginTop: 12 },
  searchHistoryLabel: { fontSize: FONT_TINY(), marginBottom: 8 },
  searchHistoryTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  searchHistoryTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  matchResultsSection: { paddingHorizontal: 16, marginTop: 16 },
  aiDegradedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  aiDegradedIcon: { fontSize: FONT_TINY() },
  aiDegradedText: { fontSize: FONT_TINY(), color: '#92400E' },
  bulkActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  bulkActionsLeft: { flexDirection: 'row', gap: 14 },
  smallText: { fontSize: FONT_SMALL() },
  smallTextPrimary: { fontSize: FONT_SMALL(), fontWeight: '500' },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
    borderRadius: 10,
  },
  noResultsContainer: { alignItems: 'center', paddingVertical: 32 },
  noResultsEmoji: { fontSize: scaleFontSize(32), marginBottom: 8 },
  noResultsText: { fontSize: FONT_BODY(), marginBottom: 4 },
  noResultsResetBtn: { marginTop: 12 },
  // ── Empty state ──
  emptyCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyEmoji: { fontSize: FONT_HERO(), marginBottom: 16 },
  emptyMessage: { fontSize: FONT_BODY(), textAlign: 'center', marginBottom: 8 },
  emptySubtext: { fontSize: FONT_SMALL(), textAlign: 'center', lineHeight: 20 },
  emptyGoRecordBtn: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, marginTop: 20 },
  emptyGoRecordText: { color: '#fff', fontSize: FONT_BUTTON(), fontWeight: '600' },
  skipBtn: { marginTop: 16, paddingVertical: 8 },
});

// ── ReflectionCheckItem moved to ./ReflectionCheckItem.tsx ──────
