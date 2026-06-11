import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Animated, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft, X, Search, Send, Check, ChevronDown,
  RefreshCw,
} from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, useT } from '../../components/UI';
import { TagPill } from '../../components/UI';
import {
  FONT_TITLE, FONT_BODY, FONT_SMALL, FONT_TINY, FONT_BUTTON, FONT_SUB,
  getMoodIcon, generateTrailName,
  computeCandidatePool, computeRecommendations, matchByKeyword,
  formatDateShort, trendArrow, trendLabel, trendColor,
  QUICK_TRAIL_PRESETS,
  isAIRecommendAvailable, recommendTrailsViaAI, matchReflectionsToTopic,
} from '@egoless-do/core';
import type { TrailRecommendation, TrailFilters, MindReflection } from '@egoless-do/core';
import RecommendCard from './RecommendCard';
import SelectionSummary from './SelectionSummary';

type TimeRange = 'week' | 'month' | '3months' | 'all';

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
  const store = useAppStore();

  // ── Filters ───────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);

  // ── Results ───────────────────────────────────────────────────
  const [recommendations, setRecommendations] = useState<TrailRecommendation[]>([]);
  const [matchResults, setMatchResults] = useState<MindReflection[]>([]);
  const [matchMode, setMatchMode] = useState<'idle' | 'local' | 'ai' | 'ai-loading'>('idle');
  const [isMatching, setIsMatching] = useState(false);

  // ── Selection ─────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [trailName, setTrailName] = useState('');
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  // ── Animation ─────────────────────────────────────────────────
  const expandAnim = useRef(new Animated.Value(0)).current;

  // ── Data ──────────────────────────────────────────────────────
  const reflections = useMemo(() =>
    (store.reflections ?? []).filter(r => !r.deleted),
    [store.reflections]
  );

  const allTrails = useMemo(() =>
    (store.thoughtTrails ?? []).filter(t => !t.deleted),
    [store.thoughtTrails]
  );

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

  const aiAvailable = useMemo(() => isAIRecommendAvailable(), []);

  // ── Candidate pool + recommendations ──────────────────────────
  const filters: TrailFilters = useMemo(() => ({
    timeRange,
    tags: selectedTags,
    moods: selectedMoods,
    query: searchQuery || undefined,
    preset: activePreset || undefined,
  }), [timeRange, selectedTags, selectedMoods, searchQuery, activePreset]);

  const candidates = useMemo(() =>
    computeCandidatePool(reflections, filters),
    [reflections, filters]
  );

  // Compute recommendations on filter change (no query)
  useEffect(() => {
    if (searchQuery) return; // Don't update recs during search
    const recs = computeRecommendations(candidates, allTrails);
    setRecommendations(recs);
  }, [candidates, allTrails, searchQuery]);

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
    setActivePreset(null);
  }, []);

  const toggleMood = useCallback((mood: string) => {
    setSelectedMoods(prev => prev.includes(mood) ? prev.filter(m => m !== mood) : [...prev, mood]);
    setActivePreset(null);
  }, []);

  const applyPreset = useCallback((key: string) => {
    setActivePreset(prev => prev === key ? null : key);
    setSelectedTags([]);
    setSelectedMoods([]);
  }, []);

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setMatchMode('idle');
      setMatchResults([]);
      return;
    }

    setIsMatching(true);
    setMatchMode('local');

    // Local matching
    const localResults = matchByKeyword(searchQuery, candidates);

    if (localResults.length >= 3) {
      setMatchResults(localResults);
      setMatchMode('local');
      setIsMatching(false);
    } else {
      setMatchResults(localResults);

      // Try AI matching
      if (aiAvailable) {
        setMatchMode('ai-loading');
        matchReflectionsToTopic(candidates, searchQuery)
          .then(aiResults => {
            if (aiResults.length > 0) {
              const aiReflections = aiResults
                .map(r => candidates[r.reflectionIndex])
                .filter(Boolean);
              // Merge: local first, then AI (deduplicate)
              const localIds = new Set(localResults.map(r => r.id));
              const merged = [...localResults];
              for (const r of aiReflections) {
                if (!localIds.has(r.id)) merged.push(r);
              }
              setMatchResults(merged);
              setMatchMode('ai');
            } else {
              setMatchMode(localResults.length > 0 ? 'local' : 'local');
            }
          })
          .catch(() => setMatchMode('local'))
          .finally(() => setIsMatching(false));
      } else {
        setMatchMode('local');
        setIsMatching(false);
      }
    }
  }, [searchQuery, candidates, aiAvailable]);

  const handleClear = useCallback(() => {
    setSearchQuery('');
    setMatchMode('idle');
    setMatchResults([]);
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleQuickGenerate = useCallback((rec: TrailRecommendation) => {
    // Select all reflections from the recommendation
    setSelectedIds(new Set(rec.reflectionIds));
    setTrailName(rec.name);
    // Scroll to bottom to show create panel (handled by state)
  }, []);

  const handleSelectAll = useCallback(() => {
    const list = expandedCard !== null
      ? recommendations[expandedCard]?.reflectionIds ?? []
      : matchResults.map(r => r.id);
    setSelectedIds(new Set(list));
  }, [expandedCard, recommendations, matchResults]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleOnlyUnassigned = useCallback(() => {
    const list = expandedCard !== null
      ? (recommendations[expandedCard]?.reflectionIds ?? [])
        .filter(id => {
          const r = reflections.find(ref => ref.id === id);
          return r && !r.thoughtTrailIds?.length;
        })
      : matchResults.filter(r => !r.thoughtTrailIds?.length).map(r => r.id);
    setSelectedIds(new Set(list));
  }, [expandedCard, recommendations, matchResults, reflections]);

  const handleExpandCard = useCallback((index: number) => {
    if (expandedCard === index) {
      setExpandedCard(null);
      Animated.timing(expandAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    } else {
      setExpandedCard(index);
      expandAnim.setValue(0);
      Animated.timing(expandAnim, { toValue: 1, duration: 250, useNativeDriver: false }).start();
      // Pre-select all from the recommendation
      const rec = recommendations[index];
      if (rec) {
        setSelectedIds(new Set(rec.reflectionIds));
        setTrailName(rec.name);
      }
    }
  }, [expandedCard, recommendations, expandAnim]);

  const handleCreate = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const name = trailName || generateTrailName(
      ids.map(id => reflections.find(r => r.id === id)).filter(Boolean) as MindReflection[],
      T
    );

    const trailId = store.createThoughtTrail(name, '', ids, 'manual');
    (nav as any).navigate('ThoughtTrailDetail', { trailId });
  }, [selectedIds, trailName, reflections, store, nav, T]);

  const resetFilters = useCallback(() => {
    setTimeRange('month');
    setSelectedTags([]);
    setSelectedMoods([]);
    setActivePreset(null);
    setSearchQuery('');
    setMatchMode('idle');
    setMatchResults([]);
  }, []);

  // ── Render helpers ────────────────────────────────────────────
  const timeRangeLabel = TIME_RANGE_OPTIONS.find(o => o.key === timeRange)?.labelKey ?? 'thisMonth';

  const showRecommendations = matchMode === 'idle' && !searchQuery;
  const showMatchResults = matchMode !== 'idle' || searchQuery.length > 0;

  // Empty state: not enough reflections
  if (reflections.length < 5) {
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
            onPress={() => { /* Fall through to manual mode */ }}
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
          contentContainerStyle={{ paddingBottom: selectedIds.size > 0 ? 200 : 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Search bar */}
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: TH.card, borderRadius: 12,
              paddingHorizontal: 12, paddingVertical: 10,
              borderWidth: 1, borderColor: TH.border,
            }}>
              <Search size={18} color={TH.sub} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                placeholder={T('quickTrailSearchPlaceholder')}
                placeholderTextColor={TH.sub}
                style={{ flex: 1, color: TH.text, fontSize: FONT_BODY, padding: 0 }}
                returnKeyType="search"
              />
              {searchQuery.length > 0 ? (
                <TouchableOpacity onPress={handleClear}>
                  <X size={16} color={TH.sub} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleSearch}>
                  <Send size={18} color={TH.primary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Mode indicator */}
            {matchMode !== 'idle' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
                <Text style={{ fontSize: FONT_TINY, color: TH.sub }}>
                  {matchMode === 'ai-loading' ? T('quickTrailAIAnalyzing')
                    : matchMode === 'ai' ? T('quickTrailMatchAI')
                    : T('quickTrailMatchLocal')}
                </Text>
                {isMatching && (
                  <Text style={{ fontSize: FONT_TINY, color: TH.sub }}>...</Text>
                )}
              </View>
            )}
          </View>

          {/* Filter row 1: conditions */}
          <View style={{ marginTop: 12 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            >
              {/* Time range dropdown */}
              <View style={{ position: 'relative', marginRight: 8 }}>
                <TouchableOpacity
                  onPress={() => setShowTimeDropdown(!showTimeDropdown)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                    paddingHorizontal: 12, paddingVertical: 6,
                    borderRadius: 16, borderWidth: 1,
                    backgroundColor: timeRange !== 'month' ? `${TH.primary}15` : TH.card,
                    borderColor: timeRange !== 'month' ? TH.primary : TH.border,
                  }}
                >
                  <Text style={{ fontSize: FONT_SMALL, color: TH.text }}>
                    {T(timeRangeLabel)}
                  </Text>
                  <ChevronDown size={14} color={TH.sub} />
                </TouchableOpacity>
                {showTimeDropdown && (
                  <View style={{
                    position: 'absolute', top: 36, left: 0, zIndex: 10,
                    backgroundColor: TH.card, borderRadius: 12,
                    borderWidth: 1, borderColor: TH.border,
                    minWidth: 120, overflow: 'hidden',
                  }}>
                    {TIME_RANGE_OPTIONS.map(opt => (
                      <TouchableOpacity
                        key={opt.key}
                        onPress={() => { setTimeRange(opt.key); setShowTimeDropdown(false); setActivePreset(null); }}
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

              {/* Tags */}
              {userTags.map(tag => (
                <TagPill
                  key={tag}
                  label={`#${tag}`}
                  active={selectedTags.includes(tag)}
                  onPress={() => toggleTag(tag)}
                  color={TH.primary}
                />
              ))}

              {/* Moods */}
              {userMoods.map(mood => (
                <TagPill
                  key={mood}
                  label={`${getMoodIcon(mood)} ${mood}`}
                  active={selectedMoods.includes(mood)}
                  onPress={() => toggleMood(mood)}
                  color="#8B5CF6"
                />
              ))}
            </ScrollView>
          </View>

          {/* Filter row 2: presets */}
          <View style={{ marginTop: 8 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            >
              {QUICK_TRAIL_PRESETS.map(preset => (
                <TouchableOpacity
                  key={preset.key}
                  onPress={() => applyPreset(preset.key)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                    paddingHorizontal: 12, paddingVertical: 6,
                    borderRadius: 16, borderWidth: 1,
                    backgroundColor: activePreset === preset.key ? `${TH.primary}15` : TH.card,
                    borderColor: activePreset === preset.key ? TH.primary : TH.border,
                    marginRight: 8,
                  }}
                >
                  <Text style={{ fontSize: FONT_SMALL }}>{preset.icon}</Text>
                  <Text style={{ fontSize: FONT_SMALL, color: TH.text }}>{T(preset.labelKey)}</Text>
                </TouchableOpacity>
              ))}

              {/* Reset filters */}
              {(selectedTags.length > 0 || selectedMoods.length > 0 || activePreset || timeRange !== 'month') && (
                <TouchableOpacity onPress={resetFilters} style={{ paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>{T('quickTrailResetFilters')}</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* ── Recommendations section ── */}
          {showRecommendations && (
            <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
              <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text, marginBottom: 12 }}>
                {T('quickTrailRecommend')}
              </Text>

              {recommendations.length > 0 ? (
                recommendations.map((rec, i) => (
                  <View key={i}>
                    <TouchableOpacity onPress={() => handleExpandCard(i)}>
                      <RecommendCard rec={rec} onQuickGenerate={handleQuickGenerate} />
                    </TouchableOpacity>

                    {/* Expanded reflection list */}
                    {expandedCard === i && (
                      <Animated.View style={{
                        opacity: expandAnim,
                        marginBottom: 12,
                        backgroundColor: TH.card,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: TH.border,
                        padding: 12,
                      }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <Text style={{ fontSize: FONT_SMALL, color: TH.text, fontWeight: '600' }}>
                            💡 "{rec.name}"
                          </Text>
                          <TouchableOpacity onPress={() => { setExpandedCard(null); expandAnim.setValue(0); }}>
                            <Text style={{ fontSize: FONT_TINY, color: TH.sub }}>{T('quickTrailCollapse')}</Text>
                          </TouchableOpacity>
                        </View>

                        {rec.reflectionIds.map(id => {
                          const ref = reflections.find(r => r.id === id);
                          if (!ref) return null;
                          const isSelected = selectedIds.has(id);
                          return (
                            <ReflectionCheckItem
                              key={id}
                              ref={ref}
                              isSelected={isSelected}
                              onToggle={() => toggleSelect(id)}
                            />
                          );
                        })}

                        {/* Bulk actions */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: TH.border }}>
                          <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity onPress={handleSelectAll}>
                              <Text style={{ fontSize: FONT_TINY, color: TH.primary }}>{T('quickTrailSelectAll')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleDeselectAll}>
                              <Text style={{ fontSize: FONT_TINY, color: TH.sub }}>{T('quickTrailDeselectAll')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleOnlyUnassigned}>
                              <Text style={{ fontSize: FONT_TINY, color: TH.sub }}>{T('quickTrailOnlyUnassigned')}</Text>
                            </TouchableOpacity>
                          </View>
                          <Text style={{ fontSize: FONT_TINY, color: TH.sub }}>
                            {T('quickTrailSelected').replace('{n}', String(selectedIds.size))}
                          </Text>
                        </View>
                      </Animated.View>
                    )}
                  </View>
                ))
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>🔍</Text>
                  <Text style={{ fontSize: FONT_BODY, color: TH.sub }}>
                    {T('quickTrailNoResults')}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ── Match results section ── */}
          {showMatchResults && (
            <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>
                  {T('quickTrailMatch')} · {matchResults.length}{T('quickTrailReflections')}
                </Text>
                {matchMode !== 'idle' && (
                  <Text style={{ fontSize: FONT_TINY, color: TH.sub }}>
                    {matchMode === 'ai' ? T('quickTrailMatchAI') : T('quickTrailMatchLocal')}
                  </Text>
                )}
              </View>

              {matchResults.length > 0 ? (
                <>
                  {matchResults.map(ref => (
                    <ReflectionCheckItem
                      key={ref.id}
                      ref={ref}
                      isSelected={selectedIds.has(ref.id)}
                      onToggle={() => toggleSelect(ref.id)}
                    />
                  ))}

                  {/* Bulk actions */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: TH.border }}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <TouchableOpacity onPress={handleSelectAll}>
                        <Text style={{ fontSize: FONT_TINY, color: TH.primary }}>{T('quickTrailSelectAll')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleDeselectAll}>
                        <Text style={{ fontSize: FONT_TINY, color: TH.sub }}>{T('quickTrailDeselectAll')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleOnlyUnassigned}>
                        <Text style={{ fontSize: FONT_TINY, color: TH.sub }}>{T('quickTrailOnlyUnassigned')}</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={{ fontSize: FONT_TINY, color: TH.sub }}>
                      {T('quickTrailSelected').replace('{n}', String(selectedIds.size))}
                    </Text>
                  </View>
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

        {/* ── Bottom create panel ── */}
        {selectedIds.size > 0 && (
          <View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            backgroundColor: TH.cardSolid ?? TH.card,
            borderTopWidth: 1, borderTopColor: TH.border,
            paddingHorizontal: 16, paddingTop: 12,
            paddingBottom: 40,
          }}>
            {/* Selection summary */}
            <SelectionSummary
              count={selectedIds.size}
              moods={selectedMoodsList}
              startDate={selectedDateRange?.start}
              endDate={selectedDateRange?.end}
            />

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
              backgroundColor: TH.bg, borderRadius: 12,
              paddingHorizontal: 12, paddingVertical: 10,
              borderWidth: 1, borderColor: TH.border,
              marginTop: 8,
            }}>
              <TextInput
                value={trailName}
                onChangeText={setTrailName}
                placeholder={T('quickTrailNamePlaceholder')}
                placeholderTextColor={TH.sub}
                style={{ flex: 1, color: TH.text, fontSize: FONT_BODY, padding: 0 }}
              />
              <TouchableOpacity onPress={() => setTrailName(generateTrailName(selectedReflections, T))}>
                <RefreshCw size={16} color={TH.sub} />
              </TouchableOpacity>
            </View>

            {/* Create button */}
            <TouchableOpacity
              onPress={handleCreate}
              style={{
                backgroundColor: TH.primary, borderRadius: 12,
                paddingVertical: 14, alignItems: 'center',
                marginTop: 10,
              }}
            >
              <Text style={{ color: '#fff', fontSize: FONT_BUTTON, fontWeight: '700' }}>
                {T('quickTrailCreate')} ({selectedIds.size}{T('quickTrailReflections')})
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
              #{tag}
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
