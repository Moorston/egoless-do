// ─── Plan business logic (pure functions) ─────────────────────
import type {
  Plan, PlanStatus, PlanItem, PlanItemStatus, PlanItemCheckin, PlanItemLink,
  Habit, FastingSession, MedHistoryEntry, ExerciseEntry, CheckinEntry,
} from '../types';
import { uid, dateStr } from '../utils';

// ── Helpers ───────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function nextDay(date: string): string {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// ── Permission helpers ────────────────────────────────────────

export function canDeletePlan(status: PlanStatus): boolean {
  return status === 'not_started' || status === 'cancelled';
}

export function canEditPlan(status: PlanStatus): boolean {
  return status === 'not_started' || status === 'in_progress' || status === 'paused' || status === 'delayed';
}

export function isPlanActive(status: PlanStatus): boolean {
  return status === 'not_started' || status === 'in_progress' || status === 'paused' || status === 'delayed';
}

// ── Plan CRUD ─────────────────────────────────────────────────

export function addPlan(plans: Plan[], form: {
  name: string; goal: string; slogan?: string;
  startDate: string; endDate: string;
}): { plans: Plan[]; planId: string } {
  const id = uid();
  const p: Plan = {
    id,
    name: form.name,
    goal: form.goal,
    slogan: form.slogan ?? '',
    startDate: form.startDate,
    endDate: form.endDate,
    status: 'not_started',
    progress: 0,
    updatedAt: Date.now(),
  };
  return { plans: [...plans, p], planId: id };
}

export function updatePlan(plans: Plan[], id: string, patch: Partial<Plan>): Plan[] {
  return plans.map(p => p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p);
}

export function deletePlan(plans: Plan[], id: string): Plan[] {
  return plans.map(p => p.id === id ? { ...p, deleted: true, updatedAt: Date.now() } : p);
}

// ── Plan status operations ────────────────────────────────────

export function startPlan(plans: Plan[], planItems: PlanItem[], id: string): { plans: Plan[]; planItems: PlanItem[] } {
  const now = Date.now();
  return {
    plans: plans.map(p => p.id === id ? { ...p, status: 'in_progress' as PlanStatus, updatedAt: now } : p),
    planItems: planItems.map(i => i.planId === id && i.status === 'not_started'
      ? { ...i, status: 'in_progress' as PlanItemStatus, updatedAt: now } : i),
  };
}

export function pausePlan(plans: Plan[], planItems: PlanItem[], id: string): { plans: Plan[]; planItems: PlanItem[] } {
  const now = Date.now();
  return {
    plans: plans.map(p => p.id === id ? { ...p, status: 'paused' as PlanStatus, updatedAt: now } : p),
    planItems: planItems.map(i => i.planId === id && i.status === 'in_progress'
      ? { ...i, status: 'paused' as PlanItemStatus, updatedAt: now } : i),
  };
}

export function resumePlan(plans: Plan[], planItems: PlanItem[], id: string): { plans: Plan[]; planItems: PlanItem[] } {
  const now = Date.now();
  return {
    plans: plans.map(p => p.id === id ? { ...p, status: 'in_progress' as PlanStatus, updatedAt: now } : p),
    planItems: planItems.map(i => i.planId === id && i.status === 'paused'
      ? { ...i, status: 'in_progress' as PlanItemStatus, updatedAt: now } : i),
  };
}

export function completePlan(plans: Plan[], id: string): Plan[] {
  return plans.map(p => p.id === id ? { ...p, status: 'completed' as PlanStatus, progress: 100, updatedAt: Date.now() } : p);
}

export function cancelPlan(plans: Plan[], id: string): Plan[] {
  return plans.map(p => p.id === id ? { ...p, status: 'cancelled' as PlanStatus, updatedAt: Date.now() } : p);
}

export function delayPlan(plans: Plan[], id: string): Plan[] {
  return plans.map(p => p.id === id ? { ...p, status: 'delayed' as PlanStatus, updatedAt: Date.now() } : p);
}

/** Auto-detect status changes: not_started→in_progress when startDate arrives, in_progress→delayed when endDate passes */
export function checkAutoStatus(plans: Plan[], planItems: PlanItem[], today: string): { plans: Plan[]; planItems: PlanItem[] } {
  let itemsChanged = false;
  const updatedPlans = plans.map(p => {
    if (p.deleted) return p;
    if (p.status === 'not_started' && p.startDate <= today) {
      return { ...p, status: 'in_progress' as PlanStatus, updatedAt: Date.now() };
    }
    if (p.status === 'in_progress' && p.endDate < today) {
      return { ...p, status: 'delayed' as PlanStatus, updatedAt: Date.now() };
    }
    return p;
  });

  const updatedItems = planItems.map(item => {
    if (item.deleted) return item;
    if (item.status === 'not_started') {
      const plan = updatedPlans.find(p => p.id === item.planId);
      if (plan && (plan.status === 'in_progress' || plan.status === 'delayed') && item.startDate <= today) {
        itemsChanged = true;
        return { ...item, status: 'in_progress' as PlanItemStatus, updatedAt: Date.now() };
      }
    }
    return item;
  });

  return { plans: updatedPlans, planItems: itemsChanged ? updatedItems : planItems };
}

// ── PlanItem CRUD ─────────────────────────────────────────────

export function addPlanItem(planItems: PlanItem[], form: {
  planId: string; name: string; description?: string;
  startDate: string; endDate: string; contentUrl?: string;
  link?: PlanItemLink; linkConfig?: PlanItem['linkConfig']; order?: number;
}): PlanItem[] {
  const item: PlanItem = {
    id: uid(),
    planId: form.planId,
    name: form.name,
    description: form.description ?? '',
    startDate: form.startDate,
    endDate: form.endDate,
    contentUrl: form.contentUrl ?? '',
    totalCheckinDays: 0,
    status: 'not_started',
    progress: 0,
    link: form.link ?? 'manual',
    linkConfig: form.linkConfig,
    order: form.order ?? 0,
    updatedAt: Date.now(),
  };
  return [...planItems, item];
}

export function updatePlanItem(planItems: PlanItem[], id: string, patch: Partial<PlanItem>): PlanItem[] {
  return planItems.map(i => i.id === id ? { ...i, ...patch, updatedAt: Date.now() } : i);
}

export function deletePlanItem(planItems: PlanItem[], id: string): PlanItem[] {
  return planItems.map(i => i.id === id ? { ...i, deleted: true, updatedAt: Date.now() } : i);
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
  return [...checkins, { id: uid(), planItemId, date, done: true, linkedModule, updatedAt: Date.now() }];
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
    if (plan.deleted || (plan.status !== 'in_progress' && plan.status !== 'delayed')) continue;

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
  const clampedToday = today > item.endDate ? item.endDate : today;
  const totalDays = daysBetween(item.startDate, clampedToday) + 1;
  if (totalDays <= 0) return 0;

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
    .filter(p => !p.deleted && (p.status === 'completed' || p.status === 'cancelled'))
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
