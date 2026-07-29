import { COLORS, getPlanItems, PRIORITY_OPTIONS, canDeletePlan, canEditPlan, statusToI18nKey, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_STAT_CARD, FONT_STAT_SECTION, FONT_EMPTY, FONT_TINY, getFrequencySummary, MS_PER_DAY, createDateChangeDetector, countItemDoneDays, computeItemProgress, computePlanProgress , FONT_SMALL } from '@egoless-do/core';
import type { PlanItem, PlanItemCheckin, PlanItemStatus, Vision } from '@egoless-do/core';
import { ChevronDown, ChevronRight, Check, Trash2, Pencil, CircleCheck, Play, Pause, XCircle, ClipboardList, Plus, Link, Repeat, MessageCircle, Route, Target, ListChecks, Link2, BarChart2 } from 'lucide-react-native';
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, Alert, TextInput, KeyboardAvoidingView, Platform, AppState, StyleSheet } from 'react-native';

import PlanCountdown from '../../components/PlanCountdown';
import { Card, useTheme, useT } from '../../components/UI';
import { useRootNavigation } from '../../navigation/hooks';
import { useAppStore, useShallowStore } from '../../store/useAppStore';

import { Heatmap } from './components/Heatmap';
import { ItemHeatmap } from './components/ItemHeatmap';
import { LinkBadge } from './components/LinkBadge';
import { ProgressRing } from './components/ProgressRing';
import { StatusLabel } from './components/StatusBadge';
import { useDailyTodo } from './useDailyTodo';



const EMPTY_CHECKINS: PlanItemCheckin[] = [];


export default function PlanDetailContent({ planId, onClose, addReflectionId }: { planId: string; onClose: () => void; addReflectionId?: string }) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const { performDailyReset, plans, planItems, planItemCheckins, reflections, thoughtTrails, visions, canArchivePlan, unlinkAllReflectionsFromPlan, deletePlan, completePlan, resumePlan, pausePlan, cancelPlan } = useShallowStore(s => ({
    performDailyReset: s.performDailyReset,
    plans: s.plans,
    planItems: s.planItems,
    planItemCheckins: s.planItemCheckins,
    reflections: s.reflections,
    thoughtTrails: s.thoughtTrails,
    visions: s.visions,
    canArchivePlan: s.canArchivePlan,
    unlinkAllReflectionsFromPlan: s.unlinkAllReflectionsFromPlan,
    deletePlan: s.deletePlan,
    completePlan: s.completePlan,
    resumePlan: s.resumePlan,
    pausePlan: s.pausePlan,
    cancelPlan: s.cancelPlan,
  }));
  const nav = useRootNavigation();

  // 日期状态，支持跨天自动刷新
  const detector = useRef(createDateChangeDetector((prev) => {
    performDailyReset(prev);
  })).current;
  const [today, setToday] = useState(() => detector.getCurrent());

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        detector.check();
        setToday(detector.getCurrent());
      }
    });
    const interval = setInterval(() => { detector.check(); setToday(detector.getCurrent()); }, 60000);
    detector.check();
    setToday(detector.getCurrent());
    return () => { subscription.remove(); clearInterval(interval); };
  }, []);

  const plan = useMemo(() => (plans ?? []).find(p => !p.deleted && p.id === planId), [plans, planId]);
  const items = useMemo(() => getPlanItems(planItems ?? [], planId), [planItems, planId]);
  const checkins = useMemo(() => (planItemCheckins ?? EMPTY_CHECKINS).filter(c => !c.deleted), [planItemCheckins]);

  // Pre-compute progress for all items using live checkin data
  const itemProgressMap = useMemo(() => {
    const map = new Map<string, { doneCount: number; expectedDays: number; progress: number }>();
    for (const item of items) {
      const { doneCount, expectedDays } = countItemDoneDays(item, checkins, today);
      const progress = computeItemProgress(item, checkins, today);
      map.set(item.id, { doneCount, expectedDays, progress });
    }
    return map;
  }, [items, checkins, today]);

  // Plan-level progress: time-based (elapsed / total days)
  const planProgress = useMemo(() => {
    if (!plan) return 0;
    return computePlanProgress(plan);
  }, [plan]);

  const [tab, setTab] = useState<'detail' | 'todo'>('detail');

  const {
    todayItems, dailyCustomTodos, statusMap, stats,
    historyGroups, historySummary,
    showHistory, setShowHistory,
    newTodoName, setNewTodoName,
    newTodoRecurring, setNewTodoRecurring,
    toggleItem, addCustomTodo, deleteCustomTodo, toggleCustomTodo,
    mergeHistoryItems,
  } = useDailyTodo(plan, today);

  // 关联内容折叠状态，默认折叠
  const [showRelated, setShowRelated] = useState(false);

  // 完成计划确认弹窗状态


  // 热力图折叠状态，默认折叠
  const [showHeatmap, setShowHeatmap] = useState(false);

  // 任务级热力图展开状态
  const [expandedHeatmaps, setExpandedHeatmaps] = useState<Set<string>>(new Set());

  const toggleHeatmap = (itemId: string) => {
    setExpandedHeatmaps(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  // 历史记录手风琴状态，默认展开最近一天
  const [expandedDates, setExpandedDates] = useState<Set<string>>(() => {
    return new Set(historyGroups.length > 0 ? [historyGroups[0].date] : []);
  });

  const toggleDateExpand = (date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  // Memoize related reflections and trails to avoid re-filtering on every render
  const planItemIds = useMemo(() => new Set(items.map(i => i.id)), [items]);

  const relatedReflections = useMemo(() => {
    if (!plan) return { items: [], total: 0 };
    const all = (reflections ?? []).filter(r =>
      !r.deleted && r.linkedPlanItemId && planItemIds.has(r.linkedPlanItemId)
    );
    return { items: all.slice(0, 3), total: all.length };
  }, [reflections, plan, planItemIds]);

  // Find related trails: direct trailId first, then reflection-based fallback
  const relatedTrails = useMemo(() => {
    if (!plan) return [];
    const trailIds = new Set<string>();
    // Direct: items with trailId
    for (const item of items) {
      if (item.trailId) trailIds.add(item.trailId);
    }
    // Indirect: via reflection chain
    const reflectionIdToPlanItemId = new Map<string, string>();
    for (const r of (reflections ?? [])) {
      if (!r.deleted && r.linkedPlanItemId) {
        reflectionIdToPlanItemId.set(r.id, r.linkedPlanItemId);
      }
    }
    for (const t of (thoughtTrails ?? [])) {
      if (t.deleted || trailIds.has(t.id)) continue;
      if ((t.reflectionIds ?? []).some(rid => {
        const linkedItemId = reflectionIdToPlanItemId.get(rid);
        return linkedItemId != null && planItemIds.has(linkedItemId);
      })) {
        trailIds.add(t.id);
      }
    }
    return (thoughtTrails ?? []).filter(t => !t.deleted && trailIds.has(t.id)).slice(0, 2);
  }, [items, reflections, thoughtTrails, plan, planItemIds]);

  // getItemEffectiveStatus must be defined before sortedItems/renderItemRow hooks
  const getItemEffectiveStatus = (item: PlanItem): PlanItemStatus => {
    if (item.status === 'completed') return 'completed';
    if ((itemProgressMap.get(item.id)?.progress ?? 0) >= 100) return 'completed';
    if (item.status === 'in_progress' && item.endDate < today) return 'delayed';
    return item.status;
  };

  const sortedItems = useMemo(() => {
    const order: Record<string, number> = { delayed: 0, in_progress: 1, not_started: 2, completed: 3 };
    return [...items].sort((a, b) => {
      const oa = order[getItemEffectiveStatus(a)] ?? 9;
      const ob = order[getItemEffectiveStatus(b)] ?? 9;
      if (oa !== ob) return oa - ob;
      if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
      return a.endDate.localeCompare(b.endDate);
    });
  }, [items, today, itemProgressMap]);

  const renderItemRow = useCallback(({ item, index }: { item: PlanItem; index: number }) => {
    const prog = itemProgressMap.get(item.id) ?? { doneCount: 0, expectedDays: 0, progress: 0 };
    const p = PRIORITY_OPTIONS.find(o => o.value === (item.priority ?? 'medium'));
    const effectiveStatus = getItemEffectiveStatus(item);
    return (
      <View style={[styles.itemRow, { backgroundColor: `${TH.card}80`, borderColor: TH.border, marginBottom: index < sortedItems.length - 1 ? 8 : 0 }]}>
        <View style={styles.itemHeaderRow}>
          {p ? <View style={[styles.priorityDot, { backgroundColor: p.color }]} /> : null}
          <Text style={[styles.textBodySemiBold, { color: TH.text }]} numberOfLines={1}>{item.name}</Text>
          <LinkBadge link={item.link} T={T} P={P} />
          <StatusLabel status={effectiveStatus} T={T} />
        </View>
        <Text style={[styles.textBadgeDim, { color: TH.sub }]}>
          {item.startDate} ~ {item.endDate}
        </Text>
        {item.targetMetric ? <Text style={[styles.textSubDim, { color: TH.sub }]} numberOfLines={1}>🎯 {item.targetMetric}</Text> : null}
        {item.description ? <Text style={[styles.textSubDimMb6, { color: TH.sub }]} numberOfLines={2}>{item.description}</Text> : null}
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.tags.map((tag, ti) => (
              <View key={ti} style={[styles.tag, { borderColor: `${P}30` }]}>
                <Text style={[styles.textBadgePrimary, { color: P }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={styles.progressRow}>
          <View style={[styles.progressTrack, { backgroundColor: TH.border }]}>
            <View style={[styles.progressFillItem, { width: `${prog.progress}%`, backgroundColor: P }]} />
          </View>
          <Text style={[styles.textBadgeDim, { color: TH.sub }]}>{prog.doneCount}/{prog.expectedDays}</Text>
          <Text style={[styles.textBadgeDim, { color: TH.sub }]}>{prog.progress}%</Text>
        </View>
        {/* Frequency summary */}
        <Text style={[styles.textFrequency, { color: P }]}>
          {getFrequencySummary(item.frequency ?? { mode: 'daily' }, T, checkins, today, item.id)}
        </Text>
        {/* Heatmap toggle */}
        <TouchableOpacity
          onPress={() => toggleHeatmap(item.id)}
          style={styles.heatmapToggleRow}
          accessibilityLabel={expandedHeatmaps.has(item.id) ? T('planHideHeatmap') : T('planShowHeatmap')}
        >
          <BarChart2 size={14} color={P} />
          <Text style={[styles.textBadgePrimary, { color: P }]}>
            {expandedHeatmaps.has(item.id) ? T('planHideHeatmap') : T('planShowHeatmap')}
          </Text>
          {expandedHeatmaps.has(item.id)
            ? <ChevronDown size={14} color={TH.sub} />
            : <ChevronRight size={14} color={TH.sub} />}
        </TouchableOpacity>
        {/* Item Heatmap */}
        {expandedHeatmaps.has(item.id) && (
          <View style={styles.itemHeatmapContainer}>
            <ItemHeatmap item={item} checkins={checkins} TH={TH} T={T} />
          </View>
        )}
      </View>
    );
  }, [sortedItems, itemProgressMap, expandedHeatmaps, TH, P, T, checkins, today, getItemEffectiveStatus]);

  // ── Early return (AFTER all hooks are declared) ──
  if (!plan) {
    return (
      <Card style={styles.emptyCard}>
        <Text style={{ color: TH.sub }}>{T('planNotFound')}</Text>
      </Card>
    );
  }

  // Derived values that require `plan` to be non-null
  const totalDays = Math.round((new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / MS_PER_DAY) + 1;
  const elapsed = Math.max(0, Math.round((new Date(today > plan.endDate ? plan.endDate : today).getTime() - new Date(plan.startDate).getTime()) / MS_PER_DAY) + 1);
  const deletable = canDeletePlan(plan.status);
  const editable = canEditPlan(plan.status);
  const completable = plan.status === 'in_progress' || plan.status === 'paused';
  const resumable = plan.status === 'paused';
  const pausable = plan.status === 'in_progress';
  const cancellable = plan.status === 'paused';

  const checkCanArchive = (onConfirm: () => void) => {
    const result = canArchivePlan(plan.id);
    if (!result.allowed) {
      Alert.alert(
        T('planCannotOperate'),
        T('planCannotOperateDetail').replace('{count}', String(result.linkedReflectionCount)),
        [
          { text: T('commonCancel'), style: 'cancel' },
          { text: T('planUnlinkAndContinue'), style: 'destructive', onPress: () => {
            unlinkAllReflectionsFromPlan(plan.id);
            onConfirm();
          }},
        ]
      );
      return;
    }
    onConfirm();
  };

  const handleDelete = () => {
    checkCanArchive(() => {
      Alert.alert(T('planDelete'), T('planDeleteConfirm'), [
        { text: T('commonCancel'), style: 'cancel' },
        { text: T('commonConfirm'), style: 'destructive', onPress: async () => { await deletePlan(plan.id); onClose(); } },
      ]);
    });
  };

  const handleComplete = () => {
    const incomplete = items.filter(item => {
      const prog = itemProgressMap.get(item.id);
      return !prog || prog.progress < 100;
    });

    if (incomplete.length === 0) {
      completePlan(plan.id);
      return;
    }

    Alert.alert(
      T('planCompleteWithIncomplete'),
      T('planCompleteWithIncompleteDetail').replace('{count}', String(incomplete.length)),
      [
        { text: T('commonCancel'), style: 'cancel' },
        { text: T('planCompleteConfirmBtn'), onPress: () => completePlan(plan.id) },
      ],
    );
  };

  const handleResume = () => {
    resumePlan(plan.id);
  };

  const handlePause = () => {
    pausePlan(plan.id);
  };

  const handleCancel = () => {
    checkCanArchive(() => {
      Alert.alert(T('planCancelPlan'), T('planConfirmCancel'), [
        { text: T('commonCancel'), style: 'cancel' },
        { text: T('commonConfirm'), style: 'destructive', onPress: () => cancelPlan(plan.id) },
      ]);
    });
  };

  return (
    <>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex1}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
      {/* Tab switcher */}
      <View style={styles.tabContainer}>
        {(['detail', 'todo'] as const).map(t => {
            const active = tab === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={[styles.tabButton, { backgroundColor: active ? P : TH.card }]}
                accessibilityLabel={t === 'detail' ? T('planDetail') : T('planTodoList')}
              >
                <Text style={[styles.textTabLabel, { fontWeight: active ? '700' : '500', color: active ? '#fff' : TH.sub }]}>
                  {t === 'detail' ? T('planDetail') : T('planTodoList')}
                </Text>
              </TouchableOpacity>
            );
        })}
      </View>

      {tab === 'detail' ? (
        <>
          {/* Plan hero card */}
          <Card>
            {/* Plan name with icon */}
            <View style={styles.sectionHeaderRow}>
              <ClipboardList size={18} color={P} />
              <Text style={[styles.textBodyBold, { color: TH.text }]} numberOfLines={1}>{plan.name}</Text>
              <StatusLabel status={plan.status} T={T} />
            </View>


            {/* Progress ring + stats */}
            <View style={styles.statsRow}>
              <ProgressRing progress={planProgress} color={P} />
              <View style={styles.statsCol}>
                <View style={styles.statRow}>
                  <Text style={[styles.textSubDim, { color: TH.sub }]}>{T('planStartDate')}</Text>
                  <Text style={[styles.textSubDim, { color: TH.text }]}>{plan.startDate}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={[styles.textSubDim, { color: TH.sub }]}>{T('planEndDate')}</Text>
                  <Text style={[styles.textSubDim, { color: TH.text }]}>{plan.endDate}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={[styles.textSubDim, { color: TH.sub }]}>{T('planProgress')}</Text>
                  <Text style={[styles.textSubBold, { color: TH.text }]}>{elapsed}/{totalDays} {T('planDays')}</Text>
                </View>
              </View>
            </View>

            {/* Linear progress bar */}
            <View style={[styles.planProgressTrack, { backgroundColor: TH.border }]}>
              <View style={[styles.planProgressFill, { width: `${planProgress}%`, backgroundColor: P }]} />
            </View>

            {/* Countdown */}
            <PlanCountdown plan={plan} />
          </Card>

          {/* Goal + Vision (merged) */}
          <Card>
            <View style={styles.sectionHeaderRow}>
              <Target size={18} color={P} />
              <Text style={[styles.textBodyBold, { color: TH.text }]}>{T('planGoal')}</Text>
            </View>
            <Text style={[styles.textGoal, { color: TH.text }]}>{plan.goal}</Text>

            {plan.visionId && (() => {
              const linkedVision = (visions ?? []).find((v: Vision) => v.id === plan.visionId && !v.deleted);
              if (!linkedVision) return null;
              return (
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: TH.border }}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={{ fontSize: 16 }}>🎯</Text>
                    <Text style={[styles.textBodyBold, { color: TH.text }]}>{T('planLinkedVision')}</Text>
                  </View>
                  <Text style={[styles.textGoal, { color: '#8B5CF6', marginTop: 4 }]}>{linkedVision.text}</Text>
                </View>
              );
            })()}

            {plan.slogan ? (
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: TH.border }}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={{ fontSize: 16 }}>✨</Text>
                  <Text style={[styles.textBodyBold, { color: TH.text }]}>{T('planSlogan')}</Text>
                </View>
                <Text style={[styles.textGoal, { color: TH.text, marginTop: 4 }]}>{plan.slogan}</Text>
              </View>
            ) : null}
          </Card>

          {/* Items */}
          <Card>
            <View style={styles.itemsHeaderRow}>
              <View style={styles.sectionHeaderRow}>
                <ListChecks size={18} color={P} />
                <Text style={[styles.textBodyBold, { color: TH.text }]}>{T('planItems')}</Text>
              </View>
              <Text style={[styles.textSubDim, { color: TH.sub }]}>{items.length}</Text>
            </View>
            {items.length === 0 ? (
              <Text style={[styles.textNoItems, { color: TH.sub }]}>{T('planNoItems')}</Text>
            ) : (
              sortedItems.map((item, index) => (
                <React.Fragment key={item.id}>
                  {renderItemRow({ item, index })}
                </React.Fragment>
              ))
            )}
          </Card>

          {/* Related Reflections, Trails & Vision */}
          {tab === 'detail' && (relatedReflections.total > 0 || relatedTrails.length > 0 || plan?.visionId) && (
            <Card>
              {/* Collapsible header with stats */}
              <TouchableOpacity
                onPress={() => setShowRelated(v => !v)}
                activeOpacity={0.7}
                style={styles.relatedToggleRow}
                accessibilityLabel={showRelated ? '收起关联内容' : '展开关联内容'}
              >
                <View style={styles.flex1}>
                  <View style={styles.sectionHeaderRowMb8}>
                    <Link2 size={18} color={P} />
                    <Text style={[styles.textBodyBold, { color: TH.text }]}>{T('planLinkedContent')}</Text>
                  </View>
                  <View style={styles.relatedCountsRow}>
                    {relatedReflections.total > 0 && (
                      <View style={styles.inlineRowGap4}>
                        <MessageCircle size={14} color={P} />
                        <Text style={[styles.textSubDim, { color: TH.sub }]}>
                          {String(relatedReflections.total)} {T('planRelatedReflections')}
                        </Text>
                      </View>
                    )}
                    {relatedTrails.length > 0 && (
                      <View style={styles.inlineRowGap4}>
                        <Route size={14} color={P} />
                        <Text style={[styles.textSubDim, { color: TH.sub }]}>
                          {relatedTrails.length} {T('planRelatedTrails')}
                        </Text>
                      </View>
                    )}
                    {plan?.visionId && (() => {
                      const v = (visions ?? []).find((x: Vision) => x.id === plan.visionId && !x.deleted);
                      if (!v) return null;
                      return (
                        <View style={styles.inlineRowGap4}>
                          <Text style={{ fontSize: 14 }}>🎯</Text>
                          <Text style={[styles.textSubDim, { color: TH.sub }]}>
                            {T('planLinkVision')}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>
                </View>
                {showRelated
                  ? <ChevronDown size={18} color={TH.sub} />
                  : <ChevronRight size={18} color={TH.sub} />}
              </TouchableOpacity>

              {/* Expanded content */}
              {showRelated && (
                <View style={styles.expandedContent}>
                  {/* Related Reflections */}
                  {relatedReflections.items.map(r => (
                    <TouchableOpacity
                      key={r.id}
                      onPress={() => nav.navigate('ReflectionDetail', { reflectionId: r.id })}
                      style={[styles.relatedItemCard, { backgroundColor: `${TH.card}80`, borderColor: TH.border }]}
                      accessibilityLabel={`查看关联感悟: ${r.content?.substring(0, 20) ?? ''}`}
                    >
                      <Text style={[styles.textBodyDim, { color: TH.text }]} numberOfLines={2}>{r.content}</Text>
                      <Text style={[styles.textSubDimMt4, { color: TH.sub }]}>
                        {new Date(r.timestamp).toLocaleDateString()}
                      </Text>
                    </TouchableOpacity>
                  ))}

                  {/* Related Trails */}
                  {relatedTrails.map(trail => (
                    <TouchableOpacity
                      key={trail.id}
                      onPress={() => nav.navigate('ThoughtTrailDetail', { trailId: trail.id })}
                      style={[styles.relatedItemCard, { backgroundColor: `${TH.card}80`, borderColor: TH.border }]}
                      accessibilityLabel={`查看关联脉络: ${trail.name}`}
                    >
                      <Text style={[styles.textBodySemiBold, { color: TH.text }]}>{trail.name}</Text>
                      <Text style={[styles.textSubDimMt4, { color: TH.sub }]}>
                        {(trail.reflectionIds ?? []).length} {T('planTrailReflectionCount')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {/* Linked Vision */}
                  {plan?.visionId && (() => {
                    const v = (visions ?? []).find((x: Vision) => x.id === plan.visionId && !x.deleted);
                    if (!v) return null;
                    return (
                      <TouchableOpacity
                        key={plan.visionId}
                        onPress={() => nav.navigate('Vow')}
                        style={[styles.relatedItemCard, { backgroundColor: `${TH.card}80`, borderColor: TH.border, flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                      >
                        <Text style={{ fontSize: 18 }}>🎯</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.textBodySemiBold, { color: TH.text }]}>{T('planLinkedVision')}</Text>
                          <Text style={[styles.textDim, { color: TH.sub, marginTop: 2 }]} numberOfLines={2}>{v.text}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })()}

                  {/* Show "more" hint if reflections were truncated */}
                  {relatedReflections.total > 3 && (
                    <TouchableOpacity onPress={() => nav.navigate('MindTrail')} accessibilityLabel={`查看更多关联感悟 (+${relatedReflections.total - 3})`}>
                      <Text style={[styles.textMoreLink, { color: TH.sub }]}>
                        +{String(relatedReflections.total - 3)}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </Card>
          )}

          {/* Relation Map Entry */}
          <TouchableOpacity
            onPress={() => nav.navigate('RelationMap', { context: { type: 'plan', id: planId } })}
            style={[styles.relationMapButton, { backgroundColor: TH.card, borderColor: TH.border }]}
            accessibilityLabel={T('planRelationMap')}
          >
            <Link size={18} color={P} />
            <View style={styles.flex1}>
              <Text style={[styles.textBodyBold, { color: TH.text }]}>{T('planRelationMap')}</Text>
              <Text style={[styles.textSubDim, { color: TH.sub }]}>{T('planRelationMapDesc')}</Text>
            </View>
            <ChevronRight size={18} color={TH.sub} />
          </TouchableOpacity>

          {/* Heatmap */}
          <Card>
            <TouchableOpacity
              onPress={() => setShowHeatmap(v => !v)}
              style={styles.heatmapHeaderRow}
              accessibilityLabel={showHeatmap ? '收起热力图' : '展开热力图'}
            >
              <View style={styles.sectionHeaderRow}>
                <BarChart2 size={18} color={P} />
                <Text style={[styles.textBodyBold, { color: TH.text }]}>{T('planHeatmap')}</Text>
              </View>
              {showHeatmap
                ? <ChevronDown size={18} color={TH.sub} />
                : <ChevronRight size={18} color={TH.sub} />}
            </TouchableOpacity>
            {showHeatmap && (
              <View style={styles.heatmapContent}>
                <Heatmap checkins={checkins} items={items} plan={plan} TH={TH} T={T} />
              </View>
            )}
          </Card>
        </>
      ) : (
        /* TodoList tab */
        <>
          {/* Today's tasks — only for active plans */}
          {(plan.status === 'in_progress' || plan.status === 'paused') && (
            <>
              <Card style={styles.todayStatsCard}>
                <Text style={[styles.textBodyDimMb8, { color: TH.sub }]}>{T('planTodoToday')}</Text>
                <View style={styles.todayStatsRow}>
                  <Text style={[styles.textStatValue, { color: P }]}>{stats.totalDone}</Text>
                  <Text style={[styles.textBodyDim, { color: TH.sub }]}>/ {stats.totalItems}</Text>
                </View>
                <Text style={[styles.textSubDimMt4, { color: TH.sub }]}>{today}</Text>
              </Card>

              <Card>
                {/* Plan items */}
                {todayItems.length === 0 && dailyCustomTodos.length === 0 ? (
                  <Text style={[styles.textEmptyCentered, { color: TH.sub }]}>{T('planNoItems')}</Text>
                ) : (
                  <>
                    {/* Plan items group header */}
                    {todayItems.length > 0 && (
                      <View style={styles.groupHeaderRow}>
                        <ClipboardList size={14} color={P} />
                        <Text style={[styles.textSubSemiBold, { color: TH.text }]}>{T('planTodoList')} ({todayItems.length})</Text>
                      </View>
                    )}
                    {todayItems.map((item, i, arr) => {
                      const status = statusMap.get(item.id);
                      const done = status?.done ?? false;
                      const autoChecked = status?.autoChecked ?? false;
                      return (
                        <View
                          key={item.id}
                          style={[styles.todoItemRow, { borderBottomColor: TH.border, borderBottomWidth: i < arr.length - 1 || dailyCustomTodos.length > 0 ? 1 : 0, opacity: autoChecked ? 0.7 : 1 }]}
                        >
                          <TouchableOpacity onPress={() => toggleItem(item.id)} style={styles.checkboxTouchTarget} accessibilityLabel={done ? `${item.name} 取消完成` : `${item.name} 完成`}>
                            <View style={[styles.checkbox, { borderColor: done ? P : TH.border, backgroundColor: done ? P : 'transparent' }]}>
                              {done && <Check size={14} color="#fff" />}
                            </View>
                          </TouchableOpacity>
                          {autoChecked && (
                            <View style={styles.autoCheckedBadge}>
                              <Text style={styles.autoCheckedBadgeText}>{T('planAutoChecked')}</Text>
                            </View>
                          )}
                          {item.status === 'delayed' && !done && (
                            <View style={styles.delayedBadge}>
                              <Text style={styles.delayedBadgeText}>{T('planStatusDelayed')}</Text>
                            </View>
                          )}
                          <View style={styles.todoContentCol}>
                            <Text style={[styles.textBodyMedium, { color: TH.text }]}>{item.name}</Text>
                            <Text style={[styles.textFrequencyTiny, { color: P }]}>
                              {getFrequencySummary(item.frequency ?? { mode: 'daily' }, T, checkins, today, item.id)}
                            </Text>
                            {item.description ? (
                              <Text style={[styles.textBadgeDimMt2, { color: TH.sub }]} numberOfLines={1}>{item.description}</Text>
                            ) : null}
                          </View>
                          <LinkBadge link={item.link} T={T} P={P} />
                        </View>
                      );
                    })}

                    {/* Custom todos group header */}
                    {dailyCustomTodos.length > 0 && (
                      <View style={[styles.customTodoHeaderRow, { borderTopColor: TH.border, borderTopWidth: todayItems.length > 0 ? 1 : 0 }]}>
                        <Pencil size={14} color={P} />
                        <Text style={[styles.textSubSemiBold, { color: TH.text }]}>{T('planDailyCustomTodos')} ({dailyCustomTodos.length})</Text>
                      </View>
                    )}
                    {/* Custom todos */}
                    {dailyCustomTodos.map((todo, i, arr) => (
                      <View
                        key={todo.id}
                        style={[styles.customTodoRow, { borderBottomColor: TH.border, borderBottomWidth: i < arr.length - 1 ? 1 : 0 }]}
                      >
                        <TouchableOpacity onPress={() => toggleCustomTodo(todo.id)} style={styles.checkboxTouchTarget} accessibilityLabel={todo.done ? `${todo.name} 取消完成` : `${todo.name} 完成`}>
                          <View style={[styles.checkbox, { borderColor: todo.done ? P : TH.border, backgroundColor: todo.done ? P : 'transparent' }]}>
                            {todo.done && <Check size={14} color="#fff" />}
                          </View>
                        </TouchableOpacity>
                        <View style={styles.customTodoContentCol}>
                          <Text style={[styles.textBodyMedium, { color: TH.text }]}>{todo.name}</Text>
                          {todo.recurring && <Repeat size={12} color={P} />}
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            Alert.alert(T('planDeleteCustomTodo'), T('planDeleteCustomTodoConfirm'), [
                              { text: T('commonCancel'), style: 'cancel' },
                              { text: T('commonConfirm'), style: 'destructive', onPress: () => deleteCustomTodo(todo.id) },
                            ]);
                          }}
                          style={styles.deleteTodoTouchTarget}
                          accessibilityLabel={`${T('planDeleteCustomTodo')} ${todo.name}`}
                        >
                          <Trash2 size={16} color={COLORS.RED} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </>
                )}

                {/* Add custom todo */}
                  <View style={[styles.addTodoContainer, { borderTopColor: TH.border, borderTopWidth: todayItems.length > 0 || dailyCustomTodos.length > 0 ? 1 : 0 }]}>
                    <TextInput
                      style={[styles.addTodoInput, { borderColor: TH.border, color: TH.text, backgroundColor: TH.bg }]}
                      placeholder={T('planAddCustomTodoPlaceholder')}
                      placeholderTextColor={TH.sub}
                      value={newTodoName}
                      onChangeText={setNewTodoName}
                      onSubmitEditing={addCustomTodo}
                      returnKeyType="done"
                    />
                    <TouchableOpacity
                      onPress={() => setNewTodoRecurring(!newTodoRecurring)}
                      style={[styles.recurringButton, { borderColor: newTodoRecurring ? P : TH.border, backgroundColor: newTodoRecurring ? `${P}15` : 'transparent' }]}
                      accessibilityLabel={newTodoRecurring ? '取消重复' : '设为重复'}
                    >
                      <Repeat size={16} color={newTodoRecurring ? P : TH.sub} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={addCustomTodo}
                      style={[styles.addButton, { backgroundColor: P }]}
                      accessibilityLabel={T('planAddCustomTodoPlaceholder')}
                    >
                      <Plus size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
              </Card>
            </>
            )}
          {plan.status !== 'in_progress' && plan.status !== 'paused' && (
            <Card style={styles.inactiveCard}>
              <Text style={[styles.textBodyDim, { color: TH.sub }]}>{T(statusToI18nKey(plan.status))}</Text>
            </Card>
          )}

          {/* History section */}
          <View style={styles.historySection}>
            <TouchableOpacity onPress={() => setShowHistory(v => !v)}
              style={[styles.historyHeader, { marginBottom: showHistory ? 12 : 0 }]}
              accessibilityLabel={showHistory ? '收起历史记录' : '展开历史记录'}
            >
              <View style={styles.historyTitleRow}>
                <Text style={[styles.textHistoryTitle, { color: TH.text }]}>{T('planTodoHistory')}</Text>
                {showHistory ? <ChevronDown size={18} color={TH.text} /> : <ChevronRight size={18} color={TH.text} />}
              </View>
              <Text style={[styles.textSubDim, { color: TH.sub }]}>{historyGroups.length} {T('planDays')}</Text>
            </TouchableOpacity>

            {showHistory && (
              <>
                {historyGroups.length > 0 && (
                  <View style={[styles.historySummaryCard, { backgroundColor: TH.card, borderColor: TH.border }]}>
                    {[
                      { value: String(historySummary.totalDays), label: T('planDays') },
                      { value: String(historySummary.totalDoneItems), label: T('planTodoDone') },
                    ].map(s => (
                      <View key={s.label} style={styles.historyStatItem}>
                        <Text style={[styles.textHistoryStatValue, { color: P }]}>{s.value}</Text>
                        <Text style={[styles.textHistoryStatLabel, { color: TH.sub }]}>{s.label}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {historyGroups.length === 0 ? (
                  <Text style={[styles.textNoHistory, { color: TH.sub }]}>{T('noHistory')}</Text>
                ) : (
                  <View style={styles.timelineContainer}>
                    <View style={[styles.timelineLine, { backgroundColor: TH.border }]} />
                    {historyGroups.map((group) => {
                      const allItems = mergeHistoryItems(group);
                      const doneCount = allItems.filter(i => i.done).length;
                      const isExpanded = expandedDates.has(group.date);
                      return (
                        <View key={group.date} style={styles.timelineItem}>
                          <View style={[styles.timelineDot, { backgroundColor: P, borderColor: TH.bg }]} />
                          <View style={[styles.historyItemCard, { backgroundColor: TH.card, borderColor: TH.border }]}>
                            <TouchableOpacity
                              onPress={() => toggleDateExpand(group.date)}
                              style={[styles.historyItemHeader, { borderBottomColor: TH.border, borderBottomWidth: isExpanded ? 1 : 0 }]}
                              accessibilityLabel={isExpanded ? `收起 ${group.date}` : `展开 ${group.date}`}
                            >
                              <View style={styles.historyItemTitleRow}>
                                {isExpanded ? <ChevronDown size={16} color={TH.text} /> : <ChevronRight size={16} color={TH.text} />}
                                <Text style={[styles.textBodyDate, { color: TH.text }]}>{group.date}</Text>
                              </View>
                              <Text style={[styles.textBodyDoneCount, { color: P }]}>{doneCount} {T('planTodoDone')}</Text>
                            </TouchableOpacity>
                            {isExpanded && allItems.map((item, i) => (
                              <View key={i} style={[styles.historyItemRow, { borderTopColor: TH.border, borderTopWidth: i > 0 ? 1 : 0, opacity: item.done ? 1 : 0.5 }]}>
                                <View style={[styles.historyCheckbox, { backgroundColor: item.done ? P : `${TH.border}80` }]}>
                                  {item.done && <Check size={10} color="#fff" />}
                                </View>
                                <Text style={[styles.historyItemName, { color: TH.text, textDecorationLine: item.done ? 'line-through' : 'none' }]}>{item.name}</Text>
                                {item.type === 'plan' && <LinkBadge link={item.link} T={T} P={P} />}
                                {item.type === 'custom' && (
                                  <View style={styles.customTodoBadge}>
                                    <Text style={styles.customTodoBadgeText}>{T('planDailyCustomTodos')}</Text>
                                  </View>
                                )}
                              </View>
                            ))}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </View>
        </>
      )}

      {/* Action buttons — only on detail tab */}
      {tab === 'detail' && (editable || pausable || resumable || cancellable || completable || deletable) && (
        <View style={styles.actionsContainer}>
          {editable && (
            <TouchableOpacity onPress={() => nav.navigate('PlanCreate', { planId: plan.id })}
              style={[styles.actionButtonOutline, { backgroundColor: TH.card, borderColor: TH.border }]}
              accessibilityLabel={T('commonEdit')}
            >
              <Pencil size={16} color={TH.text} />
              <Text style={[styles.textActionLabel, { color: TH.text }]}>{T('commonEdit')}</Text>
            </TouchableOpacity>
          )}
          {pausable && (
            <TouchableOpacity onPress={handlePause}
              style={[styles.actionButtonFill, { backgroundColor: COLORS.YELLOW }]}
              accessibilityLabel={T('planPause')}
            >
              <Pause size={16} color="#fff" />
              <Text style={styles.textActionLabelWhite}>{T('planPause')}</Text>
            </TouchableOpacity>
          )}
          {resumable && (
            <TouchableOpacity onPress={handleResume}
              style={[styles.actionButtonFill, { backgroundColor: COLORS.GREEN }]}
              accessibilityLabel={T('planResume')}
            >
              <Play size={16} color="#fff" />
              <Text style={styles.textActionLabelWhite}>{T('planResume')}</Text>
            </TouchableOpacity>
          )}
          {cancellable && (
            <TouchableOpacity onPress={handleCancel}
              style={[styles.actionButtonDanger, { borderColor: `${COLORS.RED}30` }]}
              accessibilityLabel={T('planCancelPlan')}
            >
              <XCircle size={16} color={COLORS.RED} />
              <Text style={[styles.textActionLabel, { color: COLORS.RED }]}>{T('planCancelPlan')}</Text>
            </TouchableOpacity>
          )}
          {completable && (
            <TouchableOpacity onPress={handleComplete}
              style={[styles.actionButtonFill, { backgroundColor: P }]}
              accessibilityLabel={T('planComplete')}
            >
              <CircleCheck size={16} color="#fff" />
              <Text style={styles.textActionLabelWhite}>{T('planComplete')}</Text>
            </TouchableOpacity>
          )}
          {deletable && (
            <TouchableOpacity onPress={handleDelete}
              style={[styles.actionButtonDanger, { borderColor: `${COLORS.RED}30` }]}
              accessibilityLabel={T('planDelete')}
            >
              <Trash2 size={16} color={COLORS.RED} />
              <Text style={[styles.textActionLabel, { color: COLORS.RED }]}>{T('planDelete')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
    </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  // Layout
  flex1: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  emptyCard: { alignItems: 'center', padding: 32 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionHeaderRowMb8: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  inlineRowGap4: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemsHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  statsCol: { flex: 1, gap: 6 },
  expandedContent: { marginTop: 12, gap: 8 },
  relatedToggleRow: { flexDirection: 'row', alignItems: 'center' },
  relatedCountsRow: { flexDirection: 'row', gap: 16 },
  heatmapHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heatmapContent: { marginTop: 12 },

  // Tab
  tabContainer: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },

  // Item row
  itemRow: { padding: 12, borderRadius: 10, borderWidth: 1 },
  itemHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 6 },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: undefined, borderWidth: 1 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFillItem: { height: 4, borderRadius: 2 },
  heatmapToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  itemHeatmapContainer: { marginTop: 8 },
  textFrequency: { fontSize: FONT_BADGE(), marginTop: 4 },

  // Plan progress bar
  planProgressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  planProgressFill: { height: 6, borderRadius: 3 },

  // Slogan
  textSlogan: { fontSize: FONT_BODY(), fontStyle: 'italic', marginBottom: 12, lineHeight: 22 },

  // Goal
  textGoal: { fontSize: FONT_BODY(), lineHeight: 22 },

  // No items
  textNoItems: { fontSize: FONT_SUB(), textAlign: 'center', padding: 12 },

  // Related items
  relatedItemCard: { borderWidth: 1, borderRadius: 10, padding: 12 },
  textMoreLink: { fontSize: FONT_SUB(), textAlign: 'center', paddingVertical: 4 },

  // Relation map
  relationMapButton: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },

  // Today stats
  todayStatsCard: { alignItems: 'center', paddingVertical: 20 },
  todayStatsRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  textBodyDimMb8: { fontSize: FONT_BODY(), marginBottom: 8 },
  textStatValue: { fontSize: FONT_STAT_SECTION(), fontWeight: '800' },
  textEmptyCentered: { fontSize: FONT_EMPTY(), textAlign: 'center', padding: 24 },

  // Todo items
  groupHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12 },
  todoItemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12 },
  checkboxTouchTarget: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  autoCheckedBadge: { backgroundColor: `${COLORS.GREEN}20`, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  autoCheckedBadgeText: { fontSize: FONT_TINY(), color: COLORS.GREEN, fontWeight: '600' },
  delayedBadge: { backgroundColor: `${COLORS.ORANGE}20`, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  delayedBadgeText: { fontSize: FONT_TINY(), color: COLORS.ORANGE, fontWeight: '600' },
  todoContentCol: { flex: 1, minWidth: 0 },
  textFrequencyTiny: { fontSize: FONT_TINY(), marginTop: 1 },

  // Custom todos
  customTodoHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12 },
  customTodoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12 },
  customTodoContentCol: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  deleteTodoTouchTarget: { padding: 4 },

  // Add todo
  addTodoContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  addTodoInput: { flex: 1, height: 36, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, fontSize: FONT_SUB() },
  recurringButton: { padding: 8, borderRadius: 8, borderWidth: 1 },
  addButton: { padding: 8, borderRadius: 8 },

  // Inactive card
  inactiveCard: { alignItems: 'center', paddingVertical: 20 },

  // History
  historySection: { marginTop: 24 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  textHistoryTitle: { fontWeight: '700', fontSize: FONT_TITLE() },
  historySummaryCard: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, paddingVertical: 14, marginBottom: 16 },
  historyStatItem: { flex: 1, alignItems: 'center' },
  textHistoryStatValue: { fontSize: FONT_STAT_CARD(), fontWeight: '800' },
  textHistoryStatLabel: { fontSize: FONT_SUB(), marginTop: 2 },
  textNoHistory: { fontSize: FONT_EMPTY(), textAlign: 'center', padding: 24 },
  timelineContainer: { position: 'relative', paddingLeft: 20 },
  timelineLine: { position: 'absolute', left: 6, top: 6, bottom: 6, width: 2, borderRadius: 1 },
  timelineItem: { position: 'relative', marginBottom: 16 },
  timelineDot: { position: 'absolute', left: -17, top: 14, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  historyItemCard: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  historyItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: undefined },
  historyItemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  textBodyDate: { fontSize: FONT_BODY(), fontWeight: '600' },
  textBodyDoneCount: { fontSize: FONT_BODY(), fontWeight: '700' },
  historyItemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 14 },
  historyCheckbox: { width: 18, height: 18, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  historyItemName: { fontSize: FONT_BODY(), flex: 1 },
  customTodoBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  customTodoBadgeText: { fontSize: FONT_SMALL(), fontWeight: '500' },

  // Action buttons
  actionsContainer: { gap: 8, marginTop: 24 },
  actionButtonBase: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
  actionButtonOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  actionButtonFill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
  actionButtonDanger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: `${COLORS.RED}15`, borderWidth: 1 },

  // Shared text styles
  textBodySemiBold: { fontSize: FONT_BODY(), fontWeight: '600', flex: 1 },
  textBodyBold: { fontSize: FONT_BODY(), fontWeight: '700' },
  textBodyMedium: { fontSize: FONT_BODY(), fontWeight: '500' },
  textBodyDim: { fontSize: FONT_BODY() },
  textSubDim: { fontSize: FONT_SUB() },
  textSubDimMb6: { fontSize: FONT_SUB(), marginBottom: 6 },
  textSubDimMt4: { fontSize: FONT_SUB(), marginTop: 4 },
  textSubBold: { fontSize: FONT_SUB(), fontWeight: '600' },
  textSubSemiBold: { fontSize: FONT_SUB(), fontWeight: '600' },
  textBadgeDim: { fontSize: FONT_BADGE() },
  textBadgeDimMt2: { fontSize: FONT_BADGE(), marginTop: 2 },
  textBadgePrimary: { fontSize: FONT_BADGE() },
  textTabLabel: { fontSize: FONT_SUB() },
  textActionLabel: { fontSize: FONT_BODY(), fontWeight: '600' },
  textActionLabelWhite: { fontSize: FONT_BODY(), fontWeight: '600', color: '#fff' },
});
