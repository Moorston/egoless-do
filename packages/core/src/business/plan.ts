// ─── Plan business logic (pure functions) ─────────────────────
import type {
  Plan, PlanStatus, PlanItem, PlanItemStatus, PlanItemCheckin, PlanItemLink, PlanItemPriority,
  Habit, FastingSession, MedHistoryEntry, ExerciseEntry, CheckinEntry, DailyCustomTodo, DailyTodoHistory,
  MindReflection, CheckinFrequency,
  PlanItemSource, UnifiedPlanItemForm,
} from '../types';
import { uid, dateStr, activeOnly, parseDateParts, addDays } from '../utils';
import { COLORS } from '../constants';
import { computeMaxFastingHours, computeMaxExerciseMinutes } from './module-state';

// ── Constants ─────────────────────────────────────────────────

export const WEEKDAY_LABELS: readonly string[] = ['weekdaySun', 'weekdayMon', 'weekdayTue', 'weekdayWed', 'weekdayThu', 'weekdayFri', 'weekdaySat'];

export const PLAN_STATUS_COLORS: Record<string, string> = {
  not_started: COLORS.GRAY, in_progress: COLORS.GREEN, paused: COLORS.YELLOW,
  completed: COLORS.BLUE, cancelled: COLORS.RED, delayed: COLORS.ORANGE,
};

export function statusToI18nKey(status: string): string {
  return `planStatus${status.charAt(0).toUpperCase() + status.slice(1).replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())}`;
}

/**
 * Get a human-readable summary string for a check-in frequency.
 * Pure function – no platform dependencies.
 *
 * @param freq   The frequency configuration
 * @param T      i18n translation function (key → string)
 * @param checkins  All non-deleted plan-item checkins (used for weekly "done this week" count)
 * @param today     Current date string (YYYY-MM-DD)
 * @param itemId    Optional plan-item id to scope checkin counting
 */
export function getFrequencySummary(
  freq: CheckinFrequency,
  T: (k: string) => string,
  checkins: PlanItemCheckin[],
  today: string,
  itemId?: string,
): string {
  switch (freq.mode) {
    case 'daily':
      return T('freqSummaryDaily');
    case 'interval':
      return T('freqSummaryInterval').replace('{n}', String(freq.every));
    case 'weekly': {
      const d = new Date(today + 'T00:00:00');
      const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      const diffToMon = day === 0 ? 6 : day - 1;
      const wsStr = addDays(today, -diffToMon);
      const weStr = addDays(wsStr, 6);
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

// ── Helpers ───────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = parseDateParts(a);
  const [by, bm, bd] = parseDateParts(b);
  return Math.round((new Date(by, bm, bd).getTime() - new Date(ay, am, ad).getTime()) / 86400000);
}

/** Get the day of week (0=Sun, 1=Mon, ..., 6=Sat) for a date string. */
function dayOfWeek(date: string): number {
  const [y, m, d] = parseDateParts(date);
  return new Date(y, m, d).getDay();
}

/** Get the day of month (1-31) for a date string. */
function dayOfMonth(date: string): number {
  return parseDateParts(date)[2];
}

/** Get the number of days in the month of a given date string. */
function daysInMonth(date: string): number {
  const [y, m] = parseDateParts(date);
  return new Date(y, m + 1, 0).getDate();
}


/** Get start of week (Monday) for a date string. */
function weekStart(date: string): string {
  const [y, m, d] = parseDateParts(date);
  const dt = new Date(y, m, d);
  const day = dt.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0
  dt.setDate(dt.getDate() - diff);
  return dateStr(dt);
}

/** Get start of month for a date string. */
function monthStart(date: string): string {
  return date.slice(0, 7) + '-01';
}

/**
 * Compute the expected number of check-in days based on frequency.
 * Used as the denominator in progress calculation.
 */
export function computeExpectedDays(
  frequency: CheckinFrequency | undefined,
  startDate: string,
  endDate: string,
  today: string,
): number {
  const freq = frequency ?? { mode: 'daily' };
  const clampedEnd = today > endDate ? endDate : today;
  const totalElapsed = daysBetween(startDate, clampedEnd) + 1;
  if (totalElapsed <= 0) return 0;

  switch (freq.mode) {
    case 'daily':
      return totalElapsed;

    case 'interval': {
      // Every N days: count how many period starts fall within [startDate, clampedEnd]
      const every = Math.max(1, freq.every);
      // First period start is startDate, then startDate + every, startDate + 2*every, ...
      const elapsed = daysBetween(startDate, clampedEnd);
      return Math.floor(elapsed / every) + 1;
    }

    case 'weekly': {
      // Count expected across weeks, handling incomplete first/last weeks
      const target = freq.target;
      let expected = 0;
      let cursor = startDate;
      while (cursor <= clampedEnd) {
        const ws = weekStart(cursor);
        const we = addDays(ws, 6);
        const periodStart = cursor > ws ? cursor : ws;
        const periodEnd = clampedEnd < we ? clampedEnd : we;
        const periodDays = daysBetween(periodStart, periodEnd) + 1;
        expected += Math.min(Math.ceil((periodDays / 7) * target), target);
        cursor = addDays(we, 1);
      }
      return expected;
    }

    case 'weekly_fixed': {
      // Count how many of the specified weekdays fall within [startDate, clampedEnd]
      if (!freq.days || freq.days.length === 0) return 0; // Guard: empty days = no expected
      const daySet = new Set(freq.days);
      let count = 0;
      let cursor = startDate;
      while (cursor <= clampedEnd) {
        if (daySet.has(dayOfWeek(cursor))) count++;
        cursor = addDays(cursor, 1);
      }
      return count;
    }

    case 'monthly': {
      // Count expected across months, handling incomplete first/last months
      const target = freq.target;
      let expected = 0;
      let cursor = startDate;
      while (cursor <= clampedEnd) {
        const ms = monthStart(cursor);
        const me = addDays(addDays(ms, daysInMonth(ms) - 1), 0); // last day of month
        const periodStart = cursor > ms ? cursor : ms;
        const periodEnd = clampedEnd < me ? clampedEnd : me;
        const monthDays = daysInMonth(periodStart);
        const periodDays = daysBetween(periodStart, periodEnd) + 1;
        expected += Math.min(Math.ceil((periodDays / monthDays) * target), target);
        cursor = addDays(me, 1);
      }
      return expected;
    }

    case 'monthly_fixed': {
      // Count how many of the specified month-days fall within [startDate, clampedEnd]
      const dateSet = new Set(freq.dates);
      let count = 0;
      let cursor = startDate;
      while (cursor <= clampedEnd) {
        const dom = dayOfMonth(cursor);
        const maxDom = daysInMonth(cursor);
        // Check if today's day-of-month is in the set (skip dates > month length)
        if (dateSet.has(dom) && dom <= maxDom) count++;
        cursor = addDays(cursor, 1);
      }
      return count;
    }

    default:
      return totalElapsed;
  }
}

/**
 * Determine if a task should be shown in today's todo list based on its frequency.
 */
export function shouldShowToday(
  frequency: CheckinFrequency | undefined,
  startDate: string,
  today: string,
  checkins: PlanItemCheckin[],
): boolean {
  const freq = frequency ?? { mode: 'daily' };

  switch (freq.mode) {
    case 'daily':
      return true;

    case 'interval': {
      // Show during any active interval period where target not yet met.
      // Carries over across periods so missed items remain visible until completed.
      const every = Math.max(1, freq.every);
      const elapsed = daysBetween(startDate, today);
      if (elapsed < 0) return false;
      const periodStart = Math.floor(elapsed / every) * every;
      const periodEnd = periodStart + every - 1;
      const periodStartStr = addDays(startDate, periodStart);
      const periodEndStr = addDays(startDate, periodEnd);
      const clampedEnd = periodEndStr > today ? today : periodEndStr;
      let doneInPeriod = 0;
      for (const c of checkins) {
        if (c.done && !c.deleted && c.date >= periodStartStr && c.date <= clampedEnd) {
          doneInPeriod++;
        }
      }
      return doneInPeriod < 1; // target = 1 per interval period
    }

    case 'weekly': {
      // Show if this week's target hasn't been met yet
      const ws = weekStart(today);
      const we = addDays(ws, 6);
      const doneThisWeek = checkins.filter(c => c.done && !c.deleted && c.date >= ws && c.date <= we).length;
      return doneThisWeek < freq.target;
    }

    case 'weekly_fixed':
      // Show only on specified weekdays
      return freq.days.includes(dayOfWeek(today));

    case 'monthly': {
      // Show if this month's target hasn't been met yet
      const ms = monthStart(today);
      const me = addDays(addDays(ms, daysInMonth(ms) - 1), 0);
      const doneThisMonth = checkins.filter(c => c.done && !c.deleted && c.date >= ms && c.date <= me).length;
      // Keep visible today if already checked in (prevents task from disappearing after completion)
      const hasTodayCheckin = checkins.some(c => c.date === today && !c.deleted);
      return hasTodayCheckin || doneThisMonth < freq.target;
    }

    case 'monthly_fixed':
      // Show only on specified month days (skip if day doesn't exist in this month)
      return freq.dates.includes(dayOfMonth(today)) && dayOfMonth(today) <= daysInMonth(today);
  }
}

// ── Permission helpers ────────────────────────────────────────

export function canDeletePlan(status: PlanStatus): boolean {
  return status === 'not_started' || status === 'cancelled';
}

export function canEditPlan(status: PlanStatus): boolean {
  return status === 'not_started' || status === 'in_progress' || status === 'paused';
}

export function canEditPlanItem(status: PlanItemStatus): boolean {
  return status === 'not_started';
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
  visionId?: string;
}, today?: string): { plans: Plan[]; planId: string } | null {
  const id = uid();
  const now = today ?? dateStr();
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
    visionId: form.visionId,
    updatedAt: Date.now(),
    deleted: false,
  };
  return { plans: [...plans, p], planId: id };
}

export function updatePlan(plans: Plan[], id: string, patch: Partial<Plan>): Plan[] {
  const plan = plans.find(p => p.id === id && !p.deleted);
  if (!plan) return plans;
  // Don't allow editing completed or cancelled plans
  if (plan.status === 'completed' || plan.status === 'cancelled') return plans;
  // Don't allow changing status directly via updatePlan (use dedicated status functions)
  const { status, ...rest } = patch;
  if (status && status !== plan.status) return plans; // Block status change entirely
  return plans.map(p => p.id === id ? { ...p, ...rest, updatedAt: Date.now() } : p);
}

export function deletePlan(plans: Plan[], id: string): Plan[] {
  return plans.map(p => p.id === id && !p.deleted ? { ...p, deleted: true, updatedAt: Date.now() } : p);
}

// ── Plan status operations ────────────────────────────────────

export function startPlan(plans: Plan[], planItems: PlanItem[], id: string): { plans: Plan[]; planItems: PlanItem[] } {
  const now = Date.now();
  const today = dateStr();
  const plan = plans.find(p => p.id === id && !p.deleted);
  if (!plan || plan.status !== 'not_started') return { plans, planItems };
  // Check if there's already another active plan
  const hasActive = plans.some(p => p.id !== id && !p.deleted && isPlanActive(p.status));
  if (hasActive) return { plans, planItems };
  return {
    plans: plans.map(p => p.id === id ? { ...p, status: 'in_progress' as PlanStatus, updatedAt: now } : p),
    planItems: planItems.map(i => i.planId === id && !i.deleted && i.status === 'not_started' && i.startDate <= today
      ? { ...i, status: 'in_progress' as PlanItemStatus, updatedAt: now } : i),
  };
}

export function pausePlan(plans: Plan[], planItems: PlanItem[], id: string): { plans: Plan[]; planItems: PlanItem[] } {
  const now = Date.now();
  const plan = plans.find(p => p.id === id && !p.deleted);
  if (!plan || plan.status !== 'in_progress') return { plans, planItems };
  return {
    plans: plans.map(p => p.id === id ? { ...p, status: 'paused' as PlanStatus, updatedAt: now } : p),
    planItems: planItems.map(i => i.planId === id && !i.deleted && i.status === 'in_progress'
      ? { ...i, status: 'paused' as PlanItemStatus, updatedAt: now } : i),
  };
}

export function resumePlan(plans: Plan[], planItems: PlanItem[], id: string): { plans: Plan[]; planItems: PlanItem[] } {
  const now = Date.now();
  const plan = plans.find(p => p.id === id && !p.deleted);
  if (!plan || plan.status !== 'paused') return { plans, planItems };
  // Check if there's already another active plan
  const hasActive = plans.some(p => p.id !== id && !p.deleted && isPlanActive(p.status));
  if (hasActive) return { plans, planItems };
  return {
    plans: plans.map(p => p.id === id ? { ...p, status: 'in_progress' as PlanStatus, updatedAt: now } : p),
    planItems: planItems.map(i => i.planId === id && !i.deleted && i.status === 'paused'
      ? { ...i, status: 'in_progress' as PlanItemStatus, updatedAt: now } : i),
  };
}

export function completePlan(plans: Plan[], planItems: PlanItem[], id: string, reason?: string): { plans: Plan[]; planItems: PlanItem[] } {
  const now = Date.now();
  const plan = plans.find(p => p.id === id && !p.deleted);
  if (!plan || plan.status === 'completed' || plan.status === 'cancelled') return { plans, planItems };
  const progress = computePlanProgress(plan);
  return {
    plans: plans.map(p => p.id === id ? { ...p, status: 'completed' as PlanStatus, progress, completeReason: reason, updatedAt: now } : p),
    planItems: planItems.map(i => i.planId === id && !i.deleted && i.status !== 'completed' && i.status !== 'cancelled'
      ? { ...i, status: 'completed' as PlanItemStatus, updatedAt: now } : i),
  };
}

export function cancelPlan(plans: Plan[], planItems: PlanItem[], id: string): { plans: Plan[]; planItems: PlanItem[] } {
  const now = Date.now();
  const plan = plans.find(p => p.id === id && !p.deleted);
  if (!plan || plan.status === 'completed' || plan.status === 'cancelled') return { plans, planItems };
  return {
    plans: plans.map(p => p.id === id ? { ...p, status: 'cancelled' as PlanStatus, updatedAt: now } : p),
    planItems: planItems.map(i => i.planId === id && !i.deleted && i.status !== 'completed' && i.status !== 'cancelled'
      ? { ...i, status: 'cancelled' as PlanItemStatus, updatedAt: now } : i),
  };
}

/** Auto-detect status changes: not_started→in_progress when startDate arrives, mark overdue items */
export function checkAutoStatus(plans: Plan[], planItems: PlanItem[], today: string): { plans: Plan[]; planItems: PlanItem[]; delayedPlans: Plan[] } {
  let plansChanged = false;
  let itemsChanged = false;
  const delayedPlans: Plan[] = [];
  const now = Date.now();

  // Pre-build: does any non-deleted active plan already exist?
  let hasActivePlan = plans.some(p => !p.deleted && isPlanActive(p.status));

  const updatedPlans = plans.map(p => {
    if (p.deleted) return p;
    // Auto-start: not_started → in_progress when startDate arrives
    if (p.status === 'not_started' && p.startDate <= today) {
      if (hasActivePlan) return p;
      hasActivePlan = true; // Prevent multiple auto-starts
      plansChanged = true;
      let started = { ...p, status: 'in_progress' as PlanStatus, updatedAt: now };
      // Check delayed in same pass — plan may already be past endDate
      if (started.endDate < today && !started.lastDelayedNotifyAt) {
        delayedPlans.push(started);
      }
      return started;
    }
    // Mark paused plans as delayed if endDate has passed (keep paused status)
    if (p.status === 'paused' && p.endDate < today && !p.lastDelayedNotifyAt) {
      plansChanged = true;
      return { ...p, lastDelayedNotifyAt: now, updatedAt: now };
    }
    // Detect delayed plans: in_progress but endDate has passed
    if (p.status === 'in_progress' && p.endDate < today && !p.lastDelayedNotifyAt) {
      delayedPlans.push(p);
    }
    return p;
  });

  // Pre-build planMap for O(1) lookup in items loop
  const planMap = new Map(updatedPlans.map(p => [p.id, p]));

  const updatedItems = planItems.map(item => {
    if (item.deleted) return item;
    const plan = planMap.get(item.planId);
    if (!plan || plan.deleted) return item;

    // Auto-start items when plan is in_progress and startDate arrives
    if (item.status === 'not_started' && plan.status === 'in_progress' && item.startDate <= today) {
      itemsChanged = true;
      return { ...item, status: 'in_progress' as PlanItemStatus, updatedAt: now };
    }

    // Mark overdue items as delayed (skip if already delayed to avoid redundant updates)
    if (item.status === 'in_progress' && item.endDate < today) {
      itemsChanged = true;
      return { ...item, status: 'delayed' as PlanItemStatus, updatedAt: now };
    }
    if (item.status === 'delayed') return item;

    return item;
  });

  return { plans: plansChanged ? updatedPlans : plans, planItems: itemsChanged ? updatedItems : planItems, delayedPlans };
}

/** Perform daily reset: auto-start tasks, save previous day's history, copy recurring todos */
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
  dailyCustomTodos: DailyCustomTodo[];
  dailyTodoHistory: DailyTodoHistory[];
  hasChanges: boolean;
  delayedPlans: Plan[];
} {
  // 1. Auto-start tasks
  const { plans: updatedPlans, planItems: updatedPlanItems, delayedPlans } = checkAutoStatus(plans, planItems, today);

  // 2. Save previous day's history for all active plans
  let updatedHistory = [...dailyTodoHistory];
  const activePlans = updatedPlans.filter(p => !p.deleted && isPlanActive(p.status));

  // Pre-build history key set for O(1) existence check
  const historyKeySet = new Set(
    dailyTodoHistory.filter(h => h.date === previousDate && !h.deleted).map(h => h.planId)
  );
  for (const plan of activePlans) {
    if (!historyKeySet.has(plan.id)) {
      updatedHistory = saveDailyTodoHistory(updatedHistory, plan.id, previousDate, updatedPlanItems, planItemCheckins, dailyCustomTodos);
    }
  }

  // 3. Copy recurring custom todos to today — pre-build indexes for O(1) lookup
  const todosByPlanPrev = new Map<string, DailyCustomTodo[]>();
  const todosByPlanToday = new Map<string, DailyCustomTodo[]>();
  for (const t of dailyCustomTodos) {
    if (t.deleted) continue;
    if (t.date === previousDate && t.recurring) {
      let arr = todosByPlanPrev.get(t.planId);
      if (!arr) { arr = []; todosByPlanPrev.set(t.planId, arr); }
      arr.push(t);
    }
    if (t.date === today) {
      let arr = todosByPlanToday.get(t.planId);
      if (!arr) { arr = []; todosByPlanToday.set(t.planId, arr); }
      arr.push(t);
    }
  }
  const todayNameSet = new Set<string>();
  for (const [planId, todos] of todosByPlanToday) {
    for (const t of todos) todayNameSet.add(`${planId}:${t.name}`);
  }
  const newTodos: DailyCustomTodo[] = [];
  for (const plan of activePlans) {
    const recurringTodos = todosByPlanPrev.get(plan.id);
    if (!recurringTodos) continue;
    const existingToday = todosByPlanToday.get(plan.id) ?? [];
    let order = existingToday.reduce((max, t) => Math.max(max, t.order), -1) + 1;
    for (const todo of recurringTodos) {
      const key = `${plan.id}:${todo.name}`;
      if (!todayNameSet.has(key)) {
        todayNameSet.add(key);
        newTodos.push({
          id: uid(), planId: plan.id, date: today, name: todo.name,
          done: false, order: order++, recurring: true, updatedAt: Date.now(), deleted: false,
        });
      }
    }
  }
  const updatedCustomTodos = newTodos.length > 0 ? [...dailyCustomTodos, ...newTodos] : dailyCustomTodos;

  const plansChanged = updatedPlans !== plans;
  const itemsChanged = updatedPlanItems !== planItems;
  const historyChanged = updatedHistory.length !== dailyTodoHistory.length ||
    updatedHistory.some((h, i) => h !== dailyTodoHistory[i]);
  const todosChanged = updatedCustomTodos !== dailyCustomTodos;

  return {
    plans: updatedPlans,
    planItems: updatedPlanItems,
    dailyCustomTodos: updatedCustomTodos,
    dailyTodoHistory: updatedHistory,
    hasChanges: plansChanged || itemsChanged || historyChanged || todosChanged,
    delayedPlans,
  };
}

// ── PlanItem CRUD ─────────────────────────────────────────────

export function addPlanItem(planItems: PlanItem[], form: {
  planId: string; name: string; description?: string;
  startDate: string; endDate: string; contentUrl?: string;
  link?: PlanItemLink; priority?: PlanItemPriority; targetMetric?: string; linkConfig?: PlanItem['linkConfig']; order?: number; frequency?: PlanItem['frequency']; tags?: string[]; reflectionId?: string;
}, plans?: Plan[], today?: string): PlanItem[] {
  // Check if the plan is active (not completed or cancelled)
  if (plans) {
    const plan = plans.find(p => p.id === form.planId && !p.deleted);
    if (!plan || plan.status === 'completed' || plan.status === 'cancelled') return planItems;
  }
  const now = today ?? dateStr();
  const status: PlanItemStatus = form.startDate <= now ? 'in_progress' : 'not_started';
  const item: PlanItem = {
    id: uid(),
    planId: form.planId,
    name: form.name,
    description: form.description ?? '',
    startDate: form.startDate,
    endDate: form.endDate,
    contentUrl: form.contentUrl ?? '',
    reflectionId: form.reflectionId,
    totalCheckinDays: 0,
    status,
    progress: 0,
    link: form.link ?? 'manual',
    priority: form.priority ?? 'medium',
    targetMetric: form.targetMetric ?? '',
    linkConfig: form.linkConfig,
    order: form.order ?? 0,
    frequency: form.frequency,
    tags: form.tags,
    updatedAt: Date.now(),
    deleted: false,
  };
  return [...planItems, item];
}

export function updatePlanItem(planItems: PlanItem[], id: string, patch: Partial<PlanItem>): PlanItem[] {
  return planItems.map(i => i.id === id && !i.deleted ? { ...i, ...patch, updatedAt: Date.now() } : i);
}

export function deletePlanItem(planItems: PlanItem[], id: string): PlanItem[] {
  return planItems.map(i => i.id === id && !i.deleted ? { ...i, deleted: true, updatedAt: Date.now() } : i);
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
    frequency: undefined,
    order: 0,
  };
}

/**
 * Create a plan item from a generic source (reflection or trail).
 * Returns the plan item data and the source ID for linking.
 */
export function createPlanItem(
  source: PlanItemSource,
  planId: string,
  form: UnifiedPlanItemForm,
): Omit<PlanItem, 'id' | 'updatedAt' | 'deleted'> & { linkedSourceId: string } {
  const today = dateStr();
  const status: PlanItemStatus = form.startDate <= today ? 'in_progress' : 'not_started';

  const base = {
    planId,
    name: form.name,
    description: form.description ?? '',
    startDate: form.startDate,
    endDate: form.endDate,
    contentUrl: '',
    totalCheckinDays: 0,
    status,
    progress: 0,
    priority: form.priority,
    targetMetric: form.targetMetric ?? '',
    frequency: form.frequency,
    order: 0,
    tags: form.tags,
  };

  if (source.type === 'reflection') {
    return {
      ...base,
      link: 'reflection' as PlanItemLink,
      reflectionId: source.id,
      linkedSourceId: source.id,
    };
  }

  return {
    ...base,
    link: 'trail' as PlanItemLink,
    trailId: source.id,
    linkedSourceId: source.id,
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
    i.planId === planId && !i.deleted && i.reflectionId
      ? { ...i, reflectionId: undefined, updatedAt: now }
      : i
  );
}

// ── PlanItemCheckin ───────────────────────────────────────────

export function checkinItem(checkins: PlanItemCheckin[], planItemId: string, date: string, linkedModule?: string): PlanItemCheckin[] {
  const existing = checkins.find(c => c.planItemId === planItemId && c.date === date && !c.deleted);
  if (existing) {
    return checkins.map(c =>
      c.planItemId === planItemId && c.date === date && !c.deleted
        ? { ...c, done: true, linkedModule, updatedAt: Date.now() }
        : c
    );
  }
  return [...checkins, { id: uid(), planItemId, date, done: true, linkedModule, updatedAt: Date.now(), deleted: false }];
}

export function uncheckinItem(checkins: PlanItemCheckin[], planItemId: string, date: string): PlanItemCheckin[] {
  const existing = checkins.find(c => c.planItemId === planItemId && c.date === date && !c.deleted);
  if (existing) {
    return checkins.map(c =>
      c.planItemId === planItemId && c.date === date && !c.deleted
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

  // Pre-build indexes
  const planItemsByPlanId = new Map<string, PlanItem[]>();
  for (const item of planItems) {
    if (item.deleted) continue;
    let arr = planItemsByPlanId.get(item.planId);
    if (!arr) { arr = []; planItemsByPlanId.set(item.planId, arr); }
    arr.push(item);
  }
  const doneTodaySet = new Set<string>();
  for (const c of checkins) {
    if (c.date === today && c.done && !c.deleted) doneTodaySet.add(c.planItemId);
  }

  // Pre-compute module state booleans
  const checkinDone = state.checkinHistory.some(c => c.date === today && c.done && !c.deleted);
  const meditationDone = state.medHistory.some(m => m.date === today && !m.deleted);
  const habitById = new Map<string, boolean>();
  for (const h of state.habits) {
    if (!h.deleted) habitById.set(h.id, (h.checkedDates ?? []).includes(today));
  }
  // Pre-compute max fasting hours and exercise minutes using shared helpers
  const maxFastingHours = computeMaxFastingHours(state.fastingHistory, state.activeFasting, today);
  const maxExerciseMinutes = computeMaxExerciseMinutes(state.exerciseLog, today);
  const fastingDoneByTarget = (targetHours: number) => maxFastingHours >= targetHours;
  const exerciseDoneByMin = (minMinutes: number) => maxExerciseMinutes >= minMinutes;

  for (const plan of plans) {
    if (plan.deleted || plan.status !== 'in_progress') continue;

    const items = planItemsByPlanId.get(plan.id);
    if (!items) continue;
    for (const item of items) {
      if (item.status !== 'in_progress') continue;
      if (today < item.startDate || today > item.endDate) continue;
      if (doneTodaySet.has(item.id)) continue;

      let linkedDone = false;
      switch (item.link) {
        case 'checkin':
          linkedDone = checkinDone;
          break;
        case 'fasting':
          linkedDone = fastingDoneByTarget(item.linkConfig?.targetHours ?? 16);
          break;
        case 'meditation':
          linkedDone = meditationDone;
          break;
        case 'exercise':
          linkedDone = exerciseDoneByMin(item.linkConfig?.targetMinutes ?? 30);
          break;
        case 'habit':
          linkedDone = habitById.get(item.linkConfig?.habitId ?? '') ?? false;
          break;
        case 'reflection':
        case 'manual':
        default:
          break;
      }

      if (linkedDone) {
        result = checkinItem(result, item.id, today, item.link);
        doneTodaySet.add(item.id);
      }
    }
  }
  return result;
}

// ── Progress computation ──────────────────────────────────────

/** Build a Map<planItemId, PlanItemCheckin[]> for O(1) lookups. */
function buildCheckinByItem(checkins: PlanItemCheckin[]): Map<string, PlanItemCheckin[]> {
  const map = new Map<string, PlanItemCheckin[]>();
  for (const c of checkins) {
    let arr = map.get(c.planItemId);
    if (!arr) { arr = []; map.set(c.planItemId, arr); }
    arr.push(c);
  }
  return map;
}

/** Count done checkins for an item within [startDate, endDate] using pre-built index. */
function countDoneCheckins(
  index: Map<string, PlanItemCheckin[]>,
  itemId: string,
  startDate: string,
  endDate: string,
): number {
  const arr = index.get(itemId);
  if (!arr) return 0;
  const doneDates = new Set<string>();
  for (const c of arr) {
    if (c.done && !c.deleted && c.date >= startDate && c.date <= endDate) doneDates.add(c.date);
  }
  return doneDates.size;
}

export function computeItemProgress(item: PlanItem, checkins: PlanItemCheckin[], today: string): number {
  const clampedToday = today > item.endDate ? item.endDate : today;
  const expectedDays = computeExpectedDays(item.frequency, item.startDate, item.endDate, clampedToday);
  if (expectedDays <= 0) return 0;

  const doneDates = new Set<string>();
  for (const c of checkins) {
    if (c.planItemId === item.id && c.done && !c.deleted && c.date >= item.startDate && c.date <= clampedToday) {
      doneDates.add(c.date);
    }
  }

  return Math.min(Math.round((doneDates.size / expectedDays) * 100), 100);
}

/** Count the number of done (non-deleted) days for an item up to today. */
export function countItemDoneDays(item: PlanItem, checkins: PlanItemCheckin[], today: string): { doneCount: number; expectedDays: number } {
  const clampedToday = today > item.endDate ? item.endDate : today;
  const doneDates = new Set<string>();
  for (const c of checkins) {
    if (c.planItemId === item.id && c.done && !c.deleted && c.date >= item.startDate && c.date <= clampedToday) {
      doneDates.add(c.date);
    }
  }
  const expectedDays = computeExpectedDays(item.frequency, item.startDate, item.endDate, clampedToday);
  return { doneCount: doneDates.size, expectedDays };
}

export function computePlanProgress(plan: Plan): number {
  const totalDays = daysBetween(plan.startDate, plan.endDate) + 1;
  if (totalDays <= 0) return 0;
  const today = dateStr(new Date());
  const clampedToday = today > plan.endDate ? plan.endDate : today;
  const elapsed = daysBetween(plan.startDate, clampedToday) + 1;
  return Math.max(0, Math.min(Math.round((elapsed / totalDays) * 100), 100));
}

// ── Query helpers ─────────────────────────────────────────────

export function getActivePlan(plans: Plan[]): Plan | null {
  const active = plans.filter(p => !p.deleted && isPlanActive(p.status));
  if (active.length === 0) return null;
  // Prioritize in_progress > paused > not_started
  return active.find(p => p.status === 'in_progress')
    ?? active.find(p => p.status === 'paused')
    ?? active[0];
}

export function getPlanItems(planItems: PlanItem[], planId: string): PlanItem[] {
  return planItems.filter(i => i.planId === planId && !i.deleted).sort((a, b) => a.order - b.order);
}

export function getTodayItems(planItems: PlanItem[], plan: Plan, today: string, checkins?: PlanItemCheckin[]): PlanItem[] {
  return planItems
    .filter(i => {
      if (i.deleted || i.planId !== plan.id) return false;
      if (i.status !== 'in_progress' && i.status !== 'delayed') return false;
      if (today < i.startDate || today > i.endDate) return false;
      // Frequency filtering: only show if today is a required check-in day
      if (checkins && i.frequency) {
        const itemCheckins = checkins.filter(c => c.planItemId === i.id);
        return shouldShowToday(i.frequency, i.startDate, today, itemCheckins);
      }
      return true;
    })
    .sort((a, b) => a.order - b.order);
}

export function getHistoryPlans(plans: Plan[]): Plan[] {
  return plans
    .filter(p => !p.deleted)
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

/** Update totalCheckinDays and progress for plan items based on checkins. Uses pre-built index. */
export function refreshPlanItemStats(planItems: PlanItem[], checkins: PlanItemCheckin[], today: string): PlanItem[] {
  const index = buildCheckinByItem(checkins);
  return planItems.map(item => {
    if (item.deleted) return item;
    const clampedToday = today > item.endDate ? item.endDate : today;
    const doneCount = countDoneCheckins(index, item.id, item.startDate, clampedToday);
    const expectedDays = computeExpectedDays(item.frequency, item.startDate, item.endDate, clampedToday);
    const progress = expectedDays > 0 ? Math.min(Math.round((doneCount / expectedDays) * 100), 100) : 0;
    if (item.totalCheckinDays !== doneCount || item.progress !== progress) {
      return { ...item, totalCheckinDays: doneCount, progress, updatedAt: Date.now() };
    }
    return item;
  });
}

// ── DailyCustomTodo ─────────────────────────────────────────

export function addDailyCustomTodo(todos: DailyCustomTodo[], planId: string, name: string, date: string, recurring?: boolean): DailyCustomTodo[] {
  const existingTodos = todos.filter(t => t.planId === planId && t.date === date && !t.deleted);
  const maxOrder = existingTodos.reduce((max, t) => Math.max(max, t.order), -1);
  const todo: DailyCustomTodo = {
    id: uid(),
    planId,
    date,
    name,
    done: false,
    order: maxOrder + 1,
    recurring: recurring ?? false,
    updatedAt: Date.now(),
    deleted: false,
  };
  return [...todos, todo];
}

export function toggleDailyCustomTodo(todos: DailyCustomTodo[], id: string, date: string): DailyCustomTodo[] {
  return todos.map(t => {
    if (t.id !== id || t.date !== date || t.deleted) return t;
    return { ...t, done: !t.done, updatedAt: Date.now() };
  });
}

export function deleteDailyCustomTodo(todos: DailyCustomTodo[], id: string): DailyCustomTodo[] {
  return todos.map(t => t.id === id && !t.deleted ? { ...t, deleted: true, updatedAt: Date.now() } : t);
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

  // Pre-build done checkin set for O(1) lookup
  const doneCheckinSet = new Set<string>();
  for (const c of planItemCheckins) {
    if (c.date === date && c.done && !c.deleted) doneCheckinSet.add(c.planItemId);
  }

  // 获取当天的计划任务完成情况
  const todayPlanItems = planItems
    .filter(i => !i.deleted && i.planId === planId && date >= i.startDate && date <= i.endDate)
    .map(i => ({
      id: i.id,
      name: i.name,
      link: i.link,
      done: doneCheckinSet.has(i.id),
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
