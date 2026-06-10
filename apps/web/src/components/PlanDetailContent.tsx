'use client';

import { useMemo, useState, useRef, useEffect, memo } from 'react';
import { THEMES, COLORS, LINK_COLORS, getPlanItems, PRIORITY_OPTIONS, isPlanDelayed, canDeletePlan, canEditPlan, FONT_BODY, FONT_TITLE, FONT_SUB, FONT_BADGE, FONT_BACK, FONT_STAT_CARD, FONT_STAT_SECTION, FONT_EMPTY, FONT_TINY, dateStr, createDateChangeDetector, PLAN_STATUS_COLORS, statusToI18nKey, computeItemProgress } from '@egoless-do/core';
import type { Plan, PlanItem, PlanItemCheckin, PlanStatus, PlanItemLink, CheckinFrequency } from '@egoless-do/core';
import { useDailyTodo } from './useDailyTodo';
import { useT, cs } from './helpers';
import { useOverlay } from './useOverlay';
import { useWebStore } from '../store/useWebStore';
import { ChevronLeft, Check, ChevronDown, ChevronRight, ClipboardList, Pencil, CircleCheck, Play, Pause, XCircle, Trash2, CheckCircle2, Plus, Repeat, BarChart2 } from 'lucide-react';
import { ItemHeatmap } from './ItemHeatmap';

const EMPTY_CHECKINS: PlanItemCheckin[] = [];

const WEEKDAY_LABELS = ['weekdaySun', 'weekdayMon', 'weekdayTue', 'weekdayWed', 'weekdayThu', 'weekdayFri', 'weekdaySat'];

function getFrequencySummary(freq: CheckinFrequency, T: (k: string) => string, checkins: PlanItemCheckin[], today: string): string {
  switch (freq.mode) {
    case 'daily':
      return T('freqSummaryDaily');
    case 'interval':
      return T('freqSummaryInterval').replace('{n}', String(freq.every));
    case 'weekly': {
      const d = new Date(today);
      const day = d.getDay();
      const ws = new Date(d);
      ws.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      const wsStr = ws.toISOString().slice(0, 10);
      const we = new Date(ws);
      we.setDate(ws.getDate() + 6);
      const weStr = we.toISOString().slice(0, 10);
      const doneThisWeek = checkins.filter(c => c.done && c.date >= wsStr && c.date <= weStr).length;
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

const StatusLabel = memo(function StatusLabel({ status, T }: { status: string; T: (k: string) => string }) {
  return (
    <span style={{
      fontSize: FONT_BADGE, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
      background: `${PLAN_STATUS_COLORS[status]}20`, color: PLAN_STATUS_COLORS[status],
    }}>{T(statusToI18nKey(status))}</span>
  );
});

const LinkBadge = memo(function LinkBadge({ link, T, P }: { link: PlanItemLink; T: (k: string) => string; P: string }) {
  if (link === 'manual') return null;
  const color = LINK_COLORS[link] ?? P;
  return (
    <span style={{ fontSize: 10, color, background: `${color}15`, padding: '2px 6px', borderRadius: 4, fontWeight: 500 }}>
      {T(`planLink${link.charAt(0).toUpperCase() + link.slice(1)}`)}
    </span>
  );
});

const ProgressRing = memo(function ProgressRing({ progress, size = 64, strokeWidth = 6, color }: { progress: number; size?: number; strokeWidth?: number; color: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress / 100);
  return (
    <div style={{ width: size, height: size, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size} height={size} style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={`${color}20`} strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span style={{ fontSize: FONT_TITLE, fontWeight: 700, color }}>{progress}%</span>
    </div>
  );
});

const Heatmap = memo(function Heatmap({ checkins, items, plan, theme, T }: { checkins: PlanItemCheckin[]; items: PlanItem[]; plan: Plan; theme: string; T: (k: string) => string }) {
  const TH = THEMES[theme as keyof typeof THEMES] ?? THEMES.dark;
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setContainerWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cellSize = containerWidth > 0 ? Math.floor(containerWidth / 7) : 0;

  const rateMap = useMemo(() => {
    const map = new Map<string, number>();
    // Pre-build done checkin set: "planItemId:date" → true
    const doneSet = new Set<string>();
    for (const c of checkins) {
      if (c.done) doneSet.add(`${c.planItemId}:${c.date}`);
    }
    const activeItems = items.filter(i => !i.deleted);
    const start = new Date(plan.startDate);
    const end = new Date(plan.endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = dateStr(d);
      let total = 0;
      let done = 0;
      for (const item of activeItems) {
        if (ds >= item.startDate && ds <= item.endDate) {
          total++;
          if (doneSet.has(`${item.id}:${ds}`)) done++;
        }
      }
      map.set(ds, total === 0 ? -1 : done / total);
    }
    return map;
  }, [checkins, items, plan.startDate, plan.endDate]);

  const { weeks } = useMemo(() => {
    const start = new Date(plan.startDate);
    const startDay = start.getDay();
    const dates: string[] = [];
    for (let d = new Date(start); d <= new Date(plan.endDate); d.setDate(d.getDate() + 1)) {
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

  const weekLabels = useMemo(() => [
    T('weekdaySun'), T('weekdayMon'), T('weekdayTue'), T('weekdayWed'),
    T('weekdayThu'), T('weekdayFri'), T('weekdaySat'),
  ], [T]);

  if (cellSize <= 0) {
    return <div ref={containerRef} style={{ width: '100%' }} />;
  }

  return (
    <div ref={containerRef}>
      {/* Weekday labels row */}
      <div style={{ display: 'flex', marginBottom: 4 }}>
        {weekLabels.map((label, i) => (
          <div key={i} style={{ width: cellSize, fontSize: 10, color: TH.sub, textAlign: 'center' }}>{label}</div>
        ))}
      </div>
      {/* Grid */}
      <div>
        {weeks.map((w, wi) => (
          <div key={wi} style={{ display: 'flex' }}>
            {w.map((ds, di) => {
              const rate = ds ? (rateMap.get(ds) ?? -1) : -1;
              const dayNum = ds ? parseInt(ds.slice(8), 10) : 0;
              const bg = rate < 0 ? 'transparent' : rate >= 0.8 ? COLORS.GREEN : rate >= 0.5 ? COLORS.YELLOW : rate > 0 ? COLORS.RED : `${TH.border}60`;
              return (
                <div key={di} style={{ width: cellSize, height: cellSize, padding: 2 }}>
                  {ds ? (
                    <div style={{
                      width: '100%', height: '100%', borderRadius: 6,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: bg,
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: rate >= 0.5 ? '#fff' : TH.text }}>{dayNum}</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <span style={{ fontSize: 10, color: TH.sub }}>{T('heatmapLess')}</span>
        {[`${TH.border}60`, COLORS.RED, COLORS.YELLOW, COLORS.GREEN].map((c, i) => (
          <div key={i} style={{ width: 14, height: 14, borderRadius: 4, background: c }} />
        ))}
        <span style={{ fontSize: 10, color: TH.sub }}>{T('heatmapMore')}</span>
      </div>
      {/* Plan period */}
      <div style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 8, textAlign: 'center' }}>
        {plan.startDate} ~ {plan.endDate}
      </div>
    </div>
  );
});

export default function PlanDetailContent({ planId, onClose }: { planId: string; onClose: () => void }) {
  const store = useWebStore();
  const overlay = useOverlay();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const T = useT();

  // 日期状态，支持跨天自动刷新
  const detector = useRef(createDateChangeDetector((prev) => {
    store.performDailyReset(prev);
  })).current;
  const [today, setToday] = useState(() => detector.getCurrent());

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        detector.check();
        setToday(detector.getCurrent());
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const interval = setInterval(() => { detector.check(); setToday(detector.getCurrent()); }, 60000);
    detector.check();
    setToday(detector.getCurrent());
    return () => { document.removeEventListener('visibilitychange', handleVisibilityChange); clearInterval(interval); };
  }, []);

  const plan = useMemo(() => (store.plans ?? []).find(p => p.id === planId), [store.plans, planId]);
  const items = useMemo(() => getPlanItems(store.planItems ?? [], planId), [store.planItems, planId]);
  const checkins = store.planItemCheckins ?? EMPTY_CHECKINS;

  // Pre-compute progress for all items (avoids O(N*M) per render)
  const itemProgressMap = useMemo(() => {
    const map = new Map<string, { doneCount: number; progress: number }>();
    for (const item of items) {
      const clampedToday = today > item.endDate ? item.endDate : today;
      let doneCount = 0;
      for (const c of checkins) {
        if (c.planItemId === item.id && c.done && c.date >= item.startDate && c.date <= clampedToday) doneCount++;
      }
      const progress = computeItemProgress(item, checkins, today);
      map.set(item.id, { doneCount, progress });
    }
    return map;
  }, [items, checkins, today]);

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

  // 历史记录手风琴状态，默认展开最近一天
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (historyGroups.length > 0 && expandedDates.size === 0) {
      setExpandedDates(new Set([historyGroups[0].date]));
    }
  }, [historyGroups]);

  const toggleDateExpand = (date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

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

  if (!plan) {
    return (
      <>
        <div style={{ padding: '20px 0 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: FONT_BACK, cursor: 'pointer' }}><ChevronLeft size={20} /></button>
          <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('planDetail')}</div>
        </div>
        <div style={{ ...cs(TH), textAlign: 'center', padding: 32, color: TH.sub }}>{T('planNotFound')}</div>
      </>
    );
  }

  const totalDays = Math.round((new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / 86400000) + 1;
  const elapsed = Math.max(0, Math.round((new Date(today > plan.endDate ? plan.endDate : today).getTime() - new Date(plan.startDate).getTime()) / 86400000) + 1);
  const progress = totalDays > 0 ? Math.min(Math.round((elapsed / totalDays) * 100), 100) : 0;
  const delayed = isPlanDelayed(plan, today);
  const deletable = canDeletePlan(plan.status);
  const editable = canEditPlan(plan.status);
  const completable = plan.status === 'in_progress' || plan.status === 'paused';
  const resumable = plan.status === 'paused';
  const pausable = plan.status === 'in_progress';
  const cancellable = plan.status === 'paused';

  const checkCanArchive = (): boolean => {
    const result = store.canArchivePlan(plan.id);
    if (!result.allowed) {
      if (confirm(T('planCannotOperateDetail').replace('{count}', String(result.linkedReflectionCount)))) {
        store.unlinkAllReflectionsFromPlan(plan.id);
        return true;
      }
      return false;
    }
    return true;
  };

  const handleDelete = () => {
    if (!checkCanArchive()) return;
    if (confirm(T('planDeleteConfirm'))) { store.deletePlan(plan.id); onClose(); }
  };
  const handleComplete = () => {
    if (confirm(T('planCompleteConfirm'))) store.completePlan(plan.id);
  };
  const handleResume = () => {
    store.resumePlan(plan.id);
  };
  const handlePause = () => {
    store.pausePlan(plan.id);
  };
  const handleCancel = () => {
    if (!checkCanArchive()) return;
    if (confirm(T('planConfirmCancel'))) store.cancelPlan(plan.id);
  };

  return (
    <>
      {/* Header */}
      <div style={{ padding: '16px 0 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TH.text, fontSize: FONT_BACK, cursor: 'pointer' }}><ChevronLeft size={20} /></button>
        <div style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.name}</div>
        {delayed && (
          <span style={{ fontSize: FONT_BADGE, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: `${COLORS.ORANGE}20`, color: COLORS.ORANGE }}>{T('planStatusDelayed')}</span>
        )}
        <StatusLabel status={plan.status} T={T} />
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['detail', 'todo'] as const).map(t => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: active ? P : TH.card, color: active ? '#fff' : TH.sub,
                fontWeight: active ? 700 : 500, fontSize: FONT_BODY,
              }}
            >{t === 'detail' ? T('planDetail') : T('planTodoList')}</button>
          );
        })}
      </div>

      {tab === 'detail' ? (
      <>
      {/* Plan hero card */}
      <div style={cs(TH)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <ClipboardList size={20} color={P} />
          <span style={{ fontSize: FONT_BODY, fontWeight: 700, color: TH.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.name}</span>
          <StatusLabel status={plan.status} T={T} />
        </div>

        {plan.slogan && (
          <div style={{ fontSize: FONT_BODY, color: TH.text, fontStyle: 'italic', marginBottom: 12, lineHeight: '22px' }}>
            &ldquo;{plan.slogan}&rdquo;
          </div>
        )}

        {/* Progress ring + stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
          <ProgressRing progress={progress} color={P} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('planStartDate')}</span>
              <span style={{ fontSize: FONT_SUB, color: TH.text }}>{plan.startDate}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('planEndDate')}</span>
              <span style={{ fontSize: FONT_SUB, color: TH.text }}>{plan.endDate}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('planProgress')}</span>
              <span style={{ fontSize: FONT_SUB, color: TH.text, fontWeight: 600 }}>{elapsed}/{totalDays} {T('planDays')}</span>
            </div>
          </div>
        </div>

        {/* Linear progress bar */}
        <div style={{ height: 6, background: TH.border, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: 6, width: `${progress}%`, background: P, borderRadius: 3, transition: 'width .3s' }} />
        </div>
      </div>

      {/* Goal */}
      <div style={cs(TH)}>
        <div style={{ fontSize: FONT_SUB, fontWeight: 600, color: TH.sub, marginBottom: 6 }}>{T('planGoal')}</div>
        <div style={{ fontSize: FONT_BODY, color: TH.text, lineHeight: '22px' }}>{plan.goal}</div>
      </div>

      {/* Items */}
      <div style={cs(TH)}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: FONT_BODY, fontWeight: 600, color: TH.text }}>{T('planItems')}</span>
          <span style={{ fontSize: FONT_SUB, color: TH.sub }}>{items.length}</span>
        </div>
        {items.length === 0 ? (
          <div style={{ fontSize: FONT_SUB, color: TH.sub, textAlign: 'center', padding: 12 }}>{T('planNoItems')}</div>
        ) : (
          items.map((item, idx) => {
            const prog = itemProgressMap.get(item.id) ?? { doneCount: 0, progress: 0 };
            const p = PRIORITY_OPTIONS.find(o => o.value === (item.priority ?? 'medium'));
            return (
              <div key={item.id} style={{
                padding: '10px 12px', marginBottom: idx < items.length - 1 ? 8 : 0, borderRadius: 10,
                background: `${TH.card}80`, border: `1px solid ${TH.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  {p ? <span style={{ width: 8, height: 8, borderRadius: 4, background: p.color, display: 'inline-block', flexShrink: 0 }} /> : null}
                  <span style={{ fontSize: FONT_BODY, fontWeight: 600, color: TH.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                  <LinkBadge link={item.link} T={T} P={P} />
                  <StatusLabel status={item.status} T={T} />
                </div>
                <div style={{ fontSize: FONT_BADGE, color: TH.sub, marginBottom: 4 }}>{item.startDate} ~ {item.endDate}</div>
                {item.targetMetric && <div style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🎯 {item.targetMetric}</div>}
                {item.description && <div style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 4, background: TH.border, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: 4, width: `${prog.progress}%`, background: P, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: FONT_SUB, color: TH.sub }}>{prog.progress}%</span>
                  <span style={{ fontSize: FONT_SUB, color: TH.sub }}>{prog.doneCount} {T('planCheckinDays')}</span>
                </div>
                {/* Frequency summary */}
                {(() => { const freq = item.frequency ?? { mode: 'daily' as const }; return (
                  <div style={{ fontSize: FONT_BADGE, color: P, marginTop: 4 }}>
                    {getFrequencySummary(freq, T, checkins, today)}
                  </div>
                ); })()}
                {/* Heatmap toggle */}
                <div
                  onClick={() => toggleHeatmap(item.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, cursor: 'pointer' }}
                >
                  <BarChart2 size={14} color={TH.sub} />
                  <span style={{ fontSize: FONT_BADGE, color: TH.sub }}>
                    {expandedHeatmaps.has(item.id) ? T('planHideHeatmap') : T('planShowHeatmap')}
                  </span>
                  {expandedHeatmaps.has(item.id)
                    ? <ChevronDown size={14} color={TH.sub} />
                    : <ChevronRight size={14} color={TH.sub} />}
                </div>
                {/* Item Heatmap */}
                {expandedHeatmaps.has(item.id) && (
                  <div style={{ marginTop: 8 }}>
                    <ItemHeatmap item={item} checkins={checkins} theme={store.theme} T={T} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Heatmap */}
      <div style={cs(TH)}>
        <div style={{ fontSize: FONT_BODY, fontWeight: 600, color: TH.text, marginBottom: 12 }}>{T('planHeatmap')}</div>
        <Heatmap checkins={checkins} items={items} plan={plan} theme={store.theme} T={T} />
      </div>
      </>
      ) : (
      /* TodoList tab */
      <>
        {/* Today stats card — only for in_progress plans */}
        {plan.status === 'in_progress' && (
          <>
            <div style={{ ...cs(TH), textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}>{T('planTodoToday')}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
                <span style={{ fontSize: FONT_STAT_SECTION, fontWeight: 800, color: P }}>{stats.totalDone}</span>
                <span style={{ fontSize: FONT_BODY, color: TH.sub }}>/ {stats.totalItems}</span>
              </div>
              <div style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 4 }}>{today}</div>
            </div>

            <div style={cs(TH)}>
              {todayItems.length === 0 && dailyCustomTodos.length === 0 ? (
                <div style={{ fontSize: FONT_EMPTY, color: TH.sub, textAlign: 'center', padding: 24 }}>{T('planNoItems')}</div>
              ) : (
                <>
                  {/* Plan items group header */}
                  {todayItems.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px 4px', fontSize: FONT_SUB, fontWeight: 600, color: TH.sub }}>
                      <ClipboardList size={14} />
                      {T('planTodoList')} ({todayItems.length})
                    </div>
                  )}
                  {/* Plan items */}
                  {todayItems.map((item, i, arr) => {
                    const status = statusMap.get(item.id);
                    const done = status?.done ?? false;
                    const autoChecked = status?.autoChecked ?? false;
                    return (
                      <div key={item.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 12px',
                        borderBottom: i < arr.length - 1 || dailyCustomTodos.length > 0 ? `1px solid ${TH.border}` : 'none',
                        opacity: autoChecked ? 0.7 : 1,
                      }}>
                        <div
                          role="checkbox"
                          aria-checked={done}
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleItem(item.id); } }}
                          style={{
                            width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, cursor: 'pointer',
                          }}
                          onClick={() => toggleItem(item.id)}
                        >
                          <div style={{
                            width: 22, height: 22, borderRadius: 6,
                            border: `2px solid ${done ? P : TH.border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: done ? P : 'transparent',
                            transition: 'all .2s',
                          }}>
                            {done && <Check size={14} color="#fff" />}
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: FONT_BODY, fontWeight: 500, color: TH.text,
                          }}>{item.name}</div>
                          {(() => { const freq = item.frequency ?? { mode: 'daily' as const }; return (
                            <div style={{ fontSize: FONT_TINY, color: P, marginTop: 1 }}>
                              {getFrequencySummary(freq, T, checkins, today)}
                            </div>
                          ); })()}
                          {item.description && (
                            <div style={{ fontSize: FONT_BADGE, color: TH.sub, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.description}
                            </div>
                          )}
                        </div>
                        {autoChecked && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 10, color: COLORS.GREEN, fontWeight: 500, flexShrink: 0 }}>
                            <CheckCircle2 size={10} /> {T('planAutoChecked')}
                          </span>
                        )}
                        <LinkBadge link={item.link} T={T} P={P} />
                      </div>
                    );
                  })}

                  {/* Custom todos group header */}
                  {dailyCustomTodos.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px 4px', borderTop: todayItems.length > 0 ? `1px solid ${TH.border}` : 'none', fontSize: FONT_SUB, fontWeight: 600, color: TH.sub }}>
                      <Pencil size={14} />
                      {T('planDailyCustomTodos')} ({dailyCustomTodos.length})
                    </div>
                  )}
                  {/* Custom todos */}
                  {dailyCustomTodos.map((todo, i, arr) => (
                    <div
                      key={todo.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 12px',
                        borderBottom: i < arr.length - 1 ? `1px solid ${TH.border}` : 'none',
                      }}
                    >
                      <div
                        role="checkbox"
                        aria-checked={todo.done}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleCustomTodo(todo.id); } }}
                        onClick={() => toggleCustomTodo(todo.id)}
                        style={{
                          width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, cursor: 'pointer',
                        }}
                      >
                        <div style={{
                          width: 22, height: 22, borderRadius: 6,
                          border: `2px solid ${todo.done ? P : TH.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: todo.done ? P : 'transparent',
                          transition: 'all .2s',
                        }}>
                          {todo.done && <Check size={14} color="#fff" />}
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          fontSize: FONT_BODY, fontWeight: 500, color: TH.text,
                        }}>{todo.name}</div>
                        {todo.recurring && <Repeat size={12} color={P} />}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(T('planDeleteCustomTodoConfirm'))) {
                            deleteCustomTodo(todo.id);
                          }
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
                      >
                        <Trash2 size={16} color={COLORS.RED} />
                      </button>
                    </div>
                  ))}
                </>
              )}

              {/* Add custom todo input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px', borderTop: todayItems.length > 0 || dailyCustomTodos.length > 0 ? `1px solid ${TH.border}` : 'none' }}>
                <input
                  type="text"
                  placeholder={T('planAddCustomTodoPlaceholder')}
                  value={newTodoName}
                  onChange={(e) => setNewTodoName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addCustomTodo();
                  }}
                  style={{
                    flex: 1, height: 36, border: `1px solid ${TH.border}`, borderRadius: 8,
                    padding: '0 10px', fontSize: FONT_SUB, color: TH.text, background: TH.bg,
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => setNewTodoRecurring(!newTodoRecurring)}
                  style={{
                    padding: '8px', background: newTodoRecurring ? `${P}15` : 'transparent',
                    border: `1px solid ${newTodoRecurring ? P : TH.border}`,
                    borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center',
                  }}
                >
                  <Repeat size={16} color={newTodoRecurring ? P : TH.sub} />
                </button>
                <button
                  onClick={addCustomTodo}
                  style={{
                    padding: '8px', background: P, color: '#fff', border: 'none',
                    borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center',
                  }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </>
        )}

        {/* History section */}
        <div style={{ marginTop: 24 }}>
          <div
            onClick={() => setShowHistory(v => !v)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showHistory ? 12 : 0, cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontWeight: 700, fontSize: FONT_TITLE, color: TH.text }}>{T('planTodoHistory')}</span>
              {showHistory ? <ChevronDown size={18} color={TH.text} /> : <ChevronRight size={18} color={TH.text} />}
            </div>
            <span style={{ fontSize: FONT_SUB, color: TH.sub }}>{historyGroups.length} {T('planDays')}</span>
          </div>

          {showHistory && (
            <>
              {historyGroups.length > 0 && (
                <div style={{ display: 'flex', background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 14, padding: '14px 0', marginBottom: 16 }}>
                  {[
                    { value: String(historySummary.totalDays), label: T('planDays') },
                    { value: String(historySummary.totalDoneItems), label: T('planTodoDone') },
                  ].map(s => (
                    <div key={s.label} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: FONT_STAT_CARD, fontWeight: 800, color: P }}>{s.value}</div>
                      <div style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {historyGroups.length === 0 ? (
                <div style={{ color: TH.sub, fontSize: FONT_EMPTY, textAlign: 'center', padding: 24 }}>{T('noHistory')}</div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: 20 }}>
                  <div style={{ position: 'absolute', left: 6, top: 6, bottom: 6, width: 2, background: TH.border, borderRadius: 1 }} />
                  {historyGroups.map((group) => {
                    const allItems = mergeHistoryItems(group);
                    const doneCount = allItems.filter(i => i.done).length;
                    const isExpanded = expandedDates.has(group.date);
                    return (
                      <div key={group.date} style={{ position: 'relative', marginBottom: 16 }}>
                        <div style={{ position: 'absolute', left: -17, top: 14, width: 10, height: 10, borderRadius: 5, background: P, border: `2px solid ${TH.bg}` }} />
                        <div style={{ background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 12, overflow: 'hidden' }}>
                          <div
                            onClick={() => toggleDateExpand(group.date)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: `${P}08`, cursor: 'pointer', borderBottom: isExpanded ? `1px solid ${TH.border}` : 'none' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {isExpanded ? <ChevronDown size={16} color={TH.text} /> : <ChevronRight size={16} color={TH.text} />}
                              <span style={{ fontSize: FONT_BODY, fontWeight: 600, color: TH.text }}>{group.date}</span>
                            </div>
                            <span style={{ fontSize: FONT_BODY, color: P, fontWeight: 700 }}>{doneCount} {T('planTodoDone')}</span>
                          </div>
                          {isExpanded && allItems.map((item, i) => (
                            <div key={item.id} style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '8px 14px',
                              borderTop: i > 0 ? `1px solid ${TH.border}` : 'none',
                              opacity: item.done ? 1 : 0.5,
                            }}>
                              <div style={{
                                width: 18, height: 18, borderRadius: 4,
                                background: item.done ? P : `${TH.border}80`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                {item.done && <Check size={10} color="#fff" />}
                              </div>
                              <span style={{
                                fontSize: FONT_BODY, color: TH.text, flex: 1,
                                textDecoration: item.done ? 'line-through' : 'none',
                              }}>{item.name}</span>
                              {item.type === 'plan' && <LinkBadge link={item.link as PlanItemLink} T={T} P={P} />}
                              {item.type === 'custom' && (
                                <span style={{ fontSize: 10, color: P, fontWeight: 500, background: `${P}15`, padding: '2px 6px', borderRadius: 4 }}>
                                  {T('planDailyCustomTodos')}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </>
      )}

      {/* Action buttons — only on detail tab */}
      {tab === 'detail' && (editable || pausable || resumable || cancellable || completable || deletable) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
          {editable && (
            <button onClick={() => overlay.switch('planCreate', { planId: plan.id })}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 0', borderRadius: 12, border: `1px solid ${TH.border}`, background: TH.card, color: TH.text, fontSize: FONT_BODY, fontWeight: 600, cursor: 'pointer' }}>
              <Pencil size={16} /> {T('commonEdit')}
            </button>
          )}
          {pausable && (
            <button onClick={handlePause}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 0', borderRadius: 12, border: 'none', background: COLORS.YELLOW, color: '#fff', fontSize: FONT_BODY, fontWeight: 600, cursor: 'pointer' }}>
              <Pause size={16} /> {T('planPause')}
            </button>
          )}
          {resumable && (
            <button onClick={handleResume}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 0', borderRadius: 12, border: 'none', background: COLORS.GREEN, color: '#fff', fontSize: FONT_BODY, fontWeight: 600, cursor: 'pointer' }}>
              <Play size={16} /> {T('planResume')}
            </button>
          )}
          {cancellable && (
            <button onClick={handleCancel}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 0', borderRadius: 12, border: `1px solid ${COLORS.RED}30`, background: `${COLORS.RED}15`, color: COLORS.RED, fontSize: FONT_BODY, fontWeight: 600, cursor: 'pointer' }}>
              <XCircle size={16} /> {T('planCancelPlan')}
            </button>
          )}
          {completable && (
            <button onClick={handleComplete}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 0', borderRadius: 12, border: 'none', background: P, color: '#fff', fontSize: FONT_BODY, fontWeight: 600, cursor: 'pointer' }}>
              <CircleCheck size={16} /> {T('planComplete')}
            </button>
          )}
          {deletable && (
            <button onClick={handleDelete}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 0', borderRadius: 12, border: `1px solid ${COLORS.RED}30`, background: `${COLORS.RED}15`, color: COLORS.RED, fontSize: FONT_BODY, fontWeight: 600, cursor: 'pointer' }}>
              <Trash2 size={16} /> {T('planDelete')}
            </button>
          )}
        </div>
      )}
    </>
  );
}
