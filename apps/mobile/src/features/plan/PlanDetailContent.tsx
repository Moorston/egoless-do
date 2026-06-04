import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform, AppState } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useAppStore } from '../../store/useAppStore';
import { useRootNavigation } from '../../navigation/hooks';
import { THEMES, COLORS, LINK_COLORS, getPlanItems, PRIORITY_OPTIONS, isPlanDelayed, canDeletePlan, canEditPlan, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_STAT_CARD, FONT_STAT_SECTION, FONT_EMPTY, dateStr } from '@egoless-do/core';
import type { Plan, PlanItem, PlanItemCheckin, PlanStatus, PlanItemStatus, PlanItemLink, DailyCustomTodo, DailyTodoHistory } from '@egoless-do/core';
import { useDailyTodo } from './useDailyTodo';
import { Card, useTheme, useT } from '../../components/UI';
import { ChevronDown, ChevronRight, Check, Trash2, Pencil, CircleCheck, Play, Pause, XCircle, ClipboardList, Plus } from 'lucide-react-native';

const STATUS_COLORS: Record<string, string> = {
  not_started: COLORS.GRAY, in_progress: COLORS.GREEN, paused: COLORS.YELLOW,
  completed: COLORS.BLUE, cancelled: COLORS.RED, delayed: COLORS.ORANGE,
};

function StatusLabel({ status, T }: { status: PlanStatus; T: (k: string) => string }) {
  const key = `planStatus${status.charAt(0).toUpperCase() + status.slice(1).replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())}`;
  return (
    <View style={{ backgroundColor: `${STATUS_COLORS[status]}20`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
      <Text style={{ fontSize: FONT_BADGE, fontWeight: '600', color: STATUS_COLORS[status] }}>{T(key)}</Text>
    </View>
  );
}

function LinkBadge({ link, T, P }: { link: PlanItemLink; T: (k: string) => string; P: string }) {
  if (link === 'manual') return null;
  const color = LINK_COLORS[link] ?? P;
  return (
    <View style={{ backgroundColor: `${color}15`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
      <Text style={{ fontSize: 10, color, fontWeight: '500' }}>
        {T(`planLink${link.charAt(0).toUpperCase() + link.slice(1)}`)}
      </Text>
    </View>
  );
}

function ProgressRing({ progress, size = 64, strokeWidth = 6, color }: { progress: number; size?: number; strokeWidth?: number; color: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress / 100);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={`${color}20`} strokeWidth={strokeWidth} />
        <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </Svg>
      <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color }}>{progress}%</Text>
    </View>
  );
}

function Heatmap({ checkins, items, plan, TH, T }: { checkins: PlanItemCheckin[]; items: PlanItem[]; plan: Plan; TH: any; T: (k: string) => string }) {
  const [containerWidth, setContainerWidth] = useState(0);
  const cellSize = containerWidth > 0 ? Math.floor(containerWidth / 7) : 0;

  const rateMap = useMemo(() => {
    const map = new Map<string, number>();
    const start = new Date(plan.startDate);
    const end = new Date(plan.endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = dateStr(d);
      const activeItems = items.filter(i => !i.deleted && ds >= i.startDate && ds <= i.endDate);
      if (activeItems.length === 0) map.set(ds, -1);
      else {
        const done = activeItems.filter(i => checkins.some(c => c.planItemId === i.id && c.date === ds && c.done)).length;
        map.set(ds, done / activeItems.length);
      }
    }
    return map;
  }, [checkins, items, plan.startDate, plan.endDate]);

  const { weeks } = useMemo(() => {
    const start = new Date(plan.startDate);
    const end = new Date(plan.endDate);
    const startDay = start.getDay();

    const dates: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(dateStr(d));
    }

    const weeks: (string | null)[][] = [];
    let week: (string | null)[] = new Array(startDay).fill(null);

    for (const ds of dates) {
      week.push(ds);
      if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }

    return { weeks };
  }, [plan.startDate, plan.endDate]);

  const weekLabels = [
    T('weekdaySun'), T('weekdayMon'), T('weekdayTue'), T('weekdayWed'),
    T('weekdayThu'), T('weekdayFri'), T('weekdaySat'),
  ];

  return (
    <View onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}>
      {cellSize > 0 && (
        <>
          {/* Weekday labels row */}
          <View style={{ flexDirection: 'row', marginBottom: 4 }}>
            {weekLabels.map((label, i) => (
              <View key={i} style={{ width: cellSize }}>
                <Text style={{ fontSize: 10, color: TH.sub, textAlign: 'center' }}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Grid */}
          <View>
            {weeks.map((w, wi) => (
              <View key={wi} style={{ flexDirection: 'row' }}>
                {w.map((ds, di) => {
                  const rate = ds ? (rateMap.get(ds) ?? -1) : -1;
                  const dayNum = ds ? parseInt(ds.slice(8), 10) : 0;
                  return (
                    <View key={di} style={{ width: cellSize, height: cellSize, padding: 2 }}>
                      {ds ? (
                        <View style={{
                          flex: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center',
                          backgroundColor: rate < 0 ? 'transparent' : rate >= 0.8 ? COLORS.GREEN : rate >= 0.5 ? COLORS.YELLOW : rate > 0 ? COLORS.RED : `${TH.border}60`,
                        }}>
                          <Text style={{ fontSize: 12, fontWeight: '500', color: rate >= 0.5 ? '#fff' : TH.text }}>{dayNum}</Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Legend */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <Text style={{ fontSize: 10, color: TH.sub }}>{T('heatmapLess')}</Text>
            {[`${TH.border}60`, COLORS.RED, COLORS.YELLOW, COLORS.GREEN].map((c, i) => (
              <View key={i} style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: c }} />
            ))}
            <Text style={{ fontSize: 10, color: TH.sub }}>{T('heatmapMore')}</Text>
          </View>

          {/* Plan period */}
          <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 8, textAlign: 'center' }}>
            {plan.startDate} ~ {plan.endDate}
          </Text>
        </>
      )}
    </View>
  );
}

export default function PlanDetailContent({ planId, onClose }: { planId: string; onClose: () => void }) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const store = useAppStore();
  const nav = useRootNavigation();

  // 日期状态，支持跨天自动刷新
  const [today, setToday] = useState(() => dateStr());
  const todayRef = useRef(today);

  // 检测日期变化（不依赖闭包中的 today）
  const checkDateChange = () => {
    const newToday = dateStr();
    if (newToday !== todayRef.current) {
      const previousDate = todayRef.current;
      todayRef.current = newToday;
      setToday(newToday);
      // 执行每日重置：自动启动任务并保存前一天的历史
      store.performDailyReset(previousDate);
    }
  };

  // 监听应用从后台恢复到前台时检查日期变化
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkDateChange();
      }
    });

    // 每分钟检查一次日期变化
    const interval = setInterval(checkDateChange, 60000);

    // 组件挂载时也检查一次
    checkDateChange();

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);

  const plan = useMemo(() => (store.plans ?? []).find(p => p.id === planId), [store.plans, planId]);
  const items = useMemo(() => getPlanItems(store.planItems ?? [], planId), [store.planItems, planId]);
  const checkins = store.planItemCheckins ?? [];

  // 实时计算每个任务的进度（基于整个任务周期）
  const computeItemProgressRealtime = (item: PlanItem): number => {
    const totalDays = Math.round((new Date(item.endDate).getTime() - new Date(item.startDate).getTime()) / 86400000) + 1;
    if (totalDays <= 0) return 0;
    const clampedToday = today > item.endDate ? item.endDate : today;
    const doneCount = checkins.filter(c =>
      c.planItemId === item.id && c.done && c.date >= item.startDate && c.date <= clampedToday
    ).length;
    return Math.min(Math.round((doneCount / totalDays) * 100), 100);
  };

  // 计划进度基于时间（已过天数/总天数），任务进度单独计算

  const [tab, setTab] = useState<'detail' | 'todo'>('detail');

  const {
    todayItems, dailyCustomTodos, statusMap, stats,
    historyGroups, historySummary,
    showHistory, setShowHistory,
    newTodoName, setNewTodoName,
    toggleItem, addCustomTodo, deleteCustomTodo, toggleCustomTodo,
    mergeHistoryItems,
  } = useDailyTodo(plan, today);

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
    if (computeItemProgressRealtime(item) >= 100) return 'completed';
    if (item.status === 'in_progress' && item.endDate < today) return 'delayed';
    return item.status;
  };

  const checkCanArchive = (onConfirm: () => void) => {
    const result = store.canArchivePlan(plan.id);
    if (!result.allowed) {
      Alert.alert(
        '无法执行操作',
        `该计划中有 ${result.linkedReflectionCount} 个任务关联了感念，无法执行此操作。\n\n是否批量解绑关联的感念任务？`,
        [
          { text: '取消', style: 'cancel' },
          { text: '批量解绑并继续', style: 'destructive', onPress: () => {
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
          </Card>

          {/* Goal */}
          <Card>
            <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.sub, marginBottom: 6 }}>{T('planGoal')}</Text>
            <Text style={{ fontSize: FONT_BODY, color: TH.text, lineHeight: 22 }}>{plan.goal}</Text>
          </Card>

          {/* Items */}
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>{T('planItems')}</Text>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{items.length}</Text>
            </View>
            {items.length === 0 ? (
              <Text style={{ fontSize: FONT_SUB, color: TH.sub, textAlign: 'center', padding: 12 }}>{T('planNoItems')}</Text>
            ) : (
              items.map((item, idx) => {
                const clampedToday = today > item.endDate ? item.endDate : today;
                const itemCheckins = checkins.filter(c => c.planItemId === item.id && c.done && c.date >= item.startDate && c.date <= clampedToday);
                const itemProgress = computeItemProgressRealtime(item);
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
                        <View style={{ height: 4, width: `${itemProgress}%`, backgroundColor: P, borderRadius: 2 }} />
                      </View>
                      <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{itemProgress}%</Text>
                      <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{itemCheckins.length} {T('planCheckinDays')}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </Card>

          {/* Heatmap */}
          <Card>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text, marginBottom: 12 }}>{T('planHeatmap')}</Text>
            <Heatmap checkins={checkins} items={items} plan={plan} TH={TH} T={T} />
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
                  <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: COLORS.GREEN }}>{stats.totalDone}</Text>
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
                              borderWidth: 2, borderColor: done ? COLORS.GREEN : TH.border,
                              alignItems: 'center', justifyContent: 'center',
                              backgroundColor: done ? COLORS.GREEN : 'transparent',
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
                              color: done ? TH.sub : TH.text,
                              textDecorationLine: done ? 'line-through' : 'none',
                            }}>{item.name}</Text>
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
                            borderWidth: 2, borderColor: todo.done ? COLORS.GREEN : TH.border,
                            alignItems: 'center', justifyContent: 'center',
                            backgroundColor: todo.done ? COLORS.GREEN : 'transparent',
                          }}>
                            {todo.done && <Check size={14} color="#fff" />}
                          </View>
                        </TouchableOpacity>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{
                            fontSize: FONT_BODY, fontWeight: '500',
                            color: todo.done ? TH.sub : TH.text,
                            textDecorationLine: todo.done ? 'line-through' : 'none',
                          }}>{todo.name}</Text>
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
              <Text style={{ fontSize:FONT_BODY, color:TH.sub }}>{T(`planStatus${plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}`)}</Text>
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
                                  backgroundColor: item.done ? COLORS.GREEN : `${TH.border}80`,
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
