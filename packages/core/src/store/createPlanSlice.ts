import {
  addPlan, updatePlan, deletePlan, canDeletePlan,
  startPlan, pausePlan, resumePlan, completePlan, cancelPlan,
  checkAutoStatus, performDailyReset as performDailyResetBiz,
  addPlanItem, updatePlanItem, deletePlanItem,
  checkinItem, uncheckinItem,
  syncPlanItemsFromModules, refreshPlanItemStats, computePlanProgress,
  addDailyCustomTodo as addDailyCustomTodoBiz,
  toggleDailyCustomTodo as toggleDailyCustomTodoBiz,
  deleteDailyCustomTodo as deleteDailyCustomTodoBiz,
  saveDailyTodoHistory as saveDailyTodoHistoryBiz,
  getActivePlan as getActivePlanBiz,
  createPlanItem as createPlanItemBiz,
  canArchivePlan as canArchivePlanBiz,
  unlinkAllReflectionsFromPlan as unlinkAllReflectionsFromPlanBiz,
} from '../business/plan';
import {
  linkReflectionToPlanItem,
} from '../business/reflections';
import { createLogger } from '../logger';
import { notifyDelayedPlan } from '../services/notification';
import type { SyncEntity } from '../sync/entities';
import type { Plan, PlanItem, PlanItemCheckin, DailyCustomTodo, DailyTodoHistory, PlanItemSource, UnifiedPlanItemForm, RecycleBinItem, ThoughtTrail } from '../types';
import type { MindReflection } from '../types/reflection';
import { uid, dateStr, activeOnly, parseDateParts } from '../utils';

import type { SliceCreator } from './sliceHelper';
import type { StorageAdapter, PlanSlice, FullStore } from './types';


const log = createLogger('Store');

// ═══════════════════════════════════════════════════════════════════
// Section 1: Shared Helpers
// ═══════════════════════════════════════════════════════════════════

// Shared toggle logic for checkin/uncheckin deduplication
type SetState = (fn: (s: FullStore) => Partial<FullStore>) => void;
type GetState = () => FullStore;

function toggleCheckin(
  set: SetState, get: GetState, adapter: StorageAdapter,
  action: 'checkin' | 'uncheckin', planItemId: string, date?: string,
) {
  const today = date ?? dateStr();
  const s = get();

  // 1. Pre-compute all new state and persist targets BEFORE set()
  const newCheckins = action === 'checkin'
    ? checkinItem(s.planItemCheckins ?? [], planItemId, today)
    : uncheckinItem(s.planItemCheckins ?? [], planItemId, today);
  const newItems = refreshPlanItemStats(s.planItems ?? [], newCheckins, today);
  const foundItem = newItems.find((i: PlanItem) => i.id === planItemId && !i.deleted);
  const newHistory = foundItem
    ? saveDailyTodoHistoryBiz(s.dailyTodoHistory ?? [], foundItem.planId, today, newItems, newCheckins, s.dailyCustomTodos ?? [])
    : s.dailyTodoHistory;

  let updatedPlan: Plan | undefined;
  const patch: Record<string, unknown> = { planItemCheckins: newCheckins, planItems: newItems, dailyTodoHistory: newHistory };
  if (foundItem) {
    const plan = (s.plans ?? []).find((p: Plan) => p.id === foundItem.planId && !p.deleted);
    if (plan) {
      updatedPlan = { ...plan, progress: computePlanProgress(plan), updatedAt: Date.now() };
      patch.plans = (s.plans ?? []).map((p: Plan) => p.id === plan.id ? updatedPlan! : p);
    }
  }

  // 2. Pure set() — no side effects inside updater
  set(() => patch);

  // 3. Persist using pre-computed values
  const checkin = newCheckins.find((c: PlanItemCheckin) => c.planItemId === planItemId && c.date === today && !c.deleted);
  if (checkin) adapter.persistChange('planItemCheckin', checkin.id, checkin).catch(e => log.error(e));
  if (updatedPlan) adapter.persistChange('plan', updatedPlan.id, updatedPlan).catch(e => log.error(e));
  if (foundItem && newHistory) {
    const historyEntry = (newHistory ?? []).find((h: DailyTodoHistory) => h.planId === foundItem.planId && h.date === today && !h.deleted);
    if (historyEntry) adapter.persistChange('dailyTodoHistory', historyEntry.id, historyEntry).catch(e => log.error(e));
  }
}

/** Cascade: pre-compute all cross-slice mutations for a plan/planItem deletion. */
function computeCascadeDelete(get: () => FullStore, type: 'plan' | 'item', targetId: string) {
  const s = get();
  const now = Date.now();
  if (type === 'plan') {
    const plan = (s.plans ?? []).find(p => p.id === targetId && !p.deleted);
    if (!plan || !canDeletePlan(plan.status)) return null;
    const planItemsToDelete = (s.planItems ?? []).filter(i => i.planId === targetId && !i.deleted);
    const deletedItemIds = planItemsToDelete.map(i => i.id);
    const deletedItemIdsSet = new Set(deletedItemIds);
    const planIdByItemId = new Map<string, string>();
    for (const i of (s.planItems ?? [])) planIdByItemId.set(i.id, i.planId);
    const deletedCheckinIds = (s.planItemCheckins ?? [])
      .filter(c => planIdByItemId.get(c.planItemId) === targetId && !c.deleted).map(c => c.id);
    const updatedReflections = (s.reflections ?? [])
      .filter(r => r.linkedPlanItemId && deletedItemIdsSet.has(r.linkedPlanItemId) && !r.deleted)
      .map(r => ({ ...r, linkedPlanItemId: undefined, updatedAt: now }));
    const updatedTrails = (s.thoughtTrails ?? [])
      .filter(t => !t.deleted && t.linkedPlanItemIds?.some(pid => deletedItemIdsSet.has(pid)))
      .map(t => ({ ...t, linkedPlanItemIds: t.linkedPlanItemIds!.filter(pid => !deletedItemIdsSet.has(pid)), updatedAt: now }));
    return { plan, deletedItemIds, deletedCheckinIds, updatedReflections, updatedTrails, now, recycleEntry: { id: targetId, entityType: 'plan' as const, data: plan, deletedAt: now } };
  }
  // type === 'item'
  const deletedCheckinIds = (s.planItemCheckins ?? [])
    .filter(c => c.planItemId === targetId && !c.deleted).map(c => c.id);
  const updatedReflections = (s.reflections ?? [])
    .filter(r => r.linkedPlanItemId === targetId && !r.deleted)
    .map(r => ({ ...r, linkedPlanItemId: undefined, updatedAt: now }));
  const updatedTrails = (s.thoughtTrails ?? [])
    .filter(t => !t.deleted && t.linkedPlanItemIds?.includes(targetId))
    .map(t => ({ ...t, linkedPlanItemIds: t.linkedPlanItemIds!.filter(pid => pid !== targetId), updatedAt: now }));
  return { deletedCheckinIds, updatedReflections, updatedTrails, now };
}

/** Persist pre-computed reflection/trail updates and batch-delete entity records. */
async function persistCascade(adapter: StorageAdapter, batchOps: Array<{ entity: SyncEntity; id: string }>, reflections: MindReflection[], trails: ThoughtTrail[]) {
  await adapter.batchDelete(batchOps).catch((e: unknown) => log.error(e));
  for (const r of reflections) adapter.persistChange('reflection', r.id, r).catch((e: unknown) => log.error(e));
  for (const t of trails) adapter.persistChange('thoughtTrail', t.id, t).catch((e: unknown) => log.error(e));
}

// eslint-disable-next-line max-lines-per-function -- plan slice groups cohesive CRUD; splitting would fragment logic
export function createPlanSlice(
  adapter: StorageAdapter,
): SliceCreator<PlanSlice> {
  // eslint-disable-next-line max-lines-per-function -- arrow body groups cohesive CRUD state
  return (set, get) => ({
    plans: [],
    planItems: [],
    planItemCheckins: [],
    dailyCustomTodos: [],
    dailyTodoHistory: [],

    // ═══════════════════════════════════════════════════════════════
    // Plan CRUD & Lifecycle
    // ═══════════════════════════════════════════════════════════════

    addPlan(form) {
      let planId = '';
      let plan: Plan | undefined;
      set(s => {
        const result = addPlan(s.plans ?? [], form);
        if (!result) return {}; // No change if active plan exists
        planId = result.planId;
        plan = result.plans.find(p => p.id === result.planId && !p.deleted);
        return { plans: result.plans };
      });
      if (!planId) return '';
      if (plan) adapter.persistChange('plan', plan.id, plan).catch(e => log.error(e));
      return planId;
    },

    updatePlan(id, patch) {
      let updated: Plan | undefined;
      set(s => {
        const newPlans = updatePlan(s.plans ?? [], id, patch);
        updated = newPlans.find(p => p.id === id && !p.deleted);
        return { plans: newPlans };
      });
      if (updated) adapter.persistChange('plan', id, updated).catch(e => log.error(e));
    },

    async deletePlan(id) {
      const cascade = computeCascadeDelete(get, 'plan', id);
      if (!cascade) return;
      const { deletedItemIds, deletedCheckinIds, updatedReflections, updatedTrails, now, recycleEntry } = cascade;
      const updatedReflectionIds = new Set(updatedReflections.map(r => r.id));
      const updatedTrailIds = new Set(updatedTrails.map(t => t.id));

      set(prev => ({
        recycleBin: [recycleEntry, ...(prev.recycleBin ?? [])],
        plans: deletePlan(prev.plans ?? [], id),
        planItems: (prev.planItems ?? []).map(i =>
          i.planId === id && !i.deleted ? { ...i, deleted: true, updatedAt: now } : i,
        ),
        planItemCheckins: (prev.planItemCheckins ?? []).map(c =>
          deletedCheckinIds.includes(c.id) ? { ...c, deleted: true, updatedAt: now } : c,
        ),
        reflections: (prev.reflections ?? []).map(r =>
          updatedReflectionIds.has(r.id) ? updatedReflections.find(ur => ur.id === r.id)! : r,
        ),
        thoughtTrails: (prev.thoughtTrails ?? []).map(t =>
          updatedTrailIds.has(t.id) ? updatedTrails.find(ut => ut.id === t.id)! : t,
        ),
      } as Partial<FullStore>));
      await persistCascade(adapter, [
        { entity: 'plan', id },
        ...(deletedItemIds ?? []).map(itemId => ({ entity: 'planItem' as const, id: itemId })),
        ...deletedCheckinIds.map(checkinId => ({ entity: 'planItemCheckin' as const, id: checkinId })),
      ], updatedReflections, updatedTrails);
    },

    startPlan(id) {
      const s = get();
      const result = startPlan(s.plans ?? [], s.planItems ?? [], id);
      set({ plans: result.plans, planItems: result.planItems });
      const updated = result.plans.find(p => p.id === id && !p.deleted);
      if (updated) adapter.persistChange('plan', id, updated).catch(e => log.error(e));
      result.planItems.filter(i => i.planId === id && !i.deleted)
        .forEach(i => adapter.persistChange('planItem', i.id, i).catch(e => log.error(e)));
    },

    pausePlan(id) {
      const s = get();
      const result = pausePlan(s.plans ?? [], s.planItems ?? [], id);
      set({ plans: result.plans, planItems: result.planItems });
      const updated = result.plans.find(p => p.id === id && !p.deleted);
      if (updated) adapter.persistChange('plan', id, updated).catch(e => log.error(e));
      result.planItems.filter(i => i.planId === id && !i.deleted)
        .forEach(i => adapter.persistChange('planItem', i.id, i).catch(e => log.error(e)));
    },

    resumePlan(id) {
      const s = get();
      const result = resumePlan(s.plans ?? [], s.planItems ?? [], id);
      set({ plans: result.plans, planItems: result.planItems });
      const updated = result.plans.find(p => p.id === id && !p.deleted);
      if (updated) adapter.persistChange('plan', id, updated).catch(e => log.error(e));
      result.planItems.filter(i => i.planId === id && !i.deleted)
        .forEach(i => adapter.persistChange('planItem', i.id, i).catch(e => log.error(e)));
    },

    completePlan(id, reason) {
      const s = get();
      const result = completePlan(s.plans ?? [], s.planItems ?? [], id, reason);
      set({ plans: result.plans, planItems: result.planItems });
      const updated = result.plans.find(p => p.id === id && !p.deleted);
      if (updated) adapter.persistChange('plan', id, updated).catch(e => log.error(e));
      result.planItems.filter(i => i.planId === id && !i.deleted)
        .forEach(i => adapter.persistChange('planItem', i.id, i).catch(e => log.error(e)));
    },

    cancelPlan(id) {
      const s = get();
      const result = cancelPlan(s.plans ?? [], s.planItems ?? [], id);
      set({ plans: result.plans, planItems: result.planItems });
      const updated = result.plans.find(p => p.id === id && !p.deleted);
      if (updated) adapter.persistChange('plan', id, updated).catch(e => log.error(e));
      result.planItems.filter(i => i.planId === id && !i.deleted)
        .forEach(i => adapter.persistChange('planItem', i.id, i).catch(e => log.error(e)));
    },

    checkAutoStatus() {
      const today = dateStr();
      const s = get();
      const result = checkAutoStatus(s.plans ?? [], s.planItems ?? [], today);
      set({ plans: result.plans, planItems: result.planItems });
      // Persist changed plans/items — pre-build maps for O(1) lookup
      const origPlanMap = new Map<string, Plan>((s.plans ?? []).map((p: Plan) => [p.id, p]));
      const origItemMap = new Map<string, PlanItem>((s.planItems ?? []).map((i: PlanItem) => [i.id, i]));
      for (const p of result.plans) {
        const orig = origPlanMap.get(p.id);
        if (orig && orig.updatedAt !== p.updatedAt) {
          adapter.persistChange('plan', p.id, p).catch(e => log.error(e));
        }
      }
      for (const item of result.planItems) {
        const orig = origItemMap.get(item.id);
        if (orig && orig.updatedAt !== item.updatedAt) {
          adapter.persistChange('planItem', item.id, item).catch(e => log.error(e));
        }
      }
      // Trigger delayed plan notifications
      if (result.delayedPlans.length > 0) {
        get().notifyPlanDelayed(result.delayedPlans);
      }
    },

    // ═══════════════════════════════════════════════════════════════
    // PlanItem CRUD & Checkin
    // ═══════════════════════════════════════════════════════════════

    addPlanItem(form) {
      const prevCount = (get().planItems ?? []).filter(i => !i.deleted).length;
      let addedItem: PlanItem | undefined;
      set(s => {
        const newItems = addPlanItem(s.planItems ?? [], form, s.plans);
        if (activeOnly(newItems).length > prevCount) {
          addedItem = newItems[newItems.length - 1];
        }
        return { planItems: newItems };
      });
      if (addedItem) adapter.persistChange('planItem', addedItem.id, addedItem).catch(e => log.error(e));
    },

    updatePlanItem(id, patch) {
      let updated: PlanItem | undefined;
      set(s => {
        const newItems = updatePlanItem(s.planItems ?? [], id, patch);
        updated = newItems.find(i => i.id === id && !i.deleted);
        return { planItems: newItems };
      });
      if (updated) adapter.persistChange('planItem', id, updated).catch(e => log.error(e));
    },

    async deletePlanItem(id) {
      const cascade = computeCascadeDelete(get, 'item', id);
      if (!cascade) return;
      const { deletedCheckinIds, updatedReflections, updatedTrails, now } = cascade;
      const updatedReflectionIds = new Set(updatedReflections.map(r => r.id));
      const updatedTrailIds = new Set(updatedTrails.map(t => t.id));

      // Add item to recycleBin before deletion
      const item = get().planItems.find(pi => pi.id === id && !pi.deleted);
      let recycleEntry: RecycleBinItem | undefined;
      if (item) {
        recycleEntry = { id: item.id, entityType: 'planItem' as const, data: item, deletedAt: now };
      }

      set(prev => ({
        recycleBin: recycleEntry ? [recycleEntry, ...(prev.recycleBin ?? [])] : prev.recycleBin,
        planItems: deletePlanItem(prev.planItems ?? [], id),
        planItemCheckins: (prev.planItemCheckins ?? []).map(c =>
          c.planItemId === id && !c.deleted ? { ...c, deleted: true, updatedAt: now } : c,
        ),
        reflections: (prev.reflections ?? []).map(r =>
          updatedReflectionIds.has(r.id) ? updatedReflections.find(ur => ur.id === r.id)! : r,
        ),
        thoughtTrails: (prev.thoughtTrails ?? []).map(t =>
          updatedTrailIds.has(t.id) ? updatedTrails.find(ut => ut.id === t.id)! : t,
        ),
      }));
      await persistCascade(adapter, [
        { entity: 'planItem', id },
        ...deletedCheckinIds.map(checkinId => ({ entity: 'planItemCheckin' as const, id: checkinId })),
      ], updatedReflections, updatedTrails);
    },

    checkinPlanItem(planItemId, date) {
      toggleCheckin(set, get, adapter, 'checkin', planItemId, date);
    },

    uncheckinPlanItem(planItemId, date) {
      toggleCheckin(set, get, adapter, 'uncheckin', planItemId, date);
    },

    autoSyncPlanItems() {
      const today = dateStr();
      const s = get();
      const existingCheckins = s.planItemCheckins ?? [];
      const state = {
        habits: s.habits ?? [],
        fastingHistory: s.fastingHistory ?? [],
        activeFasting: s.activeFasting,
        medHistory: s.medHistory ?? [],
        exerciseLog: s.exerciseLog ?? [],
        checkinHistory: s.checkinHistory ?? [],
        reflections: s.reflections ?? [],
      };
      const updatedCheckins = syncPlanItemsFromModules(
        s.planItems ?? [], existingCheckins, s.plans ?? [], state, today
      );
      // Compare content, not just length — checkinItem may modify existing records in-place
      const existingMap = new Map<string, PlanItemCheckin>(existingCheckins.map((c: PlanItemCheckin) => [c.id, c]));
      const changed = (() => {
        if (updatedCheckins.length !== existingCheckins.length) return true;
        for (const c of updatedCheckins) {
          const prev = existingMap.get(c.id);
          if (!prev || prev.done !== c.done || prev.linkedModule !== c.linkedModule || prev.deleted !== c.deleted) return true;
        }
        return false;
      })();
      if (changed) {
        // Atomic: update checkins, refresh plan item stats, and update plan progress
        set(prev => {
          const newItems = refreshPlanItemStats(prev.planItems ?? [], updatedCheckins, today);
          // Update progress for all affected plans
          const affectedPlanIds = new Set(activeOnly(newItems).map(i => i.planId));
          const newPlans = (prev.plans ?? []).map(p => {
            if (!affectedPlanIds.has(p.id) || p.deleted) return p;
            return { ...p, progress: computePlanProgress(p) };
          });
          return { planItemCheckins: updatedCheckins, planItems: newItems, plans: newPlans };
        });
        // Persist all changed/new checkins
        for (const c of updatedCheckins) {
          const prev = existingMap.get(c.id);
          if (!prev || prev.done !== c.done || prev.linkedModule !== c.linkedModule || prev.deleted !== c.deleted) {
            adapter.persistChange('planItemCheckin', c.id, c).catch(e => log.error(e));
          }
        }
      }
    },

    // ═══════════════════════════════════════════════════════════════
    // Daily Custom Todos & History
    // ═══════════════════════════════════════════════════════════════

    addDailyCustomTodo(planId, name, date, recurring) {
      const today = date ?? dateStr();
      const s = get();
      const newTodos = addDailyCustomTodoBiz(s.dailyCustomTodos ?? [], planId, name, today, recurring);
      const newTodo = [...newTodos].reverse().find(t => !t.deleted);
      set(() => ({ dailyCustomTodos: newTodos }));
      if (newTodo) adapter.persistChange('dailyCustomTodo', newTodo.id, newTodo).catch(e => log.error(e));
    },

    toggleDailyCustomTodo(id, date) {
      const today = date ?? dateStr();
      const s = get();
      // Pre-compute all new state BEFORE set()
      const toggledTodos = toggleDailyCustomTodoBiz(s.dailyCustomTodos ?? [], id, today);
      const updated = toggledTodos.find((t) => t.id === id && !t.deleted);
      const updatedHistory = updated
        ? saveDailyTodoHistoryBiz(
            s.dailyTodoHistory ?? [], updated.planId, today,
            s.planItems ?? [], s.planItemCheckins ?? [], toggledTodos,
          )
        : s.dailyTodoHistory;
      const historyEntry = updated
        ? (updatedHistory ?? []).find(h => h.planId === updated.planId && h.date === today && !h.deleted)
        : undefined;

      // Pure set() — no side effects inside updater
      set(() => ({ dailyCustomTodos: toggledTodos, dailyTodoHistory: updatedHistory }));
      if (updated) adapter.persistChange('dailyCustomTodo', id, updated).catch(e => log.error(e));
      if (historyEntry) adapter.persistChange('dailyTodoHistory', historyEntry.id, historyEntry).catch(e => log.error(e));
    },

    deleteDailyCustomTodo(id) {
      set(s => ({
        dailyCustomTodos: deleteDailyCustomTodoBiz(s.dailyCustomTodos ?? [], id),
      }));
      adapter.markDeleted('dailyCustomTodo', id).catch(e => log.error(e));
    },

    saveDailyTodoHistory(planId, date) {
      const today = date ?? dateStr();
      const s = get();
      const updatedHistory = saveDailyTodoHistoryBiz(
        s.dailyTodoHistory ?? [],
        planId,
        today,
        s.planItems ?? [],
        s.planItemCheckins ?? [],
        s.dailyCustomTodos ?? [],
      );
      set({ dailyTodoHistory: updatedHistory });
      // 持久化新的或更新的历史记录
      const entry = updatedHistory.find(h => h.planId === planId && h.date === today && !h.deleted);
      if (entry) adapter.persistChange('dailyTodoHistory', entry.id, entry).catch(e => log.error(e));
    },

    performDailyReset(previousDate) {
      // Use actual current date (not just previousDate + 1) to handle multi-day gaps.
      const today = dateStr();
      const [py, pm, pd] = parseDateParts(previousDate);
      const [ty, tm, td] = parseDateParts(today);
      const dayCount = Math.round((new Date(ty, tm, td).getTime() - new Date(py, pm, pd).getTime()) / 86400000);
      if (isNaN(dayCount) || dayCount <= 0) return; // Guard: invalid dates or no reset needed

      const s = get();
      let prevDate = previousDate;
      let result!: ReturnType<typeof performDailyResetBiz>;

      // Reset each missed day sequentially so history is saved for every skipped day.
      for (let i = 0; i < dayCount; i++) {
        const baseDate = new Date(previousDate);
        baseDate.setDate(baseDate.getDate() + i + 1);
        const dayStr = dateStr(baseDate);
        result = performDailyResetBiz(
          result?.plans ?? s.plans ?? [],
          result?.planItems ?? s.planItems ?? [],
          s.planItemCheckins ?? [],
          result?.dailyCustomTodos ?? s.dailyCustomTodos ?? [],
          result?.dailyTodoHistory ?? s.dailyTodoHistory ?? [],
          prevDate,
          dayStr,
        );
        prevDate = dayStr;
      }

      if (result.hasChanges) {
        set({
          plans: result.plans,
          planItems: result.planItems,
          dailyTodoHistory: result.dailyTodoHistory,
          dailyCustomTodos: result.dailyCustomTodos,
        });

        // 持久化变更 — pre-build maps for O(1) lookup
        const origPlanMap = new Map<string, Plan>((s.plans ?? []).map((p: Plan) => [p.id, p]));
        const origItemMap = new Map<string, PlanItem>((s.planItems ?? []).map((i: PlanItem) => [i.id, i]));
        const origTodoMap = new Map<string, DailyCustomTodo>((s.dailyCustomTodos ?? []).map((t: DailyCustomTodo) => [t.id, t]));
        const origHistMap = new Map<string, DailyTodoHistory>((s.dailyTodoHistory ?? []).map((h: DailyTodoHistory) => [h.id, h]));
        for (const p of result.plans) {
          const orig = origPlanMap.get(p.id);
          if (orig && orig.updatedAt !== p.updatedAt) {
            adapter.persistChange('plan', p.id, p).catch(e => log.error(e));
          }
        }
        for (const item of result.planItems) {
          const orig = origItemMap.get(item.id);
          if (orig && orig.updatedAt !== item.updatedAt) {
            adapter.persistChange('planItem', item.id, item).catch(e => log.error(e));
          }
        }
        for (const t of result.dailyCustomTodos) {
          if (!origTodoMap.has(t.id)) {
            adapter.persistChange('dailyCustomTodo', t.id, t).catch(e => log.error(e));
          }
        }
        for (const h of result.dailyTodoHistory) {
          const orig = origHistMap.get(h.id);
          if (!orig || orig.updatedAt !== h.updatedAt) {
            adapter.persistChange('dailyTodoHistory', h.id, h).catch(e => log.error(e));
          }
        }
        // Trigger delayed plan notifications
        if (result.delayedPlans.length > 0) {
          get().notifyPlanDelayed(result.delayedPlans);
        }
      }
    },

    // ═══════════════════════════════════════════════════════════════
    // Queries & Helpers
    // ═══════════════════════════════════════════════════════════════

    getActivePlan() {
      return getActivePlanBiz(get().plans ?? []);
    },

    createPlanItem(source: PlanItemSource, form: UnifiedPlanItemForm) {
      const s = get();
      const activePlan = getActivePlanBiz(s.plans ?? []);
      if (!activePlan) return false;

      const planItemData = createPlanItemBiz(source, activePlan.id, form);
      const newItemId = uid();
      const now = Date.now();

      // Pre-compute all new state BEFORE set()
      const newItem: PlanItem = { ...planItemData, id: newItemId, updatedAt: now, deleted: false };
      const existingItems = s.planItems ?? [];
      let updatedReflections = s.reflections ?? [];
      let updatedTrails = s.thoughtTrails ?? [];
      let persistedReflection: MindReflection | undefined;
      let persistedTrail: ThoughtTrail | undefined;

      if (source.type === 'reflection') {
        updatedReflections = linkReflectionToPlanItem(updatedReflections, source.id, newItem.id);
        persistedReflection = updatedReflections.find(r => r.id === source.id && !r.deleted);
      } else if (source.type === 'trail') {
        updatedTrails = updatedTrails.map(t =>
          t.id === source.id
            ? { ...t, linkedPlanItemIds: [...(t.linkedPlanItemIds ?? []), newItem.id], updatedAt: now }
            : t,
        );
        persistedTrail = updatedTrails.find(t => t.id === source.id && !t.deleted);
      }

      // Pure set() — no side effects inside updater
      set(() => ({
        planItems: [...existingItems, newItem],
        reflections: updatedReflections,
        thoughtTrails: updatedTrails,
      }));

      // Persist using pre-computed values
      adapter.persistChange('planItem', newItemId, newItem).catch(e => log.error(e));
      if (source.type === 'reflection' && persistedReflection) {
        adapter.persistChange('reflection', source.id, persistedReflection).catch(e => log.error(e));
      } else if (source.type === 'trail' && persistedTrail) {
        adapter.persistChange('thoughtTrail', source.id, persistedTrail).catch(e => log.error(e));
      }

      return true;
    },

    /** @deprecated Use createPlanItem({ type: 'reflection', id }, form) instead */
    createPlanItemFromReflection(reflectionId, startDate, endDate, priority = 'medium', name = '', description = '', targetMetric = '') {
      return get().createPlanItem(
        { type: 'reflection', id: reflectionId },
        { name, description, targetMetric, startDate, endDate, priority },
      );
    },

    canArchivePlan(planId) {
      return canArchivePlanBiz(planId, get().planItems ?? []);
    },

    unlinkAllReflectionsFromPlan(planId) {
      const s = get();
      const planItems = s.planItems ?? [];
      const reflections = s.reflections ?? [];

      // Get all reflection IDs linked to this plan's items
      const linkedReflectionIds = planItems
        .filter(i => i.planId === planId && i.reflectionId && !i.deleted)
        .map(i => i.reflectionId!)
        .filter(Boolean);

      // Unlink from plan items
      const updatedPlanItems = unlinkAllReflectionsFromPlanBiz(planItems, planId);

      // Unlink from reflections — single pass with Set for O(N+M)
      const linkedIdSet = new Set(linkedReflectionIds);
      const now = Date.now();
      const updatedReflections = reflections.map(r =>
        linkedIdSet.has(r.id) ? { ...r, linkedPlanItemId: undefined, updatedAt: now } : r
      );

      set({ planItems: updatedPlanItems, reflections: updatedReflections });

      // Persist changes — pre-build maps for O(1) lookup
      const origItemMap = new Map<string, PlanItem>(planItems.map((i: PlanItem) => [i.id, i]));
      const origReflectionMap = new Map<string, MindReflection>(reflections.map((r) => [r.id, r]));
      for (const item of updatedPlanItems) {
        const orig = origItemMap.get(item.id);
        if (orig && orig.updatedAt !== item.updatedAt) {
          adapter.persistChange('planItem', item.id, item).catch(e => log.error(e));
        }
      }
      for (const r of updatedReflections) {
        const orig = origReflectionMap.get(r.id);
        if (orig && orig.updatedAt !== r.updatedAt) {
          adapter.persistChange('reflection', r.id, r).catch(e => log.error(e));
        }
      }
    },

    async notifyPlanDelayed(delayedPlans) {
      const s = get();
      const userId = s.auth?.user?.id;
      const token = s.auth?.token;
      if (!userId || !token) return;

      const now = Date.now();

      for (const plan of delayedPlans) {
        // Skip if already notified
        if (plan.lastDelayedNotifyAt) continue;

        try {
          await notifyDelayedPlan({
            planId: plan.id,
            planName: plan.name,
            endDate: plan.endDate,
            userId,
            token,
          });

          // Update plan with notification timestamp — re-read to avoid stale overwrite
          const currentPlan = get().plans.find(p => p.id === plan.id && !p.deleted);
          if (!currentPlan) continue; // Plan was deleted while notification was in flight
          const updatedPlan = { ...currentPlan, lastDelayedNotifyAt: now, updatedAt: now };
          set(s => ({
            plans: (s.plans ?? []).map(p => p.id === plan.id ? updatedPlan : p),
          }));

          // Persist change
          adapter.persistChange('plan', plan.id, updatedPlan).catch(e => log.error(e));
        } catch (err) {
          log.error(err, { context: 'delayed plan notification' });
        }
      }
    },
  });
}
