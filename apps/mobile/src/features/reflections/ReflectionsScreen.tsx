import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  KeyboardAvoidingView, Platform, TextInput, Linking, Alert, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { useTabNavigation, useRootNavigation, type MainTabParamList } from '../../navigation/hooks';
import {
  useTheme, ScreenHeader, TagPill, PrimaryButton, OutlineButton,
  ThemedInput, useT, PillSelector,
} from '../../components/UI';
import ItemManagerPanel from '../../components/ItemManagerPanel';
import DatePickerModal from '../../components/DatePickerModal';
import SimpleHeader from '../../navigation/SimpleHeader';
import ShareCard from './ShareCard';
import FilterDrawer from './FilterDrawer';
import { useReflections } from './useReflections';
import { MIND_COLORS_EXTENDED, TAGS_PRESET, MOODS, COLORS, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_SMALL, FONT_TINY, FONT_STAT_CARD, FONT_EMPTY, FONT_LABEL, dateStr, REFLECTION_CATEGORIES } from '@egoless-do/core';
import { highlightSearchMatch, computeSmartCollections } from '@egoless-do/core';
import {
  Settings, X, Eye, EyeOff, ExternalLink, ArrowLeft, Link, BarChart3, Target,
} from 'lucide-react-native';

// ── Manager helpers ───────────────────────────────────────────────
function useManagerProps(mode: 'tag' | 'mood', onBack: () => void) {
  const store = useAppStore();
  const habitTags = useMemo(() =>
    mode === 'tag'
      ? (store.habits ?? []).filter(h => h.createTag).map(h => `#${h.name}`)
      : [],
    [store.habits, mode]
  );

  if (mode === 'tag') {
    const orderedTags = store.allTagsOrder?.length
      ? store.allTagsOrder
      : [...TAGS_PRESET, ...(store.customTags ?? []), ...habitTags];
    const sections = [
      { titleKey: 'tagSectionPreset', items: TAGS_PRESET.filter(t => orderedTags.includes(t)), isPreset: true, isReadonly: true } as const,
      { titleKey: 'tagSectionCustom', items: (store.customTags ?? []).filter(t => orderedTags.includes(t)), isPreset: false, isReadonly: false } as const,
      { titleKey: 'tagSectionHabit', items: habitTags.filter(t => orderedTags.includes(t)), isPreset: false, isReadonly: true } as const,
    ];
    return {
      titleKey: 'tagManager', backLabelKey: 'reflBack',
      inputPlaceholderKey: 'newTagPlaceholder', tooLongKey: 'tagTooLong', maxReachedKey: 'maxTagsReached',
      deleteConfirmKey: 'tagDeleteConfirm', usedByKey: 'tagUsedBy', deleteTitleKey: 'tagDelete',
      presetLabelKey: 'preset' as string | undefined, readonlyLabelKey: 'habitTag' as string | undefined,
      sections,
      addItem: (s: string) => store.addCustomTag(s),
      updateItem: (o: string, n: string) => store.updateCustomTag(o, n),
      removeItem: (s: string) => store.removeCustomTag(s),
      reorderItem: (from: number, to: number, _ordered: string[]) => store.reorderAllTag(from, to),
      getReflectionsContainingItem: (s: string) => (store.reflections ?? []).filter(r => (r as any).tags?.includes(s)).length,
      customItems: store.customTags ?? [],
      formatInput: (s: string) => s.startsWith('#') ? s : `#${s}`,
      onBack,
    };
  }

  const orderedMoods = store.allMoodsOrder?.length
    ? store.allMoodsOrder
    : [...MOODS, ...(store.customMoods ?? [])];
  const sections = [
    { titleKey: 'moodSectionPreset', items: (MOODS as string[]).filter(m => orderedMoods.includes(m)), isPreset: true, isReadonly: true } as const,
    { titleKey: 'moodSectionCustom', items: (store.customMoods ?? []).filter(m => orderedMoods.includes(m)), isPreset: false, isReadonly: false } as const,
  ];
  return {
    titleKey: 'moodManager', backLabelKey: 'reflBack',
    inputPlaceholderKey: 'newMoodPlaceholder', tooLongKey: 'moodTooLong', maxReachedKey: 'maxMoodsReached',
    deleteConfirmKey: 'moodDeleteConfirm', usedByKey: 'moodUsedBy', deleteTitleKey: 'moodDelete',
    presetLabelKey: 'preset' as string | undefined, readonlyLabelKey: undefined,
    sections,
    addItem: (s: string) => store.addCustomMood(s),
    updateItem: (o: string, n: string) => store.updateCustomMood(o, n),
    removeItem: (s: string) => store.removeCustomMood(s),
    reorderItem: (from: number, to: number, _ordered: string[]) => store.reorderAllMood(from, to),
    getReflectionsContainingItem: (s: string) => (store.reflections ?? []).filter(r => (r as any).mood === s).length,
    customItems: store.customMoods ?? [],
    onBack,
  };
}

// ── ReflectionsScreen ────────────────────────────────────────────
export default function ReflectionsScreen() {
  const TH    = useTheme();
  const P     = TH.primary;
  const store = useAppStore();
  const T     = useT();
  const route = useRoute<RouteProp<MainTabParamList, 'Reflections'>>();
  const nav   = useTabNavigation();
  const rootNav = useRootNavigation();

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
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [managerMode, setManagerMode] = useState<'tag'|'mood'|null>(null);

  // Date collapse state: track which day groups are collapsed
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const initializedCollapse = useRef(false);
  useEffect(() => {
    if (!initializedCollapse.current) {
      const days = Object.keys(byDay);
      if (days.length > 1) {
        setCollapsedDays(new Set(days.slice(1))); // collapse all except the first (most recent)
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
  const [content, setContent]     = useState('');
  const [tags, setTags]           = useState<string[]>([]);
  const [mood, setMood]           = useState('');
  const [link, setLink]           = useState('');
  const [colorIdx, setColorIdx]   = useState(0);
  const [category, setCategory]   = useState('');
  const [confirmDel, setConfirmDel] = useState<string|null>(null);
  const [shareReflection, setShareReflection] = useState<any>(null);

  // Long press action menu state
  const [actionMenuId, setActionMenuId] = useState<string|null>(null);

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

  // Tag/Mood manager visibility - managerMode declared above

  // Create plan item state
  const [showCreatePlanItem, setShowCreatePlanItem] = useState(false);
  const [selectedReflectionId, setSelectedReflectionId] = useState<string | null>(null);
  const [planItemName, setPlanItemName] = useState('');
  const [planItemDescription, setPlanItemDescription] = useState('');
  const [planItemTargetMetric, setPlanItemTargetMetric] = useState('');
  const [planItemStartDate, setPlanItemStartDate] = useState(() => {
    const today = dateStr();
    const activePlan = store.getActivePlan();
    if (activePlan) {
      return today >= activePlan.startDate ? today : activePlan.startDate;
    }
    return today;
  });
  const [planItemEndDate, setPlanItemEndDate] = useState(() => {
    const activePlan = store.getActivePlan();
    if (activePlan) return activePlan.endDate;
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [planItemPriority, setPlanItemPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Calendar heatmap data (last 35 days = 5 weeks)
  const calendarData = useMemo(() => {
    const today = new Date();
    const data: { date: string; count: number; dayLabel: string }[] = [];
    for (let i = 34; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const count = (store.reflections ?? []).filter(r =>
        new Date(r.timestamp ?? 0).toISOString().slice(0, 10) === ds
      ).length;
      const dayLabel = d.toLocaleDateString('zh-CN', { weekday: 'narrow' });
      data.push({ date: ds, count, dayLabel });
    }
    return data;
  }, [store.reflections]);

  const saveReflection = () => {
    if (!content.trim()) return;
    // Add category tag if selected
    const categoryTag = category ? `#${REFLECTION_CATEGORIES.find(c => c.key === category)?.label}` : '';
    const finalTags = categoryTag && !tags.includes(categoryTag) ? [categoryTag, ...tags] : tags;
    store.addReflection({ content, tags: finalTags, mood, colorIdx, link: link.trim() || undefined });
    setContent(''); setTags([]); setMood(''); setLink(''); setColorIdx(0); setCategory('');
    setShowNew(false);
  };

  const openEdit = (r: any) => {
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
    const categoryTag = editCategory ? `#${REFLECTION_CATEGORIES.find(c => c.key === editCategory)?.label}` : '';
    const oldCategoryTags = REFLECTION_CATEGORIES.map(c => `#${c.label}`);
    // Remove old category tags and add new one
    let finalTags = editTags.filter(t => !oldCategoryTags.includes(t));
    if (categoryTag) finalTags = [categoryTag, ...finalTags];

    store.updateReflection(editId, {
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
  };

  const onShare = async (r: any) => {
    await handleShare(r);
    setActionMenuId(null);
  };

  const handleEdit = useCallback((id: string) => {
    const r = (store.reflections ?? []).find(x => x.id === id);
    if (r) openEdit(r);
  }, [store]);

  const handleCreatePlanItem = useCallback((id: string) => {
    const r = (store.reflections ?? []).find(x => x.id === id);
    if (r) {
      const activePlan = store.getActivePlan();
      if (!activePlan) {
        Alert.alert('提示', '暂无活跃计划，请先创建一个计划。');
        return;
      }
      setSelectedReflectionId(id);
      setShowCreatePlanItem(true);
    }
  }, [store]);

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
                  ? (store.planItems ?? []).find(i => i.id === r.linkedPlanItemId && !i.deleted)
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
                                style={{ flexDirection:'row', alignItems:'center', gap:3, paddingHorizontal:6, paddingVertical:2, borderRadius:6, backgroundColor:`${P}15` }}
                              >
                                <ExternalLink size={10} color={P} />
                                <Text style={{ fontSize:FONT_TINY, color:P, fontWeight:'500' }}>{linkedPlanItem.name.slice(0, 6)}</Text>
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
                          <TouchableOpacity onPress={() => Linking.openURL(r.link!).catch(console.error)} style={{ marginBottom:8 }}>
                            <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                              <Link size={12} color="rgba(255,255,255,.7)" />
                              <Text style={{ color:'rgba(255,255,255,.7)', fontSize:FONT_SMALL, textDecorationLine:'underline' }} numberOfLines={1}>{r.link}</Text>
                            </View>
                          </TouchableOpacity>
                        )}

                        {(r.tags.length > 0 || r.mood) && (
                          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:4, rowGap:2 }}>
                            {r.tags.map(tag => {
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
          setShowFilterDrawer(false);
        }}
        allTagOptions={allTagOptions}
        allMoodOptions={allMoodOptions}
        dynamicTagCounts={dynamicTagCounts}
        dynamicMoodCounts={dynamicMoodCounts}
        primaryColor={P}
      />

      {/* New reflection modal */}
      <Modal visible={showNew} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ flex:1, justifyContent:'flex-end' }}>
          <View style={{ backgroundColor:TH.cardSolid, borderTopLeftRadius:24, borderTopRightRadius:24, paddingHorizontal:24, paddingBottom:40, maxHeight:'90%' }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingTop:20, marginBottom:16 }}>
              <Text style={{ color:TH.text, fontWeight:'700', fontSize:FONT_TITLE }}>{T('reflNewTitle')}</Text>
              <TouchableOpacity onPress={() => { setShowNew(false); setManagerMode(null); }}><X size={26} color={TH.sub} /></TouchableOpacity>
            </View>
            {managerMode ? (
              <ItemManagerPanel {...useManagerProps(managerMode, () => setManagerMode(null))} />
            ) : (
            <ScrollView keyboardShouldPersistTaps="handled">
              {/* Card theme color */}
              <View style={{ flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:16, paddingVertical:4 }}>
                {MIND_COLORS_EXTENDED.map((c, i) => {
                  const isActive = colorIdx === i;
                  return (
                    <TouchableOpacity key={i} onPress={() => setColorIdx(i)}
                      style={{
                        width: isActive ? 36 : 32,
                        height: isActive ? 36 : 32,
                        borderRadius: 18,
                        backgroundColor: isActive ? c[0] : 'transparent',
                        padding: isActive ? 2 : 0,
                        overflow: 'hidden',
                      }}>
                      <View style={{
                        flex:1, borderRadius:16, overflow:'hidden',
                        borderWidth: isActive ? 2 : 0,
                        borderColor: isActive ? '#fff' : 'transparent',
                      }}>
                        <View style={{ flex:1, backgroundColor:c[0] }} />
                        <View style={{ position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:c[1], opacity:0.5 }} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Content with 200-char limit */}
              <View style={{ marginBottom:16 }}>
                <ThemedInput value={content} onChangeText={setContent}
                  placeholder={T('reflPlaceholder')}
                  multiline numberOfLines={4} style={{ minHeight:90 }} />
                <Text style={{ color: content.length > 200 ? COLORS.RED : TH.sub, fontSize:FONT_BODY, textAlign:'right', marginTop:4 }}>
                  {content.length}/200
                </Text>
              </View>

              {/* Tags */}
              <Text style={{ color:TH.sub, fontSize:FONT_LABEL, marginBottom:8 }}>{T('reflAddTag')}</Text>
              <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:16 }}>
                <PillSelector options={allTagOptions} selected={tags} onChange={t => setTags(ts => ts.includes(t) ? ts.filter(x=>x!==t) : [...ts,t])} counts={dynamicTagCounts} color={P} textActiveColor={P} />
                <TouchableOpacity onPress={() => setManagerMode('tag')}
                  style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:16, borderWidth:1, borderColor:TH.border, borderStyle:'dashed' }}>
                  <Settings size={16} color={TH.sub} />
                </TouchableOpacity>
              </View>

              {/* Mood */}
              <Text style={{ color:TH.sub, fontSize:FONT_LABEL, marginBottom:8 }}>{T('reflMood')}</Text>
              <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:24 }}>
                <PillSelector options={allMoodOptions} selected={mood ? [mood] : []} onChange={m => setMood(mood === m ? '' : m)} color={P} textActiveColor={P} />
                <TouchableOpacity onPress={() => setManagerMode('mood')}
                  style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:16, borderWidth:1, borderColor:TH.border, borderStyle:'dashed' }}>
                  <Settings size={16} color={TH.sub} />
                </TouchableOpacity>
              </View>

              <PrimaryButton label={T('saveReflection')} onPress={saveReflection} />
            </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Action menu modal (long press) */}
      <Modal visible={!!actionMenuId} transparent animationType="fade" onRequestClose={() => setActionMenuId(null)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setActionMenuId(null)}
          style={{ flex:1, backgroundColor:'rgba(0,0,0,.5)', justifyContent:'flex-end' }}>
          <View style={{ backgroundColor:TH.cardSolid, borderTopLeftRadius:24, borderTopRightRadius:24, paddingBottom:40, paddingTop:20 }}>
            <View style={{ width:40, height:4, borderRadius:2, backgroundColor:TH.border, alignSelf:'center', marginBottom:20 }} />
            <TouchableOpacity onPress={() => {
              const r = (store.reflections ?? []).find(x => x.id === actionMenuId);
              if (r) openEdit(r);
              setActionMenuId(null);
            }} style={{ marginHorizontal:16, marginBottom:12, paddingVertical:14, borderRadius:12, backgroundColor:P, alignItems:'center' }}>
              <Text style={{ color:'#fff', fontSize:FONT_BUTTON, fontWeight:'600' }}>{T('reflEditTitle')}</Text>
            </TouchableOpacity>
            {/* 创建/解除计划任务 */}
            {(() => {
              const r = (store.reflections ?? []).find(x => x.id === actionMenuId);
              const isLinked = r?.linkedPlanItemId;
              return isLinked ? (
                <TouchableOpacity onPress={() => {
                  if (r) {
                    Alert.alert('解除关联', '确定解除与计划任务的关联吗？关联的计划任务将被删除。', [
                      { text: '取消', style: 'cancel' },
                      { text: '确定', style: 'destructive', onPress: () => {
                        // 先删除关联的计划任务
                        if (r.linkedPlanItemId) {
                          store.deletePlanItem(r.linkedPlanItemId);
                        }
                        // 再解除关联
                        store.unlinkReflectionFromPlanItem(r.id);
                      }},
                    ]);
                  }
                  setActionMenuId(null);
                }} style={{ marginHorizontal:16, marginBottom:12, paddingVertical:14, borderRadius:12, backgroundColor:'rgba(139,92,246,.15)', alignItems:'center' }}>
                  <Text style={{ color:'#8B5CF6', fontSize:FONT_BUTTON, fontWeight:'600' }}>🔗 解除任务关联</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => {
                  const activePlan = store.getActivePlan();
                  if (!activePlan) {
                    Alert.alert('提示', '暂无活跃计划，请先创建一个计划。');
                    setActionMenuId(null);
                    return;
                  }
                  setSelectedReflectionId(actionMenuId);
                  setShowCreatePlanItem(true);
                  setActionMenuId(null);
                }} style={{ marginHorizontal:16, marginBottom:12, paddingVertical:14, borderRadius:12, backgroundColor:'rgba(16,185,129,.15)', alignItems:'center' }}>
                  <Text style={{ color:'#10B981', fontSize:FONT_BUTTON, fontWeight:'600' }}>🎯 创建为计划任务</Text>
                </TouchableOpacity>
              );
            })()}
            <TouchableOpacity onPress={() => {
              const r = (store.reflections ?? []).find(x => x.id === actionMenuId);
              if (r) onShare(r);
              else setActionMenuId(null);
            }} style={{ marginHorizontal:16, marginBottom:12, paddingVertical:14, borderRadius:12, backgroundColor:'rgba(59,130,246,.15)', alignItems:'center' }}>
              <Text style={{ color:'#3B82F6', fontSize:FONT_BUTTON, fontWeight:'600' }}>{T('reflShare')}</Text>
            </TouchableOpacity>
            {(() => {
              const r = (store.reflections ?? []).find(x => x.id === actionMenuId);
              const isToday = r && new Date(r.timestamp ?? 0).toISOString().slice(0,10) === new Date().toISOString().slice(0,10);
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
        {(() => {
          const r = (store.reflections ?? []).find(x => x.id === detailId);
          if (!r) return null;
          const linkedPlanItem = r.linkedPlanItemId
            ? (store.planItems ?? []).find(i => i.id === r.linkedPlanItemId && !i.deleted)
            : null;
          const colors: [string, string] = [r.colors?.[0] || MIND_COLORS_EXTENDED[0][0], r.colors?.[1] || MIND_COLORS_EXTENDED[0][1]];
          const isToday = new Date(r.timestamp ?? 0).toISOString().slice(0,10) === new Date().toISOString().slice(0,10);
          return (
            <View style={{ position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,.5)', justifyContent:'flex-end' }}>
              <TouchableOpacity activeOpacity={1} onPress={() => setDetailId(null)} style={{ flex:1 }} />
              <LinearGradient
                colors={colors}
                start={{ x:0, y:0 }} end={{ x:1, y:1 }}
                style={{ borderTopLeftRadius:24, borderTopRightRadius:24, paddingHorizontal:24, paddingBottom:40, paddingTop:20, maxHeight:'95%' }}
              >
                {/* Header */}
                <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                  <TouchableOpacity onPress={() => setDetailId(null)}>
                    <ArrowLeft size={24} color="#fff" />
                  </TouchableOpacity>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                    {r.isPinned && <Pin size={14} color="#fff" />}
                    <Text style={{ color:'rgba(255,255,255,.7)', fontSize:FONT_SMALL }}>
                      {new Date(r.timestamp ?? 0).toLocaleDateString('zh-CN', { year:'numeric', month:'long', day:'numeric' })}
                      {' '}
                      {new Date(r.timestamp ?? 0).toLocaleTimeString('zh-CN', { hour:'2-digit', minute:'2-digit' })}
                    </Text>
                  </View>
                </View>

                <ScrollView>
                  {/* Content */}
                  <Text style={{ color:'#fff', fontSize:FONT_BODY, lineHeight:28, marginBottom:16 }}>{r.content}</Text>

                  {/* Tags + Mood */}
                  {(r.tags.length > 0 || r.mood) && (
                    <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:16 }}>
                      {r.tags.map(tag => (
                        <View key={tag} style={{ backgroundColor:'rgba(255,255,255,.2)', paddingHorizontal:10, paddingVertical:4, borderRadius:12 }}>
                          <Text style={{ color:'#fff', fontSize:FONT_SMALL }}>{tag}</Text>
                        </View>
                      ))}
                      {r.mood && (
                        <View style={{ backgroundColor:'rgba(255,255,255,.15)', paddingHorizontal:10, paddingVertical:4, borderRadius:12 }}>
                          <Text style={{ color:'rgba(255,255,255,.8)', fontSize:FONT_SMALL }}>{r.mood}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Link */}
                  {r.link && (
                    <TouchableOpacity onPress={() => Linking.openURL(r.link!).catch(console.error)} style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:12 }}>
                      <Link size={14} color="rgba(255,255,255,.7)" />
                      <Text style={{ color:'rgba(255,255,255,.7)', fontSize:FONT_SMALL, textDecorationLine:'underline', flex:1 }} numberOfLines={2}>{r.link}</Text>
                    </TouchableOpacity>
                  )}

                  {/* Linked plan item */}
                  {linkedPlanItem && (
                    <TouchableOpacity
                      onPress={() => { setDetailId(null); nav.navigate('PlanDetail', { planId: linkedPlanItem.planId }); }}
                      style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:12, backgroundColor:'rgba(255,255,255,.15)', paddingHorizontal:12, paddingVertical:8, borderRadius:10 }}
                    >
                      <ExternalLink size={14} color="#fff" />
                      <Text style={{ color:'#fff', fontSize:FONT_SMALL }} numberOfLines={1}>{linkedPlanItem.name}</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>

                {/* Action buttons */}
                <View style={{ flexDirection:'row', gap:10, marginTop:20, flexWrap:'wrap' }}>
                  <TouchableOpacity onPress={() => { setDetailId(null); openEdit(r); }}
                    style={{ flex:1, backgroundColor:'rgba(255,255,255,.25)', paddingVertical:12, borderRadius:12, alignItems:'center' }}>
                    <Text style={{ color:'#fff', fontSize:FONT_BUTTON, fontWeight:'600' }}>{T('reflEditTitle')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setDetailId(null); onShare(r); }}
                    style={{ flex:1, backgroundColor:'rgba(255,255,255,.25)', paddingVertical:12, borderRadius:12, alignItems:'center' }}>
                    <Text style={{ color:'#fff', fontSize:FONT_BUTTON, fontWeight:'600' }}>{T('reflShare')}</Text>
                  </TouchableOpacity>
                  {r.linkedPlanItemId ? (
                    <TouchableOpacity onPress={() => {
                      Alert.alert('解除关联', '确定解除与计划任务的关联吗？关联的计划任务将被删除。', [
                        { text: '取消', style: 'cancel' },
                        { text: '确定', style: 'destructive', onPress: () => {
                          if (r.linkedPlanItemId) store.deletePlanItem(r.linkedPlanItemId);
                          store.unlinkReflectionFromPlanItem(r.id);
                          setDetailId(null);
                        }},
                      ]);
                    }}
                      style={{ flex:1, backgroundColor:'rgba(139,92,246,.3)', paddingVertical:12, borderRadius:12, alignItems:'center' }}>
                      <Text style={{ color:'#fff', fontSize:FONT_BUTTON, fontWeight:'600' }}>解绑任务</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => { setDetailId(null); handleCreatePlanItem(r.id); }}
                      style={{ flex:1, backgroundColor:'rgba(16,185,129,.3)', paddingVertical:12, borderRadius:12, alignItems:'center' }}>
                      <Text style={{ color:'#fff', fontSize:FONT_BUTTON, fontWeight:'600' }}>创建任务</Text>
                    </TouchableOpacity>
                  )}
                  {isToday && (
                    <TouchableOpacity onPress={() => { setDetailId(null); setConfirmDel(r.id); }}
                      style={{ flex:1, backgroundColor:'rgba(239,68,68,.4)', paddingVertical:12, borderRadius:12, alignItems:'center' }}>
                      <Text style={{ color:'#fff', fontSize:FONT_BUTTON, fontWeight:'600' }}>{T('reflDelete')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </LinearGradient>
            </View>
          );
        })()}
      </Modal>

      {/* 创建计划任务弹窗 */}
      <Modal visible={showCreatePlanItem} transparent animationType="fade">
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,.7)', justifyContent:'center', padding:24 }}>
          <View style={{ backgroundColor:TH.cardSolid, borderRadius:20, padding:24, maxHeight:'90%' }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <Text style={{ fontWeight:'700', fontSize:FONT_TITLE, color:TH.text }}>创建计划任务</Text>
                <TouchableOpacity onPress={() => { 
                  setShowCreatePlanItem(false); 
                  setSelectedReflectionId(null);
                  setPlanItemName('');
                  setPlanItemDescription('');
                  setPlanItemTargetMetric('');
                }}>
                  <X size={24} color={TH.sub} />
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize:FONT_BODY, fontWeight:'600', color:TH.text, marginBottom:16 }}>
                关联计划: {store.getActivePlan()?.name || '无活跃计划'}（进行中）
              </Text>
              
              {/* 获取当前选中的感念 */}
              {(() => {
                const reflection = (store.reflections ?? []).find(r => r.id === selectedReflectionId);
                if (!reflection) return null;
                const lines = reflection.content.split('\n').filter(l => l.trim());
                const defaultName = lines[0]?.slice(0, 50) || reflection.content.slice(0, 50);
                
                return (
                  <>
                    {/* 任务名称（必填） */}
                    <Text style={{ fontSize:FONT_SUB, color:TH.sub, marginBottom:6 }}>任务名称 *</Text>
                    <TextInput
                      value={planItemName || defaultName}
                      onChangeText={setPlanItemName}
                      placeholder="请输入任务名称"
                      style={{ borderWidth:1, borderColor:TH.border, borderRadius:8, padding:12, marginBottom:12, color:TH.text, backgroundColor:TH.card }}
                    />
                    
                    {/* 任务指标（必填） */}
                    <Text style={{ fontSize:FONT_SUB, color:TH.sub, marginBottom:6 }}>任务指标 *</Text>
                    <TextInput
                      value={planItemTargetMetric}
                      onChangeText={setPlanItemTargetMetric}
                      placeholder="例如：每天练习30分钟"
                      style={{ borderWidth:1, borderColor:TH.border, borderRadius:8, padding:12, marginBottom:12, color:TH.text, backgroundColor:TH.card }}
                    />
                    
                    {/* 任务描述 */}
                    <Text style={{ fontSize:FONT_SUB, color:TH.sub, marginBottom:6 }}>任务描述</Text>
                    <TextInput
                      value={planItemDescription || reflection.content}
                      onChangeText={setPlanItemDescription}
                      placeholder="请输入任务描述"
                      multiline
                      numberOfLines={2}
                      style={{ borderWidth:1, borderColor:TH.border, borderRadius:8, padding:12, marginBottom:12, color:TH.text, backgroundColor:TH.card, minHeight:60, textAlignVertical:'top' }}
                    />

                    {/* 任务链接（只读，自动填入感念标签） */}
                    <Text style={{ fontSize:FONT_SUB, color:TH.sub, marginBottom:6 }}>任务链接</Text>
                    <TextInput
                      value={reflection.tags.join(', ')}
                      editable={false}
                      style={{ borderWidth:1, borderColor:TH.border, borderRadius:8, padding:12, marginBottom:12, color:TH.sub, backgroundColor:TH.card }}
                    />
                  </>
                );
              })()}
              
              <Text style={{ fontSize:FONT_SUB, color:TH.sub, marginBottom:6 }}>开始日期</Text>
              <TouchableOpacity
                onPress={() => setShowStartDatePicker(true)}
                style={{ borderWidth:1, borderColor:TH.border, borderRadius:8, padding:12, marginBottom:12, backgroundColor:TH.card }}
              >
                <Text style={{ color:TH.text, fontSize:FONT_BODY }}>{planItemStartDate}</Text>
              </TouchableOpacity>
              <Text style={{ fontSize:FONT_SUB, color:TH.sub, marginBottom:6 }}>结束日期</Text>
              <TouchableOpacity
                onPress={() => setShowEndDatePicker(true)}
                style={{ borderWidth:1, borderColor:TH.border, borderRadius:8, padding:12, marginBottom:12, backgroundColor:TH.card }}
              >
                <Text style={{ color:TH.text, fontSize:FONT_BODY }}>{planItemEndDate}</Text>
              </TouchableOpacity>
              <Text style={{ fontSize:FONT_SUB, color:TH.sub, marginBottom:6 }}>优先级</Text>
              <View style={{ flexDirection:'row', gap:8, marginBottom:18 }}>
                {[
                  { value: 'high' as const, label: '高', color: '#FF4444' },
                  { value: 'medium' as const, label: '中', color: '#FFAA00' },
                  { value: 'low' as const, label: '低', color: '#44AA44' },
                ].map(p => (
                  <TouchableOpacity
                    key={p.value}
                    onPress={() => setPlanItemPriority(p.value)}
                    style={{ flex:1, padding:10, borderRadius:8, borderWidth:1, borderColor: planItemPriority === p.value ? p.color : TH.border, backgroundColor: planItemPriority === p.value ? `${p.color}20` : 'transparent', alignItems:'center' }}
                  >
                    <Text style={{ color: planItemPriority === p.value ? p.color : TH.text, fontWeight: planItemPriority === p.value ? '600' : '400' }}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flexDirection:'row', gap:10 }}>
                <OutlineButton label="取消" onPress={() => { 
                  setShowCreatePlanItem(false); 
                  setSelectedReflectionId(null);
                  setPlanItemName('');
                  setPlanItemDescription('');
                  setPlanItemTargetMetric('');
                }} style={{ flex:1 }} />
                <PrimaryButton label="创建" onPress={() => {
                  if (selectedReflectionId) {
                    const reflection = (store.reflections ?? []).find(r => r.id === selectedReflectionId);
                    const lines = reflection?.content.split('\n').filter(l => l.trim()) || [];
                    const defaultName = lines[0]?.slice(0, 50) || reflection?.content.slice(0, 50) || '';
                    const finalName = planItemName || defaultName;
                    
                    if (!finalName.trim()) {
                      Alert.alert('提示', '请输入任务名称');
                      return;
                    }
                    if (!planItemTargetMetric.trim()) {
                      Alert.alert('提示', '请输入任务指标');
                      return;
                    }
                    
                    const success = store.createPlanItemFromReflection(
                      selectedReflectionId, 
                      planItemStartDate, 
                      planItemEndDate, 
                      planItemPriority,
                      finalName,
                      planItemDescription || reflection?.content || '',
                      planItemTargetMetric
                    );
                    if (success) {
                      setShowCreatePlanItem(false);
                      setSelectedReflectionId(null);
                      setPlanItemName('');
                      setPlanItemDescription('');
                      setPlanItemTargetMetric('');
                      Alert.alert('成功', '计划任务已创建');
                    }
                  }
                }} style={{ flex:1 }} />
              </View>
            </ScrollView>
          </View>
        </View>
        {/* Date pickers for plan item */}
        <DatePickerModal
          visible={showStartDatePicker}
          value={planItemStartDate}
          onConfirm={(date) => { setPlanItemStartDate(date); setShowStartDatePicker(false); }}
          onClose={() => setShowStartDatePicker(false)}
          minDate={(() => { const today = dateStr(); const plan = store.getActivePlan(); const planStart = plan?.startDate ?? today; return today >= planStart ? today : planStart; })()}
          maxDate={planItemEndDate}
        />
        <DatePickerModal
          visible={showEndDatePicker}
          value={planItemEndDate}
          onConfirm={(date) => { setPlanItemEndDate(date); setShowEndDatePicker(false); }}
          onClose={() => setShowEndDatePicker(false)}
          minDate={planItemStartDate}
          maxDate={store.getActivePlan()?.endDate}
        />
      </Modal>

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
              <PrimaryButton label={T('confirm')} onPress={() => { if(confirmDel) store.deleteReflection(confirmDel); setConfirmDel(null); }} color={COLORS.RED} style={{ flex:1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit reflection modal */}
      <Modal visible={!!editId} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ flex:1, justifyContent:'flex-end' }}>
          <View style={{ backgroundColor:TH.cardSolid, borderTopLeftRadius:24, borderTopRightRadius:24, paddingHorizontal:24, paddingBottom:40, maxHeight:'90%' }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingTop:20, marginBottom:16 }}>
              <Text style={{ color:TH.text, fontWeight:'700', fontSize:FONT_TITLE }}>{T('reflEditTitle')}</Text>
              <TouchableOpacity onPress={cancelEdit}><X size={26} color={TH.sub} /></TouchableOpacity>
            </View>
            {managerMode ? (
              <ItemManagerPanel {...useManagerProps(managerMode, () => setManagerMode(null))} />
            ) : (
            <ScrollView keyboardShouldPersistTaps="handled">
              {/* Card theme color */}
              <View style={{ flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:16, paddingVertical:4 }}>
                {MIND_COLORS_EXTENDED.map((c, i) => {
                  const isActive = editColorIdx === i;
                  return (
                    <TouchableOpacity key={i} onPress={() => setEditColorIdx(i)}
                      style={{
                        width: isActive ? 36 : 32,
                        height: isActive ? 36 : 32,
                        borderRadius: 18,
                        backgroundColor: isActive ? c[0] : 'transparent',
                        padding: isActive ? 2 : 0,
                        overflow: 'hidden',
                      }}>
                      <View style={{
                        flex:1, borderRadius:16, overflow:'hidden',
                        borderWidth: isActive ? 2 : 0,
                        borderColor: isActive ? '#fff' : 'transparent',
                      }}>
                        <View style={{ flex:1, backgroundColor:c[0] }} />
                        <View style={{ position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:c[1], opacity:0.5 }} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Content with 200-char limit */}
              <View style={{ marginBottom:16 }}>
                <ThemedInput value={editContent} onChangeText={setEditContent}
                  placeholder={T('reflPlaceholder')}
                  multiline numberOfLines={4} style={{ minHeight:90 }} />
                <Text style={{ color: editContent.length > 200 ? COLORS.RED : TH.sub, fontSize:FONT_BODY, textAlign:'right', marginTop:4 }}>
                  {editContent.length}/200
                </Text>
              </View>

              {/* Tags */}
              <Text style={{ color:TH.sub, fontSize:FONT_LABEL, marginBottom:8 }}>{T('reflAddTag')}</Text>
              <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:16 }}>
                <PillSelector options={allTagOptions} selected={editTags} onChange={t => setEditTags(ts => ts.includes(t) ? ts.filter(x=>x!==t) : [...ts,t])} counts={dynamicTagCounts} color={P} textActiveColor={P} />
                <TouchableOpacity onPress={() => setManagerMode('tag')}
                  style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:16, borderWidth:1, borderColor:TH.border, borderStyle:'dashed' }}>
                  <Settings size={16} color={TH.sub} />
                </TouchableOpacity>
              </View>

              {/* Mood */}
              <Text style={{ color:TH.sub, fontSize:FONT_LABEL, marginBottom:8 }}>{T('reflMood')}</Text>
              <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:24 }}>
                <PillSelector options={allMoodOptions} selected={editMood ? [editMood] : []} onChange={m => setEditMood(editMood === m ? '' : m)} color={P} textActiveColor={P} />
                <TouchableOpacity onPress={() => setManagerMode('mood')}
                  style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:16, borderWidth:1, borderColor:TH.border, borderStyle:'dashed' }}>
                  <Settings size={16} color={TH.sub} />
                </TouchableOpacity>
              </View>

              <PrimaryButton label={T('reflSaveEdit')} onPress={saveEdit} />
            </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
});
