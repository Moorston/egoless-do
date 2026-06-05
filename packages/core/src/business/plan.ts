// ─── Plan business logic (pure functions) ─────────────────────
import type {
  Plan, PlanStatus, PlanItem, PlanItemStatus, PlanItemCheckin, PlanItemLink, PlanItemPriority,
  Habit, FastingSession, MedHistoryEntry, ExerciseEntry, CheckinEntry, DailyCustomTodo, DailyTodoHistory,
  MindReflection,
} from '../types';
import { uid, dateStr } from '../utils';

// ── Helpers ───────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

// ── Permission helpers ────────────────────────────────────────

export function canDeletePlan(status: PlanStatus): boolean {
  return status === 'not_started' || status === 'cancelled';
}

export function canEditPlan(status: PlanStatus): boolean {
  return status === 'not_started' || status === 'in_progress' || status === 'paused';
}

export function isPlanActive(status: PlanStatus): boolean {
  return status === 'not_started' || status === 'in_progress' || status === 'paused';
}

export function isPlanDelayed(plan: Plan, today?: string): boolean {
  if (plan.status !== 'in_progress') return false;
  const t = today ?? dateStr();
  return plan.endDate < t;
}

// ── Plan CRUD ─────────────────────────────────────────────────

export function addPlan(plans: Plan[], form: {
  name: string; goal: string; slogan?: string;
  startDate: string; endDate: string;
}, today?: string): { plans: Plan[]; planId: string } | null {
  const id = uid();
  const now = today ?? new Date().toISOString().slice(0, 10);
  const willBeActive = form.startDate <= now;
  // Check if there's already an active plan when creating an active plan
  if (willBeActive) {
    const hasActive = plans.some(p => !p.deleted && isPlanActive(p.status));
    if (hasActive) return null;
  }
  const status: PlanStatus = willBeActive ? 'in_progress' : 'not_started';
  const p: Plan = {
    id,
    name: form.name,
    goal: form.goal,
    slogan: form.slogan ?? '',
    startDate: form.startDate,
    endDate: form.endDate,
    status,
    progress: 0,
    updatedAt: Date.now(),
    deleted: false,
  };
  return { plans: [...plans, p], planId: id };
}

export function updatePlan(plans: Plan[], id: string, patch: Partial<Plan>): Plan[] {
  const plan = plans.find(p => p.id === id);
  if (!plan) return plans;
  // Don't allow changing status directly via updatePlan (use dedicated status functions)
  if (patch.status && patch.status !== plan.status) return plans;
  // Don't allow editing completed or cancelled plans
  if (plan.status === 'completed' || plan.status === 'cancelled') return plans;
  return plans.map(p => p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p);
}

export function deletePlan(plans: Plan[], id: string): Plan[] {
  return plans.map(p => p.id === id ? { ...p, deleted: true, updatedAt: Date.now() } : p);
}

// ── Plan status operations ────────────────────────────────────

export function startPlan(plans: Plan[], planItems: PlanItem[], id: string): { plans: Plan[]; planItems: PlanItem[] } {
  const now = Date.now();
  const plan = plans.find(p => p.id === id);
  if (!plan || plan.status !== 'not_started') return { plans, planItems };
  // Check if there's already another active plan
  const hasActive = plans.some(p => p.id !== id && !p.deleted && isPlanActive(p.status));
  if (hasActive) return { plans, planItems };
  return {
    plans: plans.map(p => p.id === id ? { ...p, status: 'in_progress' as PlanStatus, updatedAt: now } : p),
    planItems: planItems.map(i => i.planId === id && i.status === 'not_started'
      ? { ...i, status: 'in_progress' as PlanItemStatus, updatedAt: now } : i),
  };
}

export function pausePlan(plans: Plan[], planItems: PlanItem[], id: string): { plans: Plan[]; planItems: PlanItem[] } {
  const now = Date.now();
  const plan = plans.find(p => p.id === id);
  if (!plan || plan.status !== 'in_progress') return { plans, planItems };
  return {
    plans: plans.map(p => p.id === id ? { ...p, status: 'paused' as PlanStatus, updatedAt: now } : p),
    planItems: planItems.map(i => i.planId === id && i.status === 'in_progress'
      ? { ...i, status: 'paused' as PlanItemStatus, updatedAt: now } : i),
  };
}

export function resumePlan(plans: Plan[], planItems: PlanItem[], id: string): { plans: Plan[]; planItems: PlanItem[] } {
  const now = Date.now();
  const plan = plans.find(p => p.id === id);
  if (!plan || plan.status !== 'paused') return { plans, planItems };
  // Check if there's already another active plan
  const hasActive = plans.some(p => p.id !== id && !p.deleted && isPlanActive(p.status));
  if (hasActive) return { plans, planItems };
  return {
    plans: plans.map(p => p.id === id ? { ...p, status: 'in_progress' as PlanStatus, updatedAt: now } : p),
    planItems: planItems.map(i => i.planId === id && i.status === 'paused'
      ? { ...i, status: 'in_progress' as PlanItemStatus, updatedAt: now } : i),
  };
}

export function completePlan(plans: Plan[], planItems: PlanItem[], id: string): { plans: Plan[]; planItems: PlanItem[] } {
  const now = Date.now();
  const plan = plans.find(p => p.id === id);
  if (!plan || plan.status === 'completed' || plan.status === 'cancelled') return { plans, planItems };
  const progress = computePlanProgress(plan, planItems);
  return {
    plans: plans.map(p => p.id === id ? { ...p, status: 'completed' as PlanStatus, progress, updatedAt: now } : p),
    planItems: planItems.map(i => i.planId === id && (i.status === 'in_progress' || i.status === 'paused' || i.status === 'delayed')
      ? { ...i, status: 'completed' as PlanItemStatus, updatedAt: now } : i),
  };
}

export function cancelPlan(plans: Plan[], planItems: PlanItem[], id: string): { plans: Plan[]; planItems: PlanItem[] } {
  const now = Date.now();
  const plan = plans.find(p => p.id === id);
  if (!plan || plan.status === 'completed' || plan.status === 'cancelled') return { plans, planItems };
  return {
    plans: plans.map(p => p.id === id ? { ...p, status: 'cancelled' as PlanStatus, updatedAt: now } : p),
    planItems: planItems.map(i => i.planId === id && (i.status === 'in_progress' || i.status === 'paused' || i.status === 'delayed')
      ? { ...i, status: 'cancelled' as PlanItemStatus, updatedAt: now } : i),
  };
}

/** Auto-detect status changes: not_started→in_progress when startDate arrives, mark overdue items */
export function checkAutoStatus(plans: Plan[], planItems: PlanItem[], today: string): { plans: Plan[]; planItems: PlanItem[]; delayedPlans: Plan[] } {
  let plansChanged = false;
  let itemsChanged = false;
  const delayedPlans: Plan[] = [];

  const updatedPlans = plans.map(p => {
    if (p.deleted) return p;
    // Auto-start: not_started → in_progress when startDate arrives
    if (p.status === 'not_started' && p.startDate <= today) {
      const hasActive = plans.some(other => other.id !== p.id && !other.deleted && isPlanActive(other.status));
      if (hasActive) return p;
      plansChanged = true;
      return { ...p, status: 'in_progress' as PlanStatus, updatedAt: Date.now() };
    }
    // Mark paused plans as delayed if endDate has passed (keep paused status, just update timestamp)
    if (p.status === 'paused' && p.endDate < today) {
      plansChanged = true;
      return { ...p, updatedAt: Date.now() };
    }
    // Detect delayed plans: in_progress but endDate has passed
    if (p.status === 'in_progress' && p.endDate < today && !p.lastDelayedNotifyAt) {
      delayedPlans.push(p);
    }
    return p;
  });

  const updatedItems = planItems.map(item => {
    if (item.deleted) return item;
    const plan = updatedPlans.find(p => p.id === item.planId);
    if (!plan || plan.deleted) return item;

    // Auto-start items when plan is in_progress and startDate arrives
    if (item.status === 'not_started' && plan.status === 'in_progress' && item.startDate <= today) {
      itemsChanged = true;
      return { ...item, status: 'in_progress' as PlanItemStatus, updatedAt: Date.now() };
    }

    // Mark overdue items as delayed
    if (item.status === 'in_progress' && item.endDate < today) {
      itemsChanged = true;
      return { ...item, status: 'delayed' as PlanItemStatus, updatedAt: Date.now() };
    }

    return item;
  });

  return { plans: plansChanged ? updatedPlans : plans, planItems: itemsChanged ? updatedItems : planItems, delayedPlans };
}

/** Alias for compatibility */
export const checkPlanAutoStatus = checkAutoStatus;

/** Perform daily reset: auto-start tasks and save previous day's history */
export function performDailyReset(
  plans: Plan[],
  planItems: PlanItem[],
  planItemCheckins: PlanItemCheckin[],
  dailyCustomTodos: DailyCustomTodo[],
  dailyTodoHistory: DailyTodoHistory[],
  previousDate: string,
  today: string,
): {
  plans: Plan[];
  planItems: PlanItem[];
  dailyTodoHistory: DailyTodoHistory[];
  hasChanges: boolean;
  delayedPlans: Plan[];
} {
  // 1. Auto-start tasks
  const { plans: updatedPlans, planItems: updatedPlanItems, delayedPlans } = checkAutoStatus(plans, planItems, today);

  // 2. Save previous day's history for all active plans
  let updatedHistory = [...dailyTodoHistory];
  const activePlans = updatedPlans.filter(p => !p.deleted && isPlanActive(p.status));

  for (const plan of activePlans) {
    // Check if history already exists for this date
    const existingHistory = updatedHistory.find(h => h.planId === plan.id && h.date === previousDate && !h.deleted);
    if (!existingHistory) {
      updatedHistory = saveDailyTodoHistory(updatedHistory, plan.id, previousDate, updatedPlanItems, planItemCheckins, dailyCustomTodos);
    }
  }

  const plansChanged = updatedPlans !== plans;
  const itemsChanged = updatedPlanItems !== planItems;
  const historyChanged = updatedHistory.length !== dailyTodoHistory.length ||
    updatedHistory.some((h, i) => h !== dailyTodoHistory[i]);

  return {
    plans: updatedPlans,
    planItems: updatedPlanItems,
    dailyTodoHistory: updatedHistory,
    hasChanges: plansChanged || itemsChanged || historyChanged,
    delayedPlans,
  };
}

// ── PlanItem CRUD ─────────────────────────────────────────────

export function addPlanItem(planItems: PlanItem[], form: {
  planId: string; name: string; description?: string;
  startDate: string; endDate: string; contentUrl?: string;
  link?: PlanItemLink; priority?: PlanItemPriority; targetMetric?: string; linkConfig?: PlanItem['linkConfig']; order?: number;
}, plans?: Plan[], today?: string): PlanItem[] {
  // Check if the plan is active (not completed or cancelled)
  if (plans) {
    const plan = plans.find(p => p.id === form.planId);
    if (!plan || plan.deleted || plan.status === 'completed' || plan.status === 'cancelled') return planItems;
  }
  const now = today ?? new Date().toISOString().slice(0, 10);
  const status: PlanItemStatus = form.startDate <= now ? 'in_progress' : 'not_started';
  const item: PlanItem = {
    id: uid(),
    planId: form.planId,
    name: form.name,
    description: form.description ?? '',
    startDate: form.startDate,
    endDate: form.endDate,
    contentUrl: form.contentUrl ?? '',
    totalCheckinDays: 0,
    status,
    progress: 0,
    link: form.link ?? 'manual',
    priority: form.priority ?? 'medium',
    targetMetric: form.targetMetric ?? '',
    linkConfig: form.linkConfig,
    order: form.order ?? 0,
    updatedAt: Date.now(),
    deleted: false,
  };
  return [...planItems, item];
}

export function updatePlanItem(planItems: PlanItem[], id: string, patch: Partial<PlanItem>): PlanItem[] {
  return planItems.map(i => i.id === id ? { ...i, ...patch, updatedAt: Date.now() } : i);
}

export function deletePlanItem(planItems: PlanItem[], id: string): PlanItem[] {
  return planItems.map(i => i.id === id ? { ...i, deleted: true, updatedAt: Date.now() } : i);
}

/** Create a plan item from a reflection */
export function createPlanItemFromReflection(
  reflection: { id: string; content: string; tags: string[] },
  planId: string,
  startDate: string,
  endDate: string,
  priority: PlanItemPriority = 'medium',
  name?: string,
  description?: string,
  targetMetric?: string,
): Omit<PlanItem, 'id' | 'updatedAt' | 'deleted'> {
  const lines = reflection.content.split('\n').filter(l => l.trim());
  const defaultName = lines[0]?.slice(0, 50) || reflection.content.slice(0, 50);
  const defaultDescription = lines.length > 1 ? lines.slice(1).join('\n') : reflection.content;
  const defaultTargetMetric = reflection.tags.length > 0 ? `关联标签: ${reflection.tags.join(', ')}` : '';

  // 如果开始日期是今天或更早，默认状态为进行中
  const today = dateStr();
  const status: PlanItemStatus = startDate <= today ? 'in_progress' : 'not_started';

  return {
    planId,
    name: name || defaultName,
    description: description || defaultDescription,
    startDate,
    endDate,
    contentUrl: '',
    totalCheckinDays: 0,
    status,
    progress: 0,
    link: 'reflection',
    priority,
    targetMetric: targetMetric || defaultTargetMetric,
    reflectionId: reflection.id,
    order: 0,
  };
}

/** Check if a plan can be archived/cancelled/deleted (no linked reflections) */
export function canArchivePlan(
  planId: string,
  planItems: PlanItem[],
): { allowed: boolean; linkedReflectionCount: number } {
  const linkedCount = planItems.filter(
    i => !i.deleted && i.planId === planId && i.reflectionId
  ).length;
  return { allowed: linkedCount === 0, linkedReflectionCount: linkedCount };
}

/** Unlink all reflections from plan items in a plan */
export function unlinkAllReflectionsFromPlan(
  planItems: PlanItem[],
  planId: string,
): PlanItem[] {
  const now = Date.now();
  return planItems.map(i =>
    i.planId === planId && i.reflectionId
      ? { ...i, reflectionId: undefined, updatedAt: now }
      : i
  );
}

// ── PlanItemCheckin ───────────────────────────────────────────

export function checkinItem(checkins: PlanItemCheckin[], planItemId: string, date: string, linkedModule?: string): PlanItemCheckin[] {
  const existing = checkins.find(c => c.planItemId === planItemId && c.date === date);
  if (existing) {
    return checkins.map(c =>
      c.planItemId === planItemId && c.date === date
        ? { ...c, done: true, linkedModule, updatedAt: Date.now() }
        : c
    );
  }
  return [...checkins, { id: uid(), planItemId, date, done: true, linkedModule, updatedAt: Date.now(), deleted: false }];
}

export function uncheckinItem(checkins: PlanItemCheckin[], planItemId: string, date: string): PlanItemCheckin[] {
  const existing = checkins.find(c => c.planItemId === planItemId && c.date === date);
  if (existing) {
    return checkins.map(c =>
      c.planItemId === planItemId && c.date === date
        ? { ...c, done: false, updatedAt: Date.now() }
        : c
    );
  }
  return checkins;
}

// ── Module sync ───────────────────────────────────────────────

interface ModuleState {
  habits: Habit[];
  fastingHistory: FastingSession[];
  activeFasting: FastingSession | null;
  medHistory: MedHistoryEntry[];
  exerciseLog: ExerciseEntry[];
  checkinHistory: CheckinEntry[];
  reflections: MindReflection[];
}

/** Sync plan items from linked modules — auto-check items whose link condition is met */
export function syncPlanItemsFromModules(
  planItems: PlanItem[],
  checkins: PlanItemCheckin[],
  plans: Plan[],
  state: ModuleState,
  today: string,
): PlanItemCheckin[] {
  let result = [...checkins];

  for (const plan of plans) {
    if (plan.deleted || plan.status !== 'in_progress') continue;

    const items = planItems.filter(i => i.planId === plan.id && !i.deleted);
    for (const item of items) {
      if (item.status !== 'in_progress') continue;
      if (today < item.startDate || today > item.endDate) continue;

      const alreadyDone = result.some(c => c.planItemId === item.id && c.date === today && c.done);
      if (alreadyDone) continue;

      let linkedDone = false;
      switch (item.link) {
        case 'checkin':
          linkedDone = state.checkinHistory.some(c => c.date === today && c.done && !c.deleted);
          break;
        case 'fasting': {
          const targetHours = item.linkConfig?.targetHours ?? 16;
          linkedDone = state.fastingHistory.some(f => {
            if (!f.endedAt) return false;
            return dateStr(new Date(f.endedAt)) === today && (f.endedAt - f.startedAt) / 3600000 >= targetHours;
          }) || (state.activeFasting != null && dateStr(new Date(state.activeFasting.startedAt)) === today);
          break;
        }
        case 'meditation':
          linkedDone = state.medHistory.some(m => m.date === today && !m.deleted);
          break;
        case 'exercise': {
          const minMinutes = item.linkConfig?.targetMinutes ?? 30;
          linkedDone = state.exerciseLog.some(e => {
            if (e.deleted) return false;
            return dateStr(new Date(e.timestamp)) === today && e.durationSec >= minMinutes * 60;
          });
          break;
        }
        case 'habit':
          linkedDone = state.habits.some(h =>
            !h.deleted && h.id === item.linkConfig?.habitId && h.checkedDates.includes(today)
          );
          break;
        case 'reflection':
          // 感念关联任务不自动打卡，需手动完成
          break;
        case 'manual':
        default:
          break;
      }

      if (linkedDone) {
        result = checkinItem(result, item.id, today, item.link);
      }
    }
  }
  return result;
}

// ── Progress computation ──────────────────────────────────────

export function computeItemProgress(item: PlanItem, checkins: PlanItemCheckin[], today: string): number {
  const totalDays = daysBetween(item.startDate, item.endDate) + 1;
  if (totalDays <= 0) return 0;

  const clampedToday = today > item.endDate ? item.endDate : today;
  const doneCount = checkins.filter(c =>
    c.planItemId === item.id && c.done && c.date >= item.startDate && c.date <= clampedToday
  ).length;

  return Math.min(Math.round((doneCount / totalDays) * 100), 100);
}

export function computePlanProgress(plan: Plan, planItems: PlanItem[]): number {
  const items = planItems.filter(i => i.planId === plan.id && !i.deleted);
  if (items.length === 0) {
    // Time-based fallback
    const totalDays = daysBetween(plan.startDate, plan.endDate) + 1;
    if (totalDays <= 0) return 0;
    const today = dateStr(new Date());
    const clampedToday = today > plan.endDate ? plan.endDate : today;
    const elapsed = daysBetween(plan.startDate, clampedToday) + 1;
    return Math.max(0, Math.min(Math.round((elapsed / totalDays) * 100), 100));
  }
  const total = items.reduce((s, i) => s + i.progress, 0);
  return Math.round(total / items.length);
}

// ── Query helpers ─────────────────────────────────────────────

export function getActivePlan(plans: Plan[]): Plan | null {
  return plans.find(p => !p.deleted && isPlanActive(p.status)) ?? null;
}

export function getPlanItems(planItems: PlanItem[], planId: string): PlanItem[] {
  return planItems.filter(i => i.planId === planId && !i.deleted).sort((a, b) => a.order - b.order);
}

export function getTodayItems(planItems: PlanItem[], plan: Plan, today: string): PlanItem[] {
  return planItems
    .filter(i => !i.deleted && i.planId === plan.id
      && (i.status === 'in_progress' || i.status === 'delayed')
      && today >= i.startDate && today <= i.endDate)
    .sort((a, b) => a.order - b.order);
}

export function getHistoryPlans(plans: Plan[]): Plan[] {
  return plans
    .filter(p => !p.deleted)
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

/** Update totalCheckinDays and progress for plan items based on checkins */
export function refreshPlanItemStats(planItems: PlanItem[], checkins: PlanItemCheckin[], today: string): PlanItem[] {
  return planItems.map(item => {
    if (item.deleted) return item;
    const doneCount = checkins.filter(c =>
      c.planItemId === item.id && c.done && c.date >= item.startDate && c.date <= today
    ).length;
    const progress = computeItemProgress(item, checkins, today);
    if (item.totalCheckinDays !== doneCount || item.progress !== progress) {
      return { ...item, totalCheckinDays: doneCount, progress, updatedAt: Date.now() };
    }
    return item;
  });
}

// ── DailyCustomTodo ─────────────────────────────────────────

export function addDailyCustomTodo(todos: DailyCustomTodo[], planId: string, name: string, date: string): DailyCustomTodo[] {
  const existingTodos = todos.filter(t => t.planId === planId && t.date === date && !t.deleted);
  const maxOrder = existingTodos.reduce((max, t) => Math.max(max, t.order), -1);
  const todo: DailyCustomTodo = {
    id: uid(),
    planId,
    date,
    name,
    done: false,
    order: maxOrder + 1,
    updatedAt: Date.now(),
    deleted: false,
  };
  return [...todos, todo];
}

export function toggleDailyCustomTodo(todos: DailyCustomTodo[], id: string, date: string): DailyCustomTodo[] {
  return todos.map(t => {
    if (t.id !== id || t.date !== date) return t;
    return { ...t, done: !t.done, updatedAt: Date.now() };
  });
}

export function deleteDailyCustomTodo(todos: DailyCustomTodo[], id: string): DailyCustomTodo[] {
  return todos.map(t => t.id === id ? { ...t, deleted: true, updatedAt: Date.now() } : t);
}

export function getTodayCustomTodos(todos: DailyCustomTodo[], planId: string, date: string): DailyCustomTodo[] {
  return todos
    .filter(t => t.planId === planId && t.date === date && !t.deleted)
    .sort((a, b) => a.order - b.order);
}

// ── DailyTodoHistory ─────────────────────────────────────────

export function saveDailyTodoHistory(
  history: DailyTodoHistory[],
  planId: string,
  date: string,
  planItems: PlanItem[],
  planItemCheckins: PlanItemCheckin[],
  dailyCustomTodos: DailyCustomTodo[],
): DailyTodoHistory[] {
  // 检查是否已经存在该日期的历史记录
  const existingIndex = history.findIndex(h => h.planId === planId && h.date === date && !h.deleted);

  // 获取当天的计划任务完成情况
  const todayPlanItems = planItems
    .filter(i => !i.deleted && i.planId === planId && date >= i.startDate && date <= i.endDate)
    .map(i => ({
      id: i.id,
      name: i.name,
      link: i.link,
      done: planItemCheckins.some(c => c.planItemId === i.id && c.date === date && c.done),
    }));

  // 获取当天的自定义待办完成情况
  const todayCustomTodos = dailyCustomTodos
    .filter(t => t.planId === planId && t.date === date && !t.deleted)
    .map(t => ({
      id: t.id,
      name: t.name,
      done: t.done,
    }));

  const historyEntry: DailyTodoHistory = {
    id: existingIndex >= 0 ? history[existingIndex].id : uid(),
    planId,
    date,
    planItems: todayPlanItems,
    customTodos: todayCustomTodos,
    updatedAt: Date.now(),
    deleted: false,
  };

  if (existingIndex >= 0) {
    return history.map((h, i) => i === existingIndex ? historyEntry : h);
  }
  return [...history, historyEntry];
}

export function getTodoHistory(history: DailyTodoHistory[], planId: string, excludeDate?: string): DailyTodoHistory[] {
  return history
    .filter(h => h.planId === planId && !h.deleted && h.date !== excludeDate)
    .sort((a, b) => b.date.localeCompare(a.date));
}
