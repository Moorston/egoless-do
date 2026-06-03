'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { THEMES, COLORS, LINK_COLORS, getPlanItems, PRIORITY_OPTIONS, isPlanDelayed, canDeletePlan, canEditPlan, FONT_BODY, FONT_BUTTON, FONT_TITLE, FONT_SUB, FONT_BADGE, FONT_BACK, FONT_STAT_CARD, FONT_STAT_SECTION, FONT_EMPTY, dateStr } from '@egoless-do/core';
import type { Plan, PlanItem, PlanItemCheckin, PlanStatus, PlanItemLink, DailyCustomTodo, DailyTodoHistory } from '@egoless-do/core';
import { useDailyTodo } from './useDailyTodo';
import { useT, cs } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { ChevronLeft, Check, ChevronDown, ChevronRight, ClipboardList, Pencil, CircleCheck, Play, Pause, XCircle, Trash2, CheckCircle2, Plus } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  not_started: COLORS.GRAY, in_progress: COLORS.GREEN, paused: COLORS.YELLOW,
  completed: COLORS.BLUE, cancelled: COLORS.RED, delayed: COLORS.ORANGE,
};

function StatusLabel({ status, T }: { status: string; T: (k: string) => string }) {
  const key = `planStatus${status.charAt(0).toUpperCase() + status.slice(1).replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())}`;
  return (
    <span style={{
      fontSize: FONT_BADGE, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
      background: `${STATUS_COLORS[status]}20`, color: STATUS_COLORS[status],
    }}>{T(key)}</span>
  );
}

function LinkBadge({ link, T, P }: { link: PlanItemLink; T: (k: string) => string; P: string }) {
  if (link === 'manual') return null;
  const color = LINK_COLORS[link] ?? P;
  return (
    <span style={{ fontSize: 10, color, background: `${color}15`, padding: '2px 6px', borderRadius: 4, fontWeight: 500 }}>
      {T(`planLink${link.charAt(0).toUpperCase() + link.slice(1)}`)}
    </span>
  );
}

function ProgressRing({ progress, size = 64, strokeWidth = 6, color }: { progress: number; size?: number; strokeWidth?: number; color: string }) {
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
}

function Heatmap({ checkins, items, plan, theme, T }: { checkins: PlanItemCheckin[]; items: PlanItem[]; plan: Plan; theme: string; T: (k: string) => string }) {
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

  const weekLabels = [
    T('weekdaySun'), T('weekdayMon'), T('weekdayTue'), T('weekdayWed'),
    T('weekdayThu'), T('weekdayFri'), T('weekdaySat'),
  ];

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
}

export default function PlanDetailContent({ planId, onClose }: { planId: string; onClose: () => void }) {
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const T = useT();

  // 日期状态，支持跨天自动刷新
  const [today, setToday] = useState(() => dateStr());
  const todayRef = useRef(today);

  // 检测日期变化
  useEffect(() => {
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

    // 监听页面可见性变化
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkDateChange();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 每分钟检查一次日期变化
    const interval = setInterval(checkDateChange, 60000);

    // 组件挂载时也检查一次
    checkDateChange();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
      if (confirm(`该计划中有 ${result.linkedReflectionCount} 个任务关联了感念，无法执行此操作。\n\n是否批量解绑关联的感念任务？`)) {
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
            const clampedToday = today > item.endDate ? item.endDate : today;
            const itemCheckins = checkins.filter(c => c.planItemId === item.id && c.done && c.date >= item.startDate && c.date <= clampedToday);
            const itemProgress = computeItemProgressRealtime(item);
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
                    <div style={{ height: 4, width: `${itemProgress}%`, background: P, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: FONT_SUB, color: TH.sub }}>{itemProgress}%</span>
                  <span style={{ fontSize: FONT_SUB, color: TH.sub }}>{itemCheckins.length} {T('planCheckinDays')}</span>
                </div>
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
                <span style={{ fontSize: FONT_STAT_SECTION, fontWeight: 800, color: COLORS.GREEN }}>{stats.totalDone}</span>
                <span style={{ fontSize: FONT_BODY, color: TH.sub }}>/ {stats.totalItems}</span>
              </div>
              <div style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 4 }}>{today}</div>
            </div>

            {stats.totalItems > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, padding: '0 4px' }}>
                <span style={{ fontSize: FONT_SUB, color: TH.sub, whiteSpace: 'nowrap' }}>{stats.totalDone}/{stats.totalItems} {T('planProgress')}</span>
                <div style={{ flex: 1, height: 4, background: TH.border, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: 4, width: `${stats.progressPercent}%`, background: COLORS.GREEN, borderRadius: 2, transition: 'width .3s' }} />
                </div>
              </div>
            )}

            <div style={cs(TH)}>
              {todayItems.length === 0 && dailyCustomTodos.length === 0 ? (
                <div style={{ fontSize: FONT_EMPTY, color: TH.sub, textAlign: 'center', padding: 24 }}>{T('planNoItems')}</div>
              ) : (
                <>
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
                        cursor: 'pointer',
                        opacity: autoChecked ? 0.7 : 1,
                      }}
                        onClick={() => toggleItem(item.id)}
                      >
                        <div style={{
                          width: 36, height: 20, borderRadius: 10,
                          border: `2px solid ${done ? COLORS.GREEN : TH.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: done ? COLORS.GREEN : 'transparent', flexShrink: 0,
                          transition: 'all .2s',
                        }}>
                          <div style={{
                            width: 12, height: 12, borderRadius: 6,
                            background: '#fff',
                            transform: done ? 'translateX(8px)' : 'translateX(-8px)',
                            transition: 'transform .2s',
                          }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: FONT_BODY, fontWeight: 500, color: done ? TH.sub : TH.text,
                            textDecoration: done ? 'line-through' : 'none',
                          }}>{item.name}</div>
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
                        onClick={() => toggleCustomTodo(todo.id)}
                        style={{
                          width: 36, height: 20, borderRadius: 10,
                          border: `2px solid ${todo.done ? COLORS.GREEN : TH.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: todo.done ? COLORS.GREEN : 'transparent', flexShrink: 0,
                          transition: 'all .2s', cursor: 'pointer',
                        }}
                      >
                        <div style={{
                          width: 12, height: 12, borderRadius: 6,
                          background: '#fff',
                          transform: todo.done ? 'translateX(8px)' : 'translateX(-8px)',
                          transition: 'transform .2s',
                        }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: FONT_BODY, fontWeight: 500, color: todo.done ? TH.sub : TH.text,
                          textDecoration: todo.done ? 'line-through' : 'none',
                        }}>{todo.name}</div>
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
                <div style={{ color: TH.sub, fontSize: FONT_EMPTY, textAlign: 'center', padding: 24 }}>{T('foodNoHistory')}</div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: 20 }}>
                  <div style={{ position: 'absolute', left: 6, top: 6, bottom: 6, width: 2, background: TH.border, borderRadius: 1 }} />
                  {historyGroups.map((group) => {
                    const allItems = mergeHistoryItems(group);
                    const doneCount = allItems.filter(i => i.done).length;
                    return (
                      <div key={group.date} style={{ position: 'relative', marginBottom: 16 }}>
                        <div style={{ position: 'absolute', left: -17, top: 14, width: 10, height: 10, borderRadius: 5, background: P, border: `2px solid ${TH.bg}` }} />
                        <div style={{ background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 12, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: `1px solid ${TH.border}`, background: `${P}08` }}>
                            <span style={{ fontSize: FONT_BODY, fontWeight: 600, color: TH.text }}>{group.date}</span>
                            <span style={{ fontSize: FONT_BODY, color: P, fontWeight: 700 }}>{doneCount} {T('planTodoDone')}</span>
                          </div>
                          {allItems.map((item, i) => (
                            <div key={i} style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '8px 14px',
                              borderTop: i > 0 ? `1px solid ${TH.border}` : 'none',
                              opacity: item.done ? 1 : 0.5,
                            }}>
                              <div style={{
                                width: 18, height: 18, borderRadius: 4,
                                background: item.done ? COLORS.GREEN : `${TH.border}80`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                {item.done && <Check size={10} color="#fff" />}
                              </div>
                              <span style={{
                                fontSize: FONT_BODY, color: TH.text, flex: 1,
                                textDecoration: item.done ? 'none' : 'line-through',
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
            <button onClick={() => {/* open edit overlay */}}
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
