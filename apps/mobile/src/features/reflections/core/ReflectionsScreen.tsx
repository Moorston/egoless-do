import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  KeyboardAvoidingView, Platform, TextInput, Linking, Alert, StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../../store/useAppStore';
import { useTabNavigation, useRootNavigation, type MainTabParamList } from '../../../navigation/hooks';
import {
  useTheme, ScreenHeader, TagPill, PrimaryButton, OutlineButton,
  ThemedInput, useT, PillSelector,
} from '../../../components/UI';
import ItemManagerPanel from '../../../components/ItemManagerPanel';
import SimpleHeader from '../../../navigation/SimpleHeader';
import ShareCard from './ShareCard';
import { CreatePlanFromReflectionModal } from './CreatePlanFromReflectionModal';
import FilterDrawer from './FilterDrawer';
import MindTrailEntryCard from '../trails/MindTrailEntryCard';
import TrailSuggestionBanner from '../trails/TrailSuggestionBanner';
import ReflectionForm from './ReflectionForm';
import { useReflections } from '../hooks/useReflections';
import { MIND_COLORS_EXTENDED, TAGS_PRESET, MOODS, COLORS, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_SMALL, FONT_TINY, FONT_STAT_CARD, FONT_EMPTY, FONT_LABEL, dateStr, REFLECTION_CATEGORIES, createLogger } from '@egoless-do/core';
import type { Habit, MindReflection } from '@egoless-do/core';
import { highlightSearchMatch, computeSmartCollections } from '@egoless-do/core';
import {
  Settings, X, Eye, EyeOff, ExternalLink, ArrowLeft, Link, BarChart3,
} from 'lucide-react-native';

const log = createLogger('Reflections');
import ReflectionDetailContent from './ReflectionDetailContent';
import TrailPickerModal from '../trails/TrailPickerModal';
import { getTrailsByReflection } from '@egoless-do/core';

// ── Manager helpers ───────────────────────────────────────────────
function getManagerProps(
  store: ReturnType<typeof useAppStore.getState>,
  mode: 'tag' | 'mood',
  onBack: () => void,
  hiddenItems?: string[],
  onToggleHidden?: (item: string) => void,
) {
  if (mode === 'tag') {
    // Get all tags (preset + custom + habit)
    const habitTags = (store.habits ?? []).filter((h: Habit) => !h.deleted && h.createTag).map((h: Habit) => `#${h.name}`);
    const allTags = [...new Set([...TAGS_PRESET, ...(store.customTags ?? []), ...habitTags])];
    
    const sections = [
      { titleKey: 'allTags', items: allTags, isPreset: false, isReadonly: false } as const,
    ];
    return {
      titleKey: 'tagManager', backLabelKey: 'reflBack',
      inputPlaceholderKey: 'newTagPlaceholder', tooLongKey: 'tagTooLong', maxReachedKey: 'maxTagsReached',
      deleteConfirmKey: 'tagDeleteConfirm', usedByKey: 'tagUsedBy', deleteTitleKey: 'tagDelete',
      sections,
      addItem: (s: string) => store.addCustomTag(s),
      updateItem: (o: string, n: string) => store.updateCustomTag(o, n),
      removeItem: (s: string) => store.removeCustomTag(s),
      reorderItem: (from: number, to: number, _ordered: string[]) => store.reorderAllTag(from, to),
      getReflectionsContainingItem: (s: string) => (store.reflections ?? []).filter((r: MindReflection) => !r.deleted && r.tags?.includes(s)).length,
      customItems: store.customTags ?? [],
      formatInput: (s: string) => s.startsWith('#') ? s : `#${s}`,
      hiddenItems,
      onToggleHidden,
      onBack,
    };
  }

  // Mood mode
  const allMoods = [...new Set([...MOODS, ...(store.customMoods ?? [])])];
  const sections = [
    { titleKey: 'allMoods', items: allMoods, isPreset: false, isReadonly: false } as const,
  ];
  return {
    titleKey: 'moodManager', backLabelKey: 'reflBack',
    inputPlaceholderKey: 'newMoodPlaceholder', tooLongKey: 'moodTooLong', maxReachedKey: 'maxMoodsReached',
    deleteConfirmKey: 'moodDeleteConfirm', usedByKey: 'moodUsedBy', deleteTitleKey: 'moodDelete',
    sections,
    addItem: (s: string) => store.addCustomMood(s),
    updateItem: (o: string, n: string) => store.updateCustomMood(o, n),
    removeItem: (s: string) => store.removeCustomMood(s),
    reorderItem: (from: number, to: number, _ordered: string[]) => store.reorderAllMood(from, to),
    getReflectionsContainingItem: (s: string) => (store.reflections ?? []).filter((r: MindReflection) => !r.deleted && r.mood === s).length,
    customItems: store.customMoods ?? [],
    hiddenItems,
    onToggleHidden,
    onBack,
  };
}

// ── ReflectionsScreen ────────────────────────────────────────────
export default function ReflectionsScreen() {
  const TH    = useTheme();
  const P     = TH.primary;
  const { reflections, addReflection, addReflectionToTrail, updateReflection, deleteReflection, getActivePlan, createPlanItem, planItems, thoughtTrails, deletePlanItem, unlinkReflectionFromPlanItem, habits, customTags, addCustomTag, updateCustomTag, removeCustomTag, reorderAllTag, customMoods, addCustomMood, updateCustomMood, removeCustomMood, reorderAllMood } = useAppStore(useShallow(s => ({
    reflections: s.reflections,
    addReflection: s.addReflection,
    addReflectionToTrail: s.addReflectionToTrail,
    updateReflection: s.updateReflection,
    deleteReflection: s.deleteReflection,
    getActivePlan: s.getActivePlan,
    createPlanItem: s.createPlanItem,
    planItems: s.planItems,
    thoughtTrails: s.thoughtTrails,
    deletePlanItem: s.deletePlanItem,
    unlinkReflectionFromPlanItem: s.unlinkReflectionFromPlanItem,
    habits: s.habits,
    customTags: s.customTags,
    addCustomTag: s.addCustomTag,
    updateCustomTag: s.updateCustomTag,
    removeCustomTag: s.removeCustomTag,
    reorderAllTag: s.reorderAllTag,
    customMoods: s.customMoods,
    addCustomMood: s.addCustomMood,
    updateCustomMood: s.updateCustomMood,
    removeCustomMood: s.removeCustomMood,
    reorderAllMood: s.reorderAllMood,
  })));
  const T     = useT();
  const route = useRoute<RouteProp<MainTabParamList, 'Reflections'>>();
  const nav   = useTabNavigation();
  const rootNav = useRootNavigation();
  const insets = useSafeAreaInsets();

  // Use shared reflections hook (includes filters, debounced search, dynamic counts, etc.)
  const {
    filters, setFilters, searchInput, setSearchInput,
    showDeletedTags, setShowDeletedTags,
    toggleTag, toggleMood, applyCollection, clearAllFilters, removeFilter,
    activeFilters, hasActiveFilters,
    allTags, allUsedTags, deletedTagsWithData, visibleTags,
    allTagOptions, allMoodOptions, habitTags,
    filtered, byDay,
    dynamicTagCounts, dynamicMoodCounts,
    totalCount, topTag, streakDays,
    sparklineData, moodStats, allMoods,
    smartCollections, tagFrequency,
    handleShare,
  } = useReflections();

  const [showNew, setShowNew]       = useState(false);
  const handledShowNew = useRef(false);
  useEffect(() => {
    const p = route.params as { showNew?: boolean } | undefined;
    if (p?.showNew && !handledShowNew.current) {
      handledShowNew.current = true;
      setShowNew(true);
    }
  }, [route.params]);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [managerMode, setManagerMode] = useState<'tag'|'mood'|null>(null);
  const [hiddenTags, setHiddenTags] = useState<string[]>([]);
  const [hiddenMoods, setHiddenMoods] = useState<string[]>([]);

  // Load hidden tags/moods from storage on mount
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('hiddenTags'),
      AsyncStorage.getItem('hiddenMoods'),
    ]).then(([tagsData, moodsData]) => {
      if (tagsData) {
        try { setHiddenTags(JSON.parse(tagsData)); } catch {}
      }
      if (moodsData) {
        try { setHiddenMoods(JSON.parse(moodsData)); } catch {}
      }
    }).catch((e) => log.error(e));
  }, []);

  const handleToggleHiddenTag = useCallback((tag: string) => {
    setHiddenTags(prev => {
      const next = prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag];
      AsyncStorage.setItem('hiddenTags', JSON.stringify(next));
      return next;
    });
  }, []);

  const handleToggleHiddenMood = useCallback((mood: string) => {
    setHiddenMoods(prev => {
      const next = prev.includes(mood) ? prev.filter(m => m !== mood) : [...prev, mood];
      AsyncStorage.setItem('hiddenMoods', JSON.stringify(next));
      return next;
    });
  }, []);

  // Filter hidden tags for new/edit reflection form
  const visibleTagOptions = useMemo(() => 
    allTagOptions.filter(tag => !hiddenTags.includes(tag)),
    [allTagOptions, hiddenTags]
  );

  // Filter hidden moods for new/edit reflection form
  const visibleMoodOptions = useMemo(() => 
    allMoodOptions.filter(mood => !hiddenMoods.includes(mood)),
    [allMoodOptions, hiddenMoods]
  );

  // Date collapse state: track which day groups are collapsed
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const initializedCollapse = useRef(false);
  useEffect(() => {
    if (!initializedCollapse.current) {
      const days = Object.keys(byDay);
      if (days.length > 3) {
        setCollapsedDays(new Set(days.slice(3))); // collapse all except the first 3 days
      }
      initializedCollapse.current = true;
    }
  }, [byDay]);

  useEffect(() => {
    if (route.params?.showNew) {
      setShowNew(true);
      nav.setParams({ showNew: false });
    }
  }, [route.params?.showNew]);

  // Handle trailId param — set as pending trail for new reflection
  useEffect(() => {
    if (route.params?.trailId) {
      setPendingTrailIds(prev => prev.includes(route.params!.trailId!) ? prev : [...prev, route.params!.trailId!]);
      setShowNew(true);
      nav.setParams({ trailId: undefined });
    }
  }, [route.params?.trailId]);
  const [content, setContent]     = useState('');
  const [tags, setTags]           = useState<string[]>([]);
  const [mood, setMood]           = useState('');
  const [link, setLink]           = useState('');
  const [colorIdx, setColorIdx]   = useState(0);
  const [category, setCategory]   = useState('');
  const [confirmDel, setConfirmDel] = useState<string|null>(null);
  const [shareReflection, setShareReflection] = useState<MindReflection | null>(null);

  // Long press action menu state
  const [actionMenuId, setActionMenuId] = useState<string|null>(null);

  // Trail picker state
  const [trailPickerId, setTrailPickerId] = useState<string|null>(null);

  // Card detail modal state
  const [detailId, setDetailId] = useState<string|null>(null);

  // Edit state
  const [editId, setEditId]               = useState<string|null>(null);
  const [editContent, setEditContent]     = useState('');
  const [editTags, setEditTags]           = useState<string[]>([]);
  const [editMood, setEditMood]           = useState('');
  const [editLink, setEditLink]           = useState('');
  const [editColorIdx, setEditColorIdx]   = useState(0);
  const [editCategory, setEditCategory]   = useState('');

  // Pending trail IDs for new reflection (before it's saved)
  const [pendingTrailIds, setPendingTrailIds] = useState<string[]>([]);

  // Create plan item state
  const [showCreatePlanRefModal, setShowCreatePlanRefModal] = useState(false);
  const [createPlanReflection, setCreatePlanReflection] = useState<MindReflection | null>(null);

  // Calendar heatmap data (last 35 days = 5 weeks)
  const calendarData = useMemo(() => {
    const today = new Date();
    const data: { date: string; count: number; dayLabel: string }[] = [];
    for (let i = 34; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = dateStr(d);
      const count = (reflections ?? []).filter(r =>
        !r.deleted && dateStr(new Date(r.timestamp ?? 0)) === ds
      ).length;
      const dayLabel = d.toLocaleDateString('zh-CN', { weekday: 'narrow' });
      data.push({ date: ds, count, dayLabel });
    }
    return data;
  }, [reflections]);

  const saveReflection = () => {
    if (!content.trim()) return;
    // Add category tag if selected
    const found = REFLECTION_CATEGORIES.find(c => c.key === category);
    const categoryTag = found ? `#${found.label}` : '';
    const finalTags = categoryTag && !tags.includes(categoryTag) ? [categoryTag, ...tags] : tags;
    const newR = addReflection({ content, tags: finalTags, mood, colorIdx, link: link.trim() || undefined });
    // Link pending trails to the newly created reflection
    if (newR && pendingTrailIds.length > 0) {
      pendingTrailIds.forEach(tid => addReflectionToTrail(tid, newR.id));
      setPendingTrailIds([]);
    }
    setContent(''); setTags([]); setMood(''); setLink(''); setColorIdx(0); setCategory('');
    setShowNew(false);
  };

  const openEdit = (r: MindReflection) => {
    setEditId(r.id);
    setEditContent(r.content || '');
    setEditTags(r.tags || []);
    setEditMood(r.mood || '');
    setEditLink(r.link || '');
    const bgIdx = MIND_COLORS_EXTENDED.findIndex(c => c[0] === (r.colors?.[0]));
    setEditColorIdx(bgIdx >= 0 ? bgIdx : 0);
    // Find category from tags
    const cat = REFLECTION_CATEGORIES.find(c => r.tags?.includes(`#${c.label}`));
    setEditCategory(cat?.key || '');
  };

  const saveEdit = () => {
    if (!editId || !editContent.trim()) return;
    const idx = Math.min(Math.max(editColorIdx, 0), MIND_COLORS_EXTENDED.length - 1);
    // Handle category tag
    const foundEdit = REFLECTION_CATEGORIES.find(c => c.key === editCategory);
    const categoryTag = foundEdit ? `#${foundEdit.label}` : '';
    const oldCategoryTags = REFLECTION_CATEGORIES.map(c => `#${c.label}`);
    // Remove old category tags and add new one
    let finalTags = editTags.filter(t => !oldCategoryTags.includes(t));
    if (categoryTag) finalTags = [categoryTag, ...finalTags];

    updateReflection(editId, {
      content: editContent,
      tags: finalTags,
      mood: editMood,
      link: editLink.trim() || undefined,
      colors: MIND_COLORS_EXTENDED[idx] as unknown as readonly [string, string],
    });
    setEditId(null);
    setManagerMode(null);
  };

  const cancelEdit = () => {
    setEditId(null);
    setManagerMode(null);
    setTrailPickerId(null);
  };

  const onShare = async (r: MindReflection) => {
    setActionMenuId(null);
    // Show share choice: text or image
    Alert.alert(T('reflShare'), '', [
      { text: T('shareTextShare'), onPress: () => handleShare(r) },
      { text: T('shareImageShare'), onPress: () => setShareReflection(r) },
      { text: T('cancel'), style: 'cancel' },
    ]);
  };

  const handleEdit = useCallback((id: string) => {
    const r = (reflections ?? []).find(x => !x.deleted && x.id === id);
    if (r) openEdit(r);
  }, [reflections]);

  const handleCreatePlanItem = useCallback((id: string) => {
    const r = (reflections ?? []).find(x => !x.deleted && x.id === id);
    if (r) {
      const activePlan = getActivePlan();
      if (!activePlan) {
        Alert.alert('提示', '暂无活跃计划，请先创建一个计划。');
        return;
      }
      setCreatePlanReflection(r);
      setShowCreatePlanRefModal(true);
    }
  }, [reflections, getActivePlan]);

  const handleCreatePlanRef = useCallback((reflectionId: string, form: { name: string; description?: string; priority?: string; startDate?: string; endDate?: string; targetMetric?: string }) => {
    createPlanItem({ type: 'reflection', id: reflectionId }, form);
    setShowCreatePlanRefModal(false);
    setCreatePlanReflection(null);
    Alert.alert('成功', '计划任务已创建');
  }, [createPlanItem]);

  const handleCardPress = useCallback((id: string) => {
    setDetailId(id);
  }, []);

  const handleCardLongPress = useCallback((id: string) => {
    setActionMenuId(id);
  }, []);

  const toggleDayCollapse = useCallback((day: string) => {
    setCollapsedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }, []);

  const handleNavigateToPlan = useCallback((planId: string) => {
    rootNav.navigate('PlanDetail', { planId });
  }, [rootNav]);

  return (
    <SafeAreaView edges={[]} style={{ flex:1, backgroundColor:TH.bg }}>
      <SimpleHeader routeName="Reflections" />
      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:100 }}>
        <ScreenHeader title={T('reflTitle')} compact
          right={
            <TouchableOpacity onPress={() => setShowNew(true)}
              style={{ backgroundColor:P, paddingHorizontal:16, paddingVertical:8, borderRadius:20 }}>
              <Text style={{ color:'#fff', fontWeight:'700', fontSize:FONT_BUTTON }}>{T('reflNew')}</Text>
            </TouchableOpacity>
          }
        />

        {/* Mind Trail Entry Card */}
        <MindTrailEntryCard onPress={() => rootNav.navigate('MindTrail')} />

        {/* Trail Suggestion Banner */}
        <TrailSuggestionBanner />

        {/* Search + toggle row */}
        <View style={{ flexDirection:'row', gap:8, marginBottom:16 }}>
          <View style={{ flex:1, flexDirection:'row', alignItems:'center', gap:6, backgroundColor:TH.card, borderRadius:12, paddingHorizontal:12, paddingVertical:10 }}>
            <Text style={{ fontSize:FONT_SUB, color:TH.sub }}>🔍</Text>
            <TextInput value={searchInput} onChangeText={setSearchInput} placeholder="搜索感念..." placeholderTextColor={TH.sub}
              style={{ flex:1, color:TH.text, fontSize:FONT_BODY, padding:0 }} />
            {searchInput.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchInput(''); removeFilter('search'); }}>
                <X size={16} color={TH.sub} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={() => setShowFilterDrawer(f => !f)}
            style={{ paddingHorizontal:14, borderRadius:10, backgroundColor: showFilterDrawer ? `${P}20` : TH.card, justifyContent:'center' }}>
            <Text style={{ color: showFilterDrawer ? P : TH.sub, fontSize:FONT_SMALL, fontWeight:'600' }}>筛选</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => rootNav.navigate('ReflectionStats')}
            style={{ paddingHorizontal:14, borderRadius:10, backgroundColor: TH.card, justifyContent:'center' }}>
            <BarChart3 size={18} color={TH.sub} />
          </TouchableOpacity>
        </View>

        {/* Active Filters Bar */}
        {hasActiveFilters && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap:6 }} style={{ marginBottom:12 }}>
            {activeFilters.map((f, i) => (
              <TouchableOpacity key={`${f.key}-${f.value ?? i}`}
                onPress={() => removeFilter(f.key, f.value)}
                style={{ flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:10, paddingVertical:6, borderRadius:16, backgroundColor:`${P}15`, borderWidth:1, borderColor:`${P}30` }}>
                <Text style={{ color:P, fontSize:FONT_SMALL }}>{f.label}</Text>
                <X size={12} color={P} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={clearAllFilters}
              style={{ paddingHorizontal:10, paddingVertical:6, borderRadius:16, backgroundColor:TH.card, borderWidth:1, borderColor:TH.border }}>
              <Text style={{ color:TH.sub, fontSize:FONT_SMALL }}>清除全部</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Timeline */}
        {Object.entries(byDay).map(([day, items]) => {
          const isCollapsed = collapsedDays.has(day) && !hasActiveFilters;

            if (isCollapsed) {
            // Compute summary for collapsed card
            const tagCounts: Record<string, number> = {};
            const moodCounts: Record<string, number> = {};
            items.forEach(r => {
              (r.tags ?? []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
              if (r.mood) moodCounts[r.mood] = (moodCounts[r.mood] || 0) + 1;
            });
            const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);
            const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

            return (
              <TouchableOpacity key={day} onPress={() => toggleDayCollapse(day)} activeOpacity={0.7}
                style={{ flexDirection:'row', alignItems:'center', gap:10, marginBottom:10, paddingHorizontal:14, paddingVertical:12, borderRadius:12, backgroundColor:TH.card, borderWidth:1, borderColor:TH.border }}>
                <View style={{ width:8, height:8, borderRadius:4, backgroundColor:P }} />
                <View style={{ flex:1 }}>
                  <Text style={{ color:TH.text, fontSize:FONT_SUB, fontWeight:'600' }}>{day}</Text>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginTop:4, flexWrap:'wrap' }}>
                    <Text style={{ color:TH.sub, fontSize:FONT_SMALL }}>{items.length} 条感念</Text>
                    {topTags.map(tag => (
                      <Text key={tag} style={{ color:P, fontSize:FONT_SMALL }}>{tag}</Text>
                    ))}
                    {topMood && <Text style={{ color:TH.sub, fontSize:FONT_SMALL }}>· {topMood}</Text>}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <View key={day}>
              <TouchableOpacity onPress={() => toggleDayCollapse(day)} activeOpacity={0.7}
                style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:10 }}>
                <View style={{ width:8, height:8, borderRadius:4, backgroundColor:P }} />
                <Text style={{ color:TH.sub, fontSize:FONT_SUB, fontWeight:'600' }}>{day}</Text>
                <View style={{ flex:1, height:1, backgroundColor:TH.border }} />
              </TouchableOpacity>
              {items.map((r, idx) => {
                const linkedPlanItem = r.linkedPlanItemId
                  ? (planItems ?? []).find(i => i.id === r.linkedPlanItemId && !i.deleted)
                  : null;
                const displayContent = r.content.length > 100 ? r.content.slice(0, 100) + '...' : r.content;

                return (
                  <View key={r.id} style={{ marginBottom:10 }}>
                    <View style={{ borderRadius:12, borderWidth:1, borderColor:TH.border, overflow:'hidden' }}>
                        <TouchableOpacity
                          onPress={() => handleCardPress(r.id)}
                          onLongPress={() => handleCardLongPress(r.id)}
                          activeOpacity={0.85}
                        >
                        <LinearGradient
                        colors={(() => { const c = typeof r.colors === 'string' ? (() => { try { return JSON.parse(r.colors); } catch { return null; } })() : r.colors; return [c?.[0] || MIND_COLORS_EXTENDED[0][0], c?.[1] || MIND_COLORS_EXTENDED[0][1]]; })()}
                        start={{ x:0, y:0 }} end={{ x:1, y:1 }}
                        style={{ padding:14 }}
                      >
                        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                          <Text style={{ color:'rgba(255,255,255,.7)', fontSize:FONT_SMALL }}>
                            {new Date(r.timestamp ?? 0).toLocaleTimeString('zh-CN', { hour:'2-digit', minute:'2-digit' })}
                          </Text>
                          <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                            {linkedPlanItem && (
                              <TouchableOpacity
                                onPress={() => handleNavigateToPlan(linkedPlanItem.planId)}
                                style={{ flexDirection:'row', alignItems:'center', gap:3, paddingHorizontal:6, paddingVertical:2, borderRadius:6, backgroundColor:'rgba(255,255,255,.2)' }}
                              >
                                <ExternalLink size={10} color="#fff" />
                                <Text style={{ fontSize:FONT_TINY, color:'#fff', fontWeight:'500' }}>{linkedPlanItem.name.slice(0, 6)}</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>

                        {filters.search.trim() ? (
                          <Text style={{ color:'#fff', fontSize:FONT_BODY, lineHeight:26, marginBottom:8 }}>
                            {highlightSearchMatch(displayContent, filters.search).map((seg, i) => (
                              seg.highlight
                                ? <Text key={i} style={{ backgroundColor:'rgba(255,255,0,.3)', color:'#fff' }}>{seg.text}</Text>
                                : <Text key={i}>{seg.text}</Text>
                            ))}
                          </Text>
                        ) : (
                          <Text style={{ color:'#fff', fontSize:FONT_BODY, lineHeight:26, marginBottom:8 }}>{displayContent}</Text>
                        )}

                        {r.link && (
                          <TouchableOpacity onPress={() => r.link && Linking.openURL(r.link).catch((e) => log.error(e))} style={{ marginBottom:8 }}>
                            <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                              <Link size={12} color="rgba(255,255,255,.7)" />
                              <Text style={{ color:'rgba(255,255,255,.7)', fontSize:FONT_SMALL, textDecorationLine:'underline' }} numberOfLines={1}>{r.link}</Text>
                            </View>
                          </TouchableOpacity>
                        )}

                        {((r.tags ?? []).length > 0 || r.mood) && (
                          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:4, rowGap:2 }}>
                            {(r.tags ?? []).map(tag => {
                              const category = REFLECTION_CATEGORIES.find(c => `#${c.label}` === tag);
                              return (
                                <Text key={tag} style={{ color:'rgba(255,255,255,.9)', fontSize:FONT_SMALL }}>
                                  {category ? `${category.icon} ` : ''}{tag}
                                </Text>
                              );
                            })}
                            {r.mood && (
                              <Text style={{ color:'rgba(255,255,255,.7)', fontSize:FONT_SMALL }}>· {r.mood}</Text>
                            )}
                          </View>
                        )}
                        {(() => {
                          const linkedTrails = getTrailsByReflection(r.id, thoughtTrails ?? []).filter(t => !t.deleted);
                          if (linkedTrails.length === 0) return null;
                          return (
                            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:4, marginTop:6 }}>
                              {linkedTrails.map(t => (
                                <View key={t.id} style={{ flexDirection:'row', alignItems:'center', gap:3, paddingHorizontal:6, paddingVertical:2, borderRadius:6, backgroundColor:'rgba(255,255,255,.15)' }}>
                                  <Link size={10} color="rgba(255,255,255,.7)" />
                                  <Text style={{ fontSize:FONT_TINY, color:'rgba(255,255,255,.7)' }}>{t.name}</Text>
                                </View>
                              ))}
                            </View>
                          );
                        })()}
                      </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}
        {filtered.length === 0 && (
          <Text style={{ color: TH.sub, textAlign: 'center', marginTop: 60, fontSize: FONT_EMPTY }}>{T('reflEmpty')}</Text>
        )}
      </ScrollView>

      {/* Filter Drawer */}
      <FilterDrawer
        visible={showFilterDrawer}
        onClose={() => setShowFilterDrawer(false)}
        filters={filters}
        onApplyFilters={(newFilters) => {
          setFilters(newFilters);
        }}
        allTagOptions={allTagOptions}
        allMoodOptions={allMoodOptions}
        dynamicTagCounts={dynamicTagCounts}
        dynamicMoodCounts={dynamicMoodCounts}
        primaryColor={P}
      />

      {/* New reflection modal */}
      <Modal visible={showNew} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ flex:1, justifyContent:'flex-end', backgroundColor:'rgba(0,0,0,.5)' }}>
          <View style={{ backgroundColor:TH.cardSolid, borderTopLeftRadius:24, borderTopRightRadius:24, paddingHorizontal:24, paddingBottom:40, maxHeight:'90%' }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingTop:20, marginBottom:16 }}>
              <Text style={{ color:TH.text, fontWeight:'700', fontSize:FONT_TITLE }}>{T('reflNewTitle')}</Text>
              <TouchableOpacity onPress={() => { setShowNew(false); setManagerMode(null); setPendingTrailIds([]); }}><X size={26} color={TH.sub} /></TouchableOpacity>
            </View>
            <ReflectionForm
              content={content}
              onContentChange={setContent}
              colorIdx={colorIdx}
              onColorIdxChange={setColorIdx}
              tags={tags}
              onTagsChange={setTags}
              mood={mood}
              onMoodChange={setMood}
              onSave={saveReflection}
              saveLabel={T('saveReflection')}
              allTagOptions={visibleTagOptions}
              allMoodOptions={visibleMoodOptions}
              dynamicTagCounts={dynamicTagCounts}
              onOpenTagManager={() => setManagerMode('tag')}
              onOpenMoodManager={() => setManagerMode('mood')}
              linkedTrailNames={pendingTrailIds.map(id => (thoughtTrails ?? []).find(t => !t.deleted && t.id === id)?.name ?? '').filter(Boolean)}
              onOpenTrailPicker={() => setTrailPickerId('__new__')}
            />
          </View>
          {/* Item Manager Overlay */}
          {managerMode && (
            <View style={{ position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:TH.cardSolid, paddingTop:insets.top + 12, paddingBottom:insets.bottom, paddingHorizontal:24 }}>
              <ItemManagerPanel {...getManagerProps(
                useAppStore.getState(),
                managerMode,
                () => setManagerMode(null),
                managerMode === 'tag' ? hiddenTags : hiddenMoods,
                managerMode === 'tag' ? handleToggleHiddenTag : handleToggleHiddenMood,
              )} />
            </View>
          )}
          {/* Trail Picker for new reflection */}
          <TrailPickerModal
            visible={trailPickerId === '__new__'}
            reflectionId=""
            onClose={() => setTrailPickerId(null)}
            onToggle={(trailId, linked) => {
              setPendingTrailIds(prev =>
                linked ? [...prev, trailId] : prev.filter(id => id !== trailId)
              );
            }}
            linkedTrailIds={new Set(pendingTrailIds)}
          />
        </KeyboardAvoidingView>
      </Modal>

      {/* Action menu modal (long press) */}
      <Modal visible={!!actionMenuId} transparent animationType="fade" onRequestClose={() => setActionMenuId(null)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setActionMenuId(null)}
          style={{ flex:1, backgroundColor:'rgba(0,0,0,.5)', justifyContent:'flex-end' }}>
          <View style={{ backgroundColor:TH.cardSolid, borderTopLeftRadius:24, borderTopRightRadius:24, paddingBottom:40, paddingTop:20 }}>
            <View style={{ width:40, height:4, borderRadius:2, backgroundColor:TH.border, alignSelf:'center', marginBottom:20 }} />
            <TouchableOpacity onPress={() => {
              const r = (reflections ?? []).find(x => !x.deleted && x.id === actionMenuId);
              if (r) openEdit(r);
              setActionMenuId(null);
            }} style={{ marginHorizontal:16, marginBottom:12, paddingVertical:14, borderRadius:12, backgroundColor:P, alignItems:'center' }}>
              <Text style={{ color:'#fff', fontSize:FONT_BUTTON, fontWeight:'600' }}>{T('reflEditTitle')}</Text>
            </TouchableOpacity>
            {/* 创建/解除计划任务 */}
            {(() => {
              const r = (reflections ?? []).find(x => !x.deleted && x.id === actionMenuId);
              const isLinked = r?.linkedPlanItemId;
              return isLinked ? (
                <TouchableOpacity onPress={() => {
                  if (r) {
                    Alert.alert('解除关联', '确定解除与计划任务的关联吗？关联的计划任务将被删除。', [
                      { text: '取消', style: 'cancel' },
                      { text: '确定', style: 'destructive', onPress: () => {
                        // 先删除关联的计划任务
                        if (r.linkedPlanItemId) {
                          deletePlanItem(r.linkedPlanItemId);
                        }
                        // 再解除关联
                        unlinkReflectionFromPlanItem(r.id);
                      }},
                    ]);
                  }
                  setActionMenuId(null);
                }} style={{ marginHorizontal:16, marginBottom:12, paddingVertical:14, borderRadius:12, backgroundColor:'rgba(139,92,246,.15)', alignItems:'center' }}>
                  <Text style={{ color:'#8B5CF6', fontSize:FONT_BUTTON, fontWeight:'600' }}>🔗 解除任务关联</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => {
                  const activePlan = getActivePlan();
                  if (!activePlan) {
                    Alert.alert('提示', '暂无活跃计划，请先创建一个计划。');
                    setActionMenuId(null);
                    return;
                  }
                  const r = (reflections ?? []).find(x => !x.deleted && x.id === actionMenuId);
                  if (r) { setCreatePlanReflection(r); setShowCreatePlanRefModal(true); }
                  setActionMenuId(null);
                }} style={{ marginHorizontal:16, marginBottom:12, paddingVertical:14, borderRadius:12, backgroundColor:'rgba(16,185,129,.15)', alignItems:'center' }}>
                  <Text style={{ color:'#10B981', fontSize:FONT_BUTTON, fontWeight:'600' }}>🎯 创建为计划任务</Text>
                </TouchableOpacity>
              );
            })()}
            <TouchableOpacity onPress={() => {
              setTrailPickerId(actionMenuId);
              setActionMenuId(null);
            }} style={{ marginHorizontal:16, marginBottom:12, paddingVertical:14, borderRadius:12, backgroundColor:'rgba(139,92,246,.15)', alignItems:'center' }}>
              <Text style={{ color:'#8B5CF6', fontSize:FONT_BUTTON, fontWeight:'600' }}>🔗 关联思维脉络</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              const r = (reflections ?? []).find(x => !x.deleted && x.id === actionMenuId);
              if (r) onShare(r);
              else setActionMenuId(null);
            }} style={{ marginHorizontal:16, marginBottom:12, paddingVertical:14, borderRadius:12, backgroundColor:'rgba(59,130,246,.15)', alignItems:'center' }}>
              <Text style={{ color:'#3B82F6', fontSize:FONT_BUTTON, fontWeight:'600' }}>{T('reflShare')}</Text>
            </TouchableOpacity>
            {(() => {
              const r = (reflections ?? []).find(x => x.id === actionMenuId && !x.deleted);
              const isToday = r && dateStr(new Date(r.timestamp ?? 0)) === dateStr();
              return isToday ? (
                <TouchableOpacity onPress={() => {
                  setConfirmDel(actionMenuId);
                  setActionMenuId(null);
                }} style={{ marginHorizontal:16, marginBottom:12, paddingVertical:14, borderRadius:12, backgroundColor:'rgba(239,68,68,.15)', alignItems:'center' }}>
                  <Text style={{ color:COLORS.RED, fontSize:FONT_BUTTON, fontWeight:'600' }}>{T('reflDelete')}</Text>
                </TouchableOpacity>
              ) : null;
            })()}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Card detail modal */}
      <Modal visible={!!detailId} animationType="slide" transparent onRequestClose={() => setDetailId(null)}>
        {detailId && (
          <ReflectionDetailContent
            reflectionId={detailId}
            onClose={() => setDetailId(null)}
            onEdit={openEdit}
            onShare={onShare}
            onCreatePlanItem={handleCreatePlanItem}
            onDelete={setConfirmDel}
          />
        )}
      </Modal>

      {/* 创建计划任务弹窗 */}
      <CreatePlanFromReflectionModal
        key={createPlanReflection?.id ?? 'none'}
        visible={showCreatePlanRefModal}
        reflection={createPlanReflection}
        onClose={() => { setShowCreatePlanRefModal(false); setCreatePlanReflection(null); }}
        onCreate={handleCreatePlanRef}
      />

      {/* Share card modal */}
      <ShareCard
        visible={!!shareReflection}
        onClose={() => setShareReflection(null)}
        reflection={shareReflection}
      />

      {/* Confirm delete modal */}
      <Modal visible={!!confirmDel} transparent animationType="fade">
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,.7)', justifyContent:'center', padding:24 }}>
          <View style={{ backgroundColor:TH.cardSolid, borderRadius:20, padding:24, alignItems:'center' }}>
            <Text style={{ fontWeight:'700', fontSize:FONT_BODY, color:TH.text, marginBottom:12 }}>{T('reflDeleteConfirm')}</Text>
            <View style={{ flexDirection:'row', gap:10, width:'100%' }}>
              <OutlineButton label={T('cancel')} onPress={() => setConfirmDel(null)} style={{ flex:1 }} />
              <PrimaryButton label={T('confirm')} onPress={() => { if(confirmDel) deleteReflection(confirmDel); setConfirmDel(null); }} color={COLORS.RED} style={{ flex:1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit reflection modal */}
      <Modal visible={!!editId} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ flex:1, justifyContent:'flex-end', backgroundColor:'rgba(0,0,0,.5)' }}>
          <View style={{ backgroundColor:TH.cardSolid, borderTopLeftRadius:24, borderTopRightRadius:24, paddingHorizontal:24, paddingBottom:40, maxHeight:'90%' }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingTop:20, marginBottom:16 }}>
              <Text style={{ color:TH.text, fontWeight:'700', fontSize:FONT_TITLE }}>{T('reflEditTitle')}</Text>
              <TouchableOpacity onPress={cancelEdit}><X size={26} color={TH.sub} /></TouchableOpacity>
            </View>
            <ReflectionForm
              content={editContent}
              onContentChange={setEditContent}
              colorIdx={editColorIdx}
              onColorIdxChange={setEditColorIdx}
              tags={editTags}
              onTagsChange={setEditTags}
              mood={editMood}
              onMoodChange={setEditMood}
              onSave={saveEdit}
              saveLabel={T('reflSaveEdit')}
              allTagOptions={visibleTagOptions}
              allMoodOptions={visibleMoodOptions}
              dynamicTagCounts={dynamicTagCounts}
              onOpenTagManager={() => setManagerMode('tag')}
              onOpenMoodManager={() => setManagerMode('mood')}
              linkedTrailNames={getTrailsByReflection(editId ?? '', thoughtTrails ?? []).filter(t => !t.deleted).map(t => t.name)}
              onOpenTrailPicker={() => setTrailPickerId(editId)}
            />
          </View>
          {/* Item Manager Overlay */}
          {managerMode && (
            <View style={{ position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:TH.cardSolid, paddingTop:insets.top + 12, paddingBottom:insets.bottom, paddingHorizontal:24 }}>
              <ItemManagerPanel {...getManagerProps(
                useAppStore.getState(),
                managerMode,
                () => setManagerMode(null),
                managerMode === 'tag' ? hiddenTags : hiddenMoods,
                managerMode === 'tag' ? handleToggleHiddenTag : handleToggleHiddenMood,
              )} />
            </View>
          )}
          {/* Trail Picker for edit reflection */}
          {editId && (
            <TrailPickerModal
              visible={!!trailPickerId && trailPickerId !== '__new__'}
              reflectionId={trailPickerId ?? ''}
              onClose={() => setTrailPickerId(null)}
            />
          )}
        </KeyboardAvoidingView>
      </Modal>

      {/* Trail Picker Modal (top-level, for long-press menu when edit modal is not open) */}
      {!editId && trailPickerId && trailPickerId !== '__new__' && (
        <TrailPickerModal
          visible={!!trailPickerId && trailPickerId !== '__new__' && !editId}
          reflectionId={trailPickerId}
          onClose={() => setTrailPickerId(null)}
        />
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
});
