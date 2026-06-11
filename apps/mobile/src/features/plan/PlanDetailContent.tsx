import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform, AppState } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { useRootNavigation } from '../../navigation/hooks';
import { COLORS, getPlanItems, PRIORITY_OPTIONS, isPlanDelayed, canDeletePlan, canEditPlan, statusToI18nKey, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_STAT_CARD, FONT_STAT_SECTION, FONT_EMPTY, FONT_TINY, createDateChangeDetector, computeItemProgress, computeExpectedDays } from '@egoless-do/core';
import type { Plan, PlanItem, PlanItemCheckin, CheckinFrequency } from '@egoless-do/core';
import { useDailyTodo } from './useDailyTodo';
import { Card, useTheme, useT } from '../../components/UI';
import PlanCountdown from '../../components/PlanCountdown';
import { StatusLabel } from './components/StatusBadge';
import { LinkBadge } from './components/LinkBadge';
import { ProgressRing } from './components/ProgressRing';
import { Heatmap } from './components/Heatmap';
import { ItemHeatmap } from './components/ItemHeatmap';
import { ChevronDown, ChevronRight, Check, Trash2, Pencil, CircleCheck, Play, Pause, XCircle, ClipboardList, Plus, Link, Repeat, MessageCircle, Route, Target, ListChecks, Link2, BarChart2 } from 'lucide-react-native';

const EMPTY_CHECKINS: PlanItemCheckin[] = [];

const WEEKDAY_LABELS = ['weekdaySun', 'weekdayMon', 'weekdayTue', 'weekdayWed', 'weekdayThu', 'weekdayFri', 'weekdaySat'];

/** Add N days to a YYYY-MM-DD string (pure string math, no timezone issues). */
function addDaysStr(date: string, n: number): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function getFrequencySummary(freq: CheckinFrequency, T: (k: string) => string, checkins: PlanItemCheckin[], today: string, itemId?: string): string {
  switch (freq.mode) {
    case 'daily':
      return T('freqSummaryDaily');
    case 'interval':
      return T('freqSummaryInterval').replace('{n}', String(freq.every));
    case 'weekly': {
      // Count done this week (Mon-Sun), using local-time date math
      const d = new Date(today + 'T00:00:00');
      const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      const diffToMon = day === 0 ? 6 : day - 1;
      const wsStr = addDaysStr(today, -diffToMon);
      const weStr = addDaysStr(wsStr, 6);
      const doneThisWeek = checkins.filter(c => c.done && (!itemId || c.planItemId === itemId) && c.date >= wsStr && c.date <= weStr).length;
      return `📅 ${T('freqSummaryWeekly').replace('{n}', String(freq.target))} | ${T('freqThisWeek')} ${doneThisWeek}/${freq.target}`;
    }
    case 'weekly_fixed': {
      const labels = freq.days.map(d => T(WEEKDAY_LABELS[d])).join(' ');
      return `📅 ${T('freqSummaryWeeklyFixed').replace('{days}', labels)}`;
    }
    case 'monthly':
      return `📅 ${T('freqSummaryMonthly').replace('{n}', String(freq.target))}`;
    case 'monthly_fixed':
      return `📅 ${T('freqSummaryMonthlyFixed').replace('{dates}', freq.dates.join(', '))}`;
    default:
      return '';
  }
}

export default function PlanDetailContent({ planId, onClose }: { planId: string; onClose: () => void }) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const store = useAppStore();
  const nav = useRootNavigation();

  // 日期状态，支持跨天自动刷新
  const detector = useRef(createDateChangeDetector((prev) => {
    store.performDailyReset(prev);
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

  const plan = useMemo(() => (store.plans ?? []).find(p => p.id === planId), [store.plans, planId]);
  const items = useMemo(() => getPlanItems(store.planItems ?? [], planId), [store.planItems, planId]);
  const checkins = store.planItemCheckins ?? EMPTY_CHECKINS;

  // Pre-compute progress for all items
  const itemProgressMap = useMemo(() => {
    const map = new Map<string, { doneCount: number; expectedDays: number; progress: number }>();
    for (const item of items) {
      const doneCount = item.totalCheckinDays;
      const totalExpectedDays = computeExpectedDays(item.frequency, item.startDate, item.endDate, item.endDate);
      const progress = totalExpectedDays > 0 ? Math.min(Math.round((doneCount / totalExpectedDays) * 100), 100) : 0;
      map.set(item.id, { doneCount, expectedDays: totalExpectedDays, progress });
    }
    return map;
  }, [items, today]);

  // 计划进度基于时间（已过天数/总天数），任务进度单独计算

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
    const all = (store.reflections ?? []).filter(r =>
      !r.deleted && r.linkedPlanItemId && planItemIds.has(r.linkedPlanItemId)
    );
    return { items: all.slice(0, 3), total: all.length };
  }, [store.reflections, plan, planItemIds]);

  // Pre-build reflectionId→planItemId index for O(1) trail lookup
  const relatedTrails = useMemo(() => {
    if (!plan) return [];
    const reflectionIdToPlanItemId = new Map<string, string>();
    for (const r of (store.reflections ?? [])) {
      if (!r.deleted && r.linkedPlanItemId) {
        reflectionIdToPlanItemId.set(r.id, r.linkedPlanItemId);
      }
    }
    return (store.thoughtTrails ?? []).filter(t =>
      !t.deleted && t.reflectionIds.some(rid => {
        const linkedItemId = reflectionIdToPlanItemId.get(rid);
        return linkedItemId != null && planItemIds.has(linkedItemId);
      })
    ).slice(0, 2);
  }, [store.reflections, store.thoughtTrails, plan, planItemIds]);

  if (!plan) {
    return (
      <Card style={{ alignItems: 'center', padding: 32 }}>
        <Text style={{ color: TH.sub }}>{T('planNotFound')}</Text>
      </Card>
    );
  }

  const totalDays = Math.round((new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / 86400000) + 1;
  const elapsed = Math.max(0, Math.round((new Date(today > plan.endDate ? plan.endDate : today).getTime() - new Date(plan.startDate).getTime()) / 86400000) + 1);
  const progress = totalDays > 0 ? Math.min(Math.round((elapsed / totalDays) * 100), 100) : 0;
  const planDelayed = isPlanDelayed(plan, today);
  const deletable = canDeletePlan(plan.status);
  const editable = canEditPlan(plan.status);
  const completable = plan.status === 'in_progress' || plan.status === 'paused';
  const resumable = plan.status === 'paused';
  const pausable = plan.status === 'in_progress';
  const cancellable = plan.status === 'paused';

  const getItemEffectiveStatus = (item: PlanItem): PlanItemStatus => {
    if (item.status === 'completed') return 'completed';
    if ((itemProgressMap.get(item.id)?.progress ?? 0) >= 100) return 'completed';
    if (item.status === 'in_progress' && item.endDate < today) return 'delayed';
    return item.status;
  };

  const checkCanArchive = (onConfirm: () => void) => {
    const result = store.canArchivePlan(plan.id);
    if (!result.allowed) {
      Alert.alert(
        T('planCannotOperate'),
        T('planCannotOperateDetail').replace('{count}', String(result.linkedReflectionCount)),
        [
          { text: T('commonCancel'), style: 'cancel' },
          { text: T('planUnlinkAndContinue'), style: 'destructive', onPress: () => {
            store.unlinkAllReflectionsFromPlan(plan.id);
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
        { text: T('commonConfirm'), style: 'destructive', onPress: () => { store.deletePlan(plan.id); onClose(); } },
      ]);
    });
  };

  const handleComplete = () => {
    Alert.alert(T('planComplete'), T('planCompleteConfirm'), [
      { text: T('commonCancel'), style: 'cancel' },
      { text: T('commonConfirm'), onPress: () => store.completePlan(plan.id) },
    ]);
  };

  const handleResume = () => {
    store.resumePlan(plan.id);
  };

  const handlePause = () => {
    store.pausePlan(plan.id);
  };

  const handleCancel = () => {
    checkCanArchive(() => {
      Alert.alert(T('planCancelPlan'), T('planConfirmCancel'), [
        { text: T('commonCancel'), style: 'cancel' },
        { text: T('commonConfirm'), style: 'destructive', onPress: () => store.cancelPlan(plan.id) },
      ]);
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
      {/* Tab switcher */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {(['detail', 'todo'] as const).map(t => {
            const active = tab === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                  backgroundColor: active ? P : TH.card,
                }}
              >
                <Text style={{ fontSize: FONT_SUB, fontWeight: active ? '700' : '500', color: active ? '#fff' : TH.sub }}>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <ClipboardList size={20} color={P} />
              <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text, flex: 1 }} numberOfLines={1}>{plan.name}</Text>
              <StatusLabel status={plan.status} T={T} />
            </View>

            {plan.slogan ? (
              <Text style={{ fontSize: FONT_BODY, color: TH.text, fontStyle: 'italic', marginBottom: 12, lineHeight: 22 }}>
                &ldquo;{plan.slogan}&rdquo;
              </Text>
            ) : null}

            {/* Progress ring + stats */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <ProgressRing progress={progress} color={P} />
              <View style={{ flex: 1, gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('planStartDate')}</Text>
                  <Text style={{ fontSize: FONT_SUB, color: TH.text }}>{plan.startDate}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('planEndDate')}</Text>
                  <Text style={{ fontSize: FONT_SUB, color: TH.text }}>{plan.endDate}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('planProgress')}</Text>
                  <Text style={{ fontSize: FONT_SUB, color: TH.text, fontWeight: '600' }}>{elapsed}/{totalDays} {T('planDays')}</Text>
                </View>
              </View>
            </View>

            {/* Linear progress bar */}
            <View style={{ height: 6, backgroundColor: TH.border, borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: 6, width: `${progress}%`, backgroundColor: P, borderRadius: 3 }} />
            </View>
            
            {/* Countdown */}
            <PlanCountdown plan={plan} />
          </Card>

          {/* Goal */}
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Target size={14} color={P} />
              <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.sub }}>{T('planGoal')}</Text>
            </View>
            <Text style={{ fontSize: FONT_BODY, color: TH.text, lineHeight: 22 }}>{plan.goal}</Text>
          </Card>

          {/* Items */}
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ListChecks size={16} color={P} />
                <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>{T('planItems')}</Text>
              </View>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{items.length}</Text>
            </View>
            {items.length === 0 ? (
              <Text style={{ fontSize: FONT_SUB, color: TH.sub, textAlign: 'center', padding: 12 }}>{T('planNoItems')}</Text>
            ) : (
              items.map((item, idx) => {
                const prog = itemProgressMap.get(item.id) ?? { doneCount: 0, progress: 0 };
                const p = PRIORITY_OPTIONS.find(o => o.value === (item.priority ?? 'medium'));
                const effectiveStatus = getItemEffectiveStatus(item);
                return (
                  <View key={item.id} style={{
                    padding: 12, marginBottom: idx < items.length - 1 ? 8 : 0, borderRadius: 10,
                    backgroundColor: `${TH.card}80`, borderWidth: 1, borderColor: TH.border,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      {p ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: p.color }} /> : null}
                      <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text, flex: 1 }} numberOfLines={1}>{item.name}</Text>
                      <LinkBadge link={item.link} T={T} P={P} />
                      <StatusLabel status={effectiveStatus} T={T} />
                    </View>
                    <Text style={{ fontSize: FONT_BADGE, color: TH.sub, marginBottom: 4 }}>
                      {item.startDate} ~ {item.endDate}
                    </Text>
                    {item.targetMetric ? <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 4 }} numberOfLines={1}>🎯 {item.targetMetric}</Text> : null}
                    {item.description ? <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 6 }} numberOfLines={2}>{item.description}</Text> : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ flex: 1, height: 4, backgroundColor: TH.border, borderRadius: 2, overflow: 'hidden' }}>
                        <View style={{ height: 4, width: `${prog.progress}%`, backgroundColor: P, borderRadius: 2 }} />
                      </View>
                      <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{prog.doneCount}/{prog.expectedDays}</Text>
                      <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{prog.progress}%</Text>
                    </View>
                    {/* Frequency summary */}
                    <Text style={{ fontSize: FONT_BADGE, color: P, marginTop: 4 }}>
                      {getFrequencySummary(item.frequency ?? { mode: 'daily' }, T, checkins, today, item.id)}
                    </Text>
                    {/* Heatmap toggle */}
                    <TouchableOpacity
                      onPress={() => toggleHeatmap(item.id)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}
                    >
                      <BarChart2 size={14} color={TH.sub} />
                      <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>
                        {expandedHeatmaps.has(item.id) ? T('planHideHeatmap') : T('planShowHeatmap')}
                      </Text>
                      {expandedHeatmaps.has(item.id)
                        ? <ChevronDown size={14} color={TH.sub} />
                        : <ChevronRight size={14} color={TH.sub} />}
                    </TouchableOpacity>
                    {/* Item Heatmap */}
                    {expandedHeatmaps.has(item.id) && (
                      <View style={{ marginTop: 8 }}>
                        <ItemHeatmap item={item} checkins={checkins} TH={TH} T={T} />
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </Card>

          {/* Related Reflections & Trails */}
          {tab === 'detail' && (relatedReflections.total > 0 || relatedTrails.length > 0) && (
            <Card>
              {/* Collapsible header with stats */}
              <TouchableOpacity
                onPress={() => setShowRelated(v => !v)}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Link2 size={14} color={P} />
                    <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>{T('planLinkedContent')}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    {relatedReflections.total > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <MessageCircle size={14} color={P} />
                        <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>
                          {relatedReflections.total} {T('planRelatedReflections')}
                        </Text>
                      </View>
                    )}
                    {relatedTrails.length > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Route size={14} color={P} />
                        <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>
                          {relatedTrails.length} {T('planRelatedTrails')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                {showRelated
                  ? <ChevronDown size={18} color={TH.sub} />
                  : <ChevronRight size={18} color={TH.sub} />}
              </TouchableOpacity>

              {/* Expanded content */}
              {showRelated && (
                <View style={{ marginTop: 12, gap: 8 }}>
                  {/* Related Reflections */}
                  {relatedReflections.items.map(r => (
                    <TouchableOpacity
                      key={r.id}
                      onPress={() => nav.navigate('ReflectionDetail', { reflectionId: r.id })}
                      style={{ backgroundColor: `${TH.card}80`, borderWidth: 1, borderColor: TH.border, borderRadius: 10, padding: 12 }}
                    >
                      <Text style={{ fontSize: FONT_BODY, color: TH.text }} numberOfLines={2}>{r.content}</Text>
                      <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 4 }}>
                        {new Date(r.timestamp).toLocaleDateString()}
                      </Text>
                    </TouchableOpacity>
                  ))}

                  {/* Related Trails */}
                  {relatedTrails.map(trail => (
                    <TouchableOpacity
                      key={trail.id}
                      onPress={() => nav.navigate('ThoughtTrailDetail', { trailId: trail.id })}
                      style={{ backgroundColor: `${TH.card}80`, borderWidth: 1, borderColor: TH.border, borderRadius: 10, padding: 12 }}
                    >
                      <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>{trail.name}</Text>
                      <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 4 }}>
                        {trail.reflectionIds.length} {T('planTrailReflectionCount')}
                      </Text>
                    </TouchableOpacity>
                  ))}

                  {/* Show "more" hint if reflections were truncated */}
                  {relatedReflections.total > 3 && (
                    <TouchableOpacity onPress={() => nav.navigate('MindTrail')}>
                      <Text style={{ fontSize: FONT_SUB, color: TH.sub, textAlign: 'center', paddingVertical: 4 }}>
                        +{relatedReflections.total - 3}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </Card>
          )}

          {/* Relation Map Entry */}
          <TouchableOpacity
            onPress={() => nav.navigate('RelationMap' as never, { context: { type: 'plan', id: planId } } as never)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: TH.card, borderRadius: 12, borderWidth: 1, borderColor: TH.border, marginBottom: 12 }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${P}20`, alignItems: 'center', justifyContent: 'center' }}>
              <Link size={20} color={P} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>{T('planRelationMap')}</Text>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('planRelationMapDesc')}</Text>
            </View>
            <ChevronRight size={18} color={TH.sub} />
          </TouchableOpacity>

          {/* Heatmap */}
          <Card>
            <TouchableOpacity
              onPress={() => setShowHeatmap(v => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>{T('planHeatmap')}</Text>
              {showHeatmap
                ? <ChevronDown size={18} color={TH.sub} />
                : <ChevronRight size={18} color={TH.sub} />}
            </TouchableOpacity>
            {showHeatmap && (
              <View style={{ marginTop: 12 }}>
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
              <Card style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Text style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 8 }}>{T('planTodoToday')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                  <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: P }}>{stats.totalDone}</Text>
                  <Text style={{ fontSize: FONT_BODY, color: TH.sub }}>/ {stats.totalItems}</Text>
                </View>
                <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 4 }}>{today}</Text>
              </Card>

              <Card>
                {/* Plan items */}
                {todayItems.length === 0 && dailyCustomTodos.length === 0 ? (
                  <Text style={{ fontSize: FONT_EMPTY, color: TH.sub, textAlign: 'center', padding: 24 }}>{T('planNoItems')}</Text>
                ) : (
                  <>
                    {/* Plan items group header */}
                    {todayItems.length > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12 }}>
                        <ClipboardList size={14} color={TH.sub} />
                        <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.sub }}>{T('planTodoList')} ({todayItems.length})</Text>
                      </View>
                    )}
                    {todayItems.map((item, i, arr) => {
                      const status = statusMap.get(item.id);
                      const done = status?.done ?? false;
                      const autoChecked = status?.autoChecked ?? false;
                      return (
                        <View
                          key={item.id}
                          style={{
                            flexDirection: 'row', alignItems: 'center', gap: 12,
                            paddingVertical: 10, paddingHorizontal: 12,
                            borderBottomWidth: i < arr.length - 1 || dailyCustomTodos.length > 0 ? 1 : 0, borderBottomColor: TH.border,
                            opacity: autoChecked ? 0.7 : 1,
                          }}
                        >
                          <TouchableOpacity onPress={() => toggleItem(item.id)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                            <View style={{
                              width: 22, height: 22, borderRadius: 6,
                              borderWidth: 2, borderColor: done ? P : TH.border,
                              alignItems: 'center', justifyContent: 'center',
                              backgroundColor: done ? P : 'transparent',
                            }}>
                              {done && <Check size={14} color="#fff" />}
                            </View>
                          </TouchableOpacity>
                          {autoChecked && (
                            <View style={{ backgroundColor:`${COLORS.GREEN}20`, paddingHorizontal:4, paddingVertical:1, borderRadius:4 }}>
                              <Text style={{ fontSize:9, color:COLORS.GREEN, fontWeight:'600' }}>{T('planAutoChecked')}</Text>
                            </View>
                          )}
                          {item.status === 'delayed' && !done && (
                            <View style={{ backgroundColor:`${COLORS.ORANGE}20`, paddingHorizontal:4, paddingVertical:1, borderRadius:4 }}>
                              <Text style={{ fontSize:9, color:COLORS.ORANGE, fontWeight:'600' }}>{T('planStatusDelayed')}</Text>
                            </View>
                          )}
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={{
                              fontSize: FONT_BODY, fontWeight: '500',
                              color: TH.text,
                            }}>{item.name}</Text>
                            <Text style={{ fontSize: FONT_TINY, color: P, marginTop: 1 }}>
                              {getFrequencySummary(item.frequency ?? { mode: 'daily' }, T, checkins, today, item.id)}
                            </Text>
                            {item.description ? (
                              <Text style={{ fontSize: FONT_BADGE, color: TH.sub, marginTop: 2 }} numberOfLines={1}>{item.description}</Text>
                            ) : null}
                          </View>
                          <LinkBadge link={item.link} T={T} P={P} />
                        </View>
                      );
                    })}

                    {/* Custom todos group header */}
                    {dailyCustomTodos.length > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderTopWidth: todayItems.length > 0 ? 1 : 0, borderTopColor: TH.border }}>
                        <Pencil size={14} color={TH.sub} />
                        <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.sub }}>{T('planDailyCustomTodos')} ({dailyCustomTodos.length})</Text>
                      </View>
                    )}
                    {/* Custom todos */}
                    {dailyCustomTodos.map((todo, i, arr) => (
                      <View
                        key={todo.id}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: 12,
                          paddingVertical: 10, paddingHorizontal: 12,
                          borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: TH.border,
                        }}
                      >
                        <TouchableOpacity onPress={() => toggleCustomTodo(todo.id)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                          <View style={{
                            width: 22, height: 22, borderRadius: 6,
                            borderWidth: 2, borderColor: todo.done ? P : TH.border,
                            alignItems: 'center', justifyContent: 'center',
                            backgroundColor: todo.done ? P : 'transparent',
                          }}>
                            {todo.done && <Check size={14} color="#fff" />}
                          </View>
                        </TouchableOpacity>
                        <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{
                            fontSize: FONT_BODY, fontWeight: '500',
                            color: TH.text,
                          }}>{todo.name}</Text>
                          {todo.recurring && <Repeat size={12} color={P} />}
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            Alert.alert(T('planDeleteCustomTodo'), T('planDeleteCustomTodoConfirm'), [
                              { text: T('commonCancel'), style: 'cancel' },
                              { text: T('commonConfirm'), style: 'destructive', onPress: () => deleteCustomTodo(todo.id) },
                            ]);
                          }}
                          style={{ padding: 4 }}
                        >
                          <Trash2 size={16} color={COLORS.RED} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </>
                )}

                {/* Add custom todo */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderTopWidth: todayItems.length > 0 || dailyCustomTodos.length > 0 ? 1 : 0, borderTopColor: TH.border }}>
                    <TextInput
                      style={{
                        flex: 1, height: 36, borderWidth: 1, borderColor: TH.border, borderRadius: 8,
                        paddingHorizontal: 10, fontSize: FONT_SUB, color: TH.text, backgroundColor: TH.bg,
                      }}
                      placeholder={T('planAddCustomTodoPlaceholder')}
                      placeholderTextColor={TH.sub}
                      value={newTodoName}
                      onChangeText={setNewTodoName}
                      onSubmitEditing={addCustomTodo}
                      returnKeyType="done"
                    />
                    <TouchableOpacity
                      onPress={() => setNewTodoRecurring(!newTodoRecurring)}
                      style={{ padding: 8, borderRadius: 8, borderWidth: 1, borderColor: newTodoRecurring ? P : TH.border, backgroundColor: newTodoRecurring ? `${P}15` : 'transparent' }}
                    >
                      <Repeat size={16} color={newTodoRecurring ? P : TH.sub} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={addCustomTodo}
                      style={{ padding: 8, backgroundColor: P, borderRadius: 8 }}
                    >
                      <Plus size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
              </Card>
            </>
            )}
          {plan.status !== 'in_progress' && plan.status !== 'paused' && (
            <Card style={{ alignItems:'center', paddingVertical:20 }}>
              <Text style={{ fontSize:FONT_BODY, color:TH.sub }}>{T(statusToI18nKey(plan.status))}</Text>
            </Card>
          )}

          {/* History section */}
          <View style={{ marginTop: 24 }}>
            <TouchableOpacity onPress={() => setShowHistory(v => !v)}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: showHistory ? 12 : 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontWeight: '700', fontSize: FONT_TITLE, color: TH.text }}>{T('planTodoHistory')}</Text>
                {showHistory ? <ChevronDown size={18} color={TH.text} /> : <ChevronRight size={18} color={TH.text} />}
              </View>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{historyGroups.length} {T('planDays')}</Text>
            </TouchableOpacity>

            {showHistory && (
              <>
                {historyGroups.length > 0 && (
                  <View style={{ flexDirection: 'row', backgroundColor: TH.card, borderWidth: 1, borderColor: TH.border, borderRadius: 14, paddingVertical: 14, marginBottom: 16 }}>
                    {[
                      { value: String(historySummary.totalDays), label: T('planDays') },
                      { value: String(historySummary.totalDoneItems), label: T('planTodoDone') },
                    ].map(s => (
                      <View key={s.label} style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '800', color: P }}>{s.value}</Text>
                        <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 2 }}>{s.label}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {historyGroups.length === 0 ? (
                  <Text style={{ color: TH.sub, fontSize: FONT_EMPTY, textAlign: 'center', padding: 24 }}>{T('noHistory')}</Text>
                ) : (
                  <View style={{ position: 'relative', paddingLeft: 20 }}>
                    <View style={{ position: 'absolute', left: 6, top: 6, bottom: 6, width: 2, backgroundColor: TH.border, borderRadius: 1 }} />
                    {historyGroups.map((group) => {
                      const allItems = mergeHistoryItems(group);
                      const doneCount = allItems.filter(i => i.done).length;
                      const isExpanded = expandedDates.has(group.date);
                      return (
                        <View key={group.date} style={{ position: 'relative', marginBottom: 16 }}>
                          <View style={{ position: 'absolute', left: -17, top: 14, width: 10, height: 10, borderRadius: 5, backgroundColor: P, borderWidth: 2, borderColor: TH.bg }} />
                          <View style={{ backgroundColor: TH.card, borderWidth: 1, borderColor: TH.border, borderRadius: 12, overflow: 'hidden' }}>
                            <TouchableOpacity
                              onPress={() => toggleDateExpand(group.date)}
                              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: `${P}08`, borderBottomWidth: isExpanded ? 1 : 0, borderBottomColor: TH.border }}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                {isExpanded ? <ChevronDown size={16} color={TH.text} /> : <ChevronRight size={16} color={TH.text} />}
                                <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>{group.date}</Text>
                              </View>
                              <Text style={{ fontSize: FONT_BODY, color: P, fontWeight: '700' }}>{doneCount} {T('planTodoDone')}</Text>
                            </TouchableOpacity>
                            {isExpanded && allItems.map((item, i) => (
                              <View key={i} style={{
                                flexDirection: 'row', alignItems: 'center', gap: 8,
                                paddingVertical: 8, paddingHorizontal: 14,
                                borderTopWidth: i > 0 ? 1 : 0, borderTopColor: TH.border,
                                opacity: item.done ? 1 : 0.5,
                              }}>
                                <View style={{
                                  width: 18, height: 18, borderRadius: 4,
                                  backgroundColor: item.done ? P : `${TH.border}80`,
                                  alignItems: 'center', justifyContent: 'center',
                                }}>
                                  {item.done && <Check size={10} color="#fff" />}
                                </View>
                                <Text style={{
                                  fontSize: FONT_BODY, color: TH.text, flex: 1,
                                  textDecorationLine: item.done ? 'line-through' : 'none',
                                }}>{item.name}</Text>
                                {item.type === 'plan' && <LinkBadge link={item.link} T={T} P={P} />}
                                {item.type === 'custom' && (
                                  <View style={{ backgroundColor: `${P}15`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                    <Text style={{ fontSize: 10, color: P, fontWeight: '500' }}>{T('planDailyCustomTodos')}</Text>
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
        <View style={{ gap: 8, marginTop: 24 }}>
          {editable && (
            <TouchableOpacity onPress={() => nav.navigate('PlanCreate', { planId: plan.id })}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: TH.card, borderWidth: 1, borderColor: TH.border }}>
              <Pencil size={16} color={TH.text} />
              <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>{T('commonEdit')}</Text>
            </TouchableOpacity>
          )}
          {pausable && (
            <TouchableOpacity onPress={handlePause}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.YELLOW }}>
              <Pause size={16} color="#fff" />
              <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: '#fff' }}>{T('planPause')}</Text>
            </TouchableOpacity>
          )}
          {resumable && (
            <TouchableOpacity onPress={handleResume}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.GREEN }}>
              <Play size={16} color="#fff" />
              <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: '#fff' }}>{T('planResume')}</Text>
            </TouchableOpacity>
          )}
          {cancellable && (
            <TouchableOpacity onPress={handleCancel}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: `${COLORS.RED}15`, borderWidth: 1, borderColor: `${COLORS.RED}30` }}>
              <XCircle size={16} color={COLORS.RED} />
              <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: COLORS.RED }}>{T('planCancelPlan')}</Text>
            </TouchableOpacity>
          )}
          {completable && (
            <TouchableOpacity onPress={handleComplete}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: P }}>
              <CircleCheck size={16} color="#fff" />
              <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: '#fff' }}>{T('planComplete')}</Text>
            </TouchableOpacity>
          )}
          {deletable && (
            <TouchableOpacity onPress={handleDelete}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: `${COLORS.RED}15`, borderWidth: 1, borderColor: `${COLORS.RED}30` }}>
              <Trash2 size={16} color={COLORS.RED} />
              <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: COLORS.RED }}>{T('planDelete')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}
