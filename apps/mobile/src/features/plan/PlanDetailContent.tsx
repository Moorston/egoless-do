import { getPlanItems, PRIORITY_OPTIONS, canDeletePlan, canEditPlan, getFrequencySummary, createDateChangeDetector, countItemDoneDays, computeItemProgress, computePlanProgress } from '@egoless-do/core';
import type { PlanItem, PlanItemCheckin, PlanItemStatus } from '@egoless-do/core';
import { BarChart2, ChevronDown, ChevronRight } from 'lucide-react-native';
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, AppState } from 'react-native';

import { Card, useTheme, useT } from '../../components/UI';
import { useRootNavigation } from '../../navigation/hooks';
import { useShallowStore } from '../../store/useAppStore';

import { DetailTabContent } from './components/DetailTabContent';
import { ItemHeatmap } from './components/ItemHeatmap';
import { LinkBadge } from './components/LinkBadge';
import { PlanActionBar } from './components/PlanActionBar';
import { StatusLabel } from './components/StatusBadge';
import { TodoTabContent } from './components/TodoTabContent';
import { styles } from './styles';
import { useDailyTodo } from './useDailyTodo';



const EMPTY_CHECKINS: PlanItemCheckin[] = [];


// PlanDetailContent 为计划详情综合屏幕（任务/热力图/关联感念/历史），拆分子组件成本较高，暂禁用行数限制
// eslint-disable-next-line max-lines-per-function
export default function PlanDetailContent({ planId, onClose, addReflectionId: _addReflectionId }: { planId: string; onClose: () => void; addReflectionId?: string }) {
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
    // detector 为 useRef 稳定引用，无需加入依赖数组
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const getItemEffectiveStatus = useCallback((item: PlanItem): PlanItemStatus => {
    if (item.status === 'completed') return 'completed';
    if ((itemProgressMap.get(item.id)?.progress ?? 0) >= 100) return 'completed';
    if (item.status === 'in_progress' && item.endDate < today) return 'delayed';
    return item.status;
  }, [itemProgressMap, today]);

  const sortedItems = useMemo(() => {
    const order: Record<string, number> = { delayed: 0, in_progress: 1, not_started: 2, completed: 3 };
    return [...items].sort((a, b) => {
      const oa = order[getItemEffectiveStatus(a)] ?? 9;
      const ob = order[getItemEffectiveStatus(b)] ?? 9;
      if (oa !== ob) return oa - ob;
      if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
      return a.endDate.localeCompare(b.endDate);
    });
  }, [items, getItemEffectiveStatus]);

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
          <Text style={[styles.textBadgeDim, { color: TH.sub }]}>{String(prog.progress)}%</Text>
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
  const deletable = canDeletePlan(plan.status);
  const editable = canEditPlan(plan.status);
  const completable = plan.status === 'in_progress' || plan.status === 'paused';
  const resumable = plan.status === 'paused';
  const pausable = plan.status === 'in_progress';
  const cancellable = plan.status === 'paused';

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
        <DetailTabContent
          plan={plan}
          planId={planId}
          items={items}
          sortedItems={sortedItems}
          checkins={checkins}
          today={today}
          planProgress={planProgress}
          visions={visions ?? []}
          relatedReflections={relatedReflections}
          relatedTrails={relatedTrails}
          renderItemRow={renderItemRow}
          showHeatmap={showHeatmap}
          setShowHeatmap={setShowHeatmap}
          showRelated={showRelated}
          setShowRelated={setShowRelated}
        />
      ) : (
        <TodoTabContent
          todayItems={todayItems}
          dailyCustomTodos={dailyCustomTodos}
          statusMap={statusMap}
          stats={stats}
          historyGroups={historyGroups}
          historySummary={historySummary}
          showHistory={showHistory}
          setShowHistory={setShowHistory}
          newTodoName={newTodoName}
          setNewTodoName={setNewTodoName}
          newTodoRecurring={newTodoRecurring}
          setNewTodoRecurring={setNewTodoRecurring}
          toggleItem={toggleItem}
          addCustomTodo={addCustomTodo}
          deleteCustomTodo={deleteCustomTodo}
          toggleCustomTodo={toggleCustomTodo}
          mergeHistoryItems={mergeHistoryItems}
          plan={plan}
          checkins={checkins}
          today={today}
          expandedDates={expandedDates}
          toggleDateExpand={toggleDateExpand}
        />
      )}

      {/* Action buttons — only on detail tab */}
      {tab === 'detail' && (editable || pausable || resumable || cancellable || completable || deletable) && (
        <PlanActionBar
          plan={plan}
          items={items}
          itemProgressMap={itemProgressMap}
          editable={editable}
          pausable={pausable}
          resumable={resumable}
          cancellable={cancellable}
          completable={completable}
          deletable={deletable}
          deletePlan={deletePlan}
          completePlan={completePlan}
          resumePlan={resumePlan}
          pausePlan={pausePlan}
          cancelPlan={cancelPlan}
          canArchivePlan={canArchivePlan}
          unlinkAllReflectionsFromPlan={unlinkAllReflectionsFromPlan}
          onEdit={() => nav.navigate('PlanCreate', { planId: plan.id })}
          onClose={onClose}
        />
      )}
    </ScrollView>
    </KeyboardAvoidingView>
    </>
  );
}

