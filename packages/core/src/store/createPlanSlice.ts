import type { Plan, PlanItem, PlanItemCheckin, DailyCustomTodo, DailyTodoHistory, PlanItemSource, UnifiedPlanItemForm, RecycleBinItem } from '../types';
import {
  addPlan, updatePlan, deletePlan, canDeletePlan,
  startPlan, pausePlan, resumePlan, completePlan, cancelPlan,
  checkAutoStatus, performDailyReset as performDailyResetBiz,
  addPlanItem, updatePlanItem, deletePlanItem,
  checkinItem, uncheckinItem,
  syncPlanItemsFromModules, refreshPlanItemStats,
  addDailyCustomTodo as addDailyCustomTodoBiz,
  toggleDailyCustomTodo as toggleDailyCustomTodoBiz,
  deleteDailyCustomTodo as deleteDailyCustomTodoBiz,
  saveDailyTodoHistory as saveDailyTodoHistoryBiz,
  getActivePlan as getActivePlanBiz,
  createPlanItem as createPlanItemBiz,
  createPlanItemFromReflection as createPlanItemFromReflectionBiz,
  canArchivePlan as canArchivePlanBiz,
  unlinkAllReflectionsFromPlan as unlinkAllReflectionsFromPlanBiz,
} from '../business/plan';
import {
  linkReflectionToPlanItem,
} from '../business/reflections';
import { uid, dateStr } from '../utils';
import type { StorageAdapter, PlanSlice } from './types';
import type { SliceCreator } from './sliceHelper';

export function createPlanSlice(
  adapter: StorageAdapter,
): SliceCreator<PlanSlice> {
  return (set: any, get: any) => ({
    plans: [],
    planItems: [],
    planItemCheckins: [],
    dailyCustomTodos: [],
    dailyTodoHistory: [],

    addPlan(form) {
      let planId = '';
      set(s => {
        const result = addPlan(s.plans ?? [], form);
        if (!result) return {}; // No change if active plan exists
        planId = result.planId;
        return { plans: result.plans };
      });
      if (!planId) return '';
      const p = get().plans.find(p => p.id === planId && !p.deleted);
      if (p) adapter.persistChange('plan', p.id, p).catch(console.error);
      return planId;
    },

    updatePlan(id, patch) {
      set(s => ({ plans: updatePlan(s.plans ?? [], id, patch) }));
      const updated = get().plans.find(p => p.id === id && !p.deleted);
      if (updated) adapter.persistChange('plan', id, updated).catch(console.error);
    },

    deletePlan(id) {
      const s = get();
      const plan = (s.plans ?? []).find(p => p.id === id && !p.deleted);
      if (!plan || !canDeletePlan(plan.status)) return;
      const now = Date.now();
      // Pre-compute ALL affected IDs BEFORE set() to keep updater pure
      const planItemsToDelete = (s.planItems ?? []).filter(i => i.planId === id && !i.deleted);
      const deletedItemIdsSet = new Set(planItemsToDelete.map(i => i.id));
      const deletedItemIds = planItemsToDelete.map(i => i.id);
      const planIdByItemId = new Map<string, string>();
      for (const i of (s.planItems ?? [])) {
        planIdByItemId.set(i.id, i.planId);
      }
      const deletedCheckinIds = (s.planItemCheckins ?? [])
        .filter(c => planIdByItemId.get(c.planItemId) === id && !c.deleted)
        .map(c => c.id);
      const affectedReflectionIds = (s.reflections ?? [])
        .filter(r => !r.deleted && r.linkedPlanItemId && deletedItemIdsSet.has(r.linkedPlanItemId))
        .map(r => r.id);
      const recycleEntry: RecycleBinItem = { id, entityType: 'plan', data: plan, deletedAt: now };

      // Atomic: recycle bin + deletion in one set()
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
          r.linkedPlanItemId && deletedItemIdsSet.has(r.linkedPlanItemId)
            ? { ...r, linkedPlanItemId: undefined, updatedAt: now }
            : r,
        ),
      }));
      adapter.markDeleted('plan', id).catch(console.error);
      deletedItemIds.forEach(itemId => adapter.markDeleted('planItem', itemId).catch(console.error));
      deletedCheckinIds.forEach(checkinId => adapter.markDeleted('planItemCheckin', checkinId).catch(console.error));
      // Persist affected reflections by ID (linkedPlanItemId already cleared in set())
      affectedReflectionIds.forEach(rid => {
        const r = get().reflections.find(x => x.id === rid && !x.deleted);
        if (r) adapter.persistChange('reflection', rid, r).catch(console.error);
      });
    },

    startPlan(id) {
      const s = get();
      const result = startPlan(s.plans ?? [], s.planItems ?? [], id);
      set({ plans: result.plans, planItems: result.planItems });
      const updated = result.plans.find(p => p.id === id && !p.deleted);
      if (updated) adapter.persistChange('plan', id, updated).catch(console.error);
      result.planItems.filter(i => i.planId === id && !i.deleted)
        .forEach(i => adapter.persistChange('planItem', i.id, i).catch(console.error));
    },

    pausePlan(id) {
      const s = get();
      const result = pausePlan(s.plans ?? [], s.planItems ?? [], id);
      set({ plans: result.plans, planItems: result.planItems });
      const updated = result.plans.find(p => p.id === id && !p.deleted);
      if (updated) adapter.persistChange('plan', id, updated).catch(console.error);
      result.planItems.filter(i => i.planId === id && !i.deleted)
        .forEach(i => adapter.persistChange('planItem', i.id, i).catch(console.error));
    },

    resumePlan(id) {
      const s = get();
      const result = resumePlan(s.plans ?? [], s.planItems ?? [], id);
      set({ plans: result.plans, planItems: result.planItems });
      const updated = result.plans.find(p => p.id === id && !p.deleted);
      if (updated) adapter.persistChange('plan', id, updated).catch(console.error);
      result.planItems.filter(i => i.planId === id && !i.deleted)
        .forEach(i => adapter.persistChange('planItem', i.id, i).catch(console.error));
    },

    completePlan(id) {
      const s = get();
      const result = completePlan(s.plans ?? [], s.planItems ?? [], id);
      set({ plans: result.plans, planItems: result.planItems });
      const updated = result.plans.find(p => p.id === id && !p.deleted);
      if (updated) adapter.persistChange('plan', id, updated).catch(console.error);
      result.planItems.filter(i => i.planId === id && !i.deleted)
        .forEach(i => adapter.persistChange('planItem', i.id, i).catch(console.error));
    },

    cancelPlan(id) {
      const s = get();
      const result = cancelPlan(s.plans ?? [], s.planItems ?? [], id);
      set({ plans: result.plans, planItems: result.planItems });
      const updated = result.plans.find(p => p.id === id && !p.deleted);
      if (updated) adapter.persistChange('plan', id, updated).catch(console.error);
      result.planItems.filter(i => i.planId === id && !i.deleted)
        .forEach(i => adapter.persistChange('planItem', i.id, i).catch(console.error));
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
          adapter.persistChange('plan', p.id, p).catch(console.error);
        }
      }
      for (const item of result.planItems) {
        const orig = origItemMap.get(item.id);
        if (orig && orig.updatedAt !== item.updatedAt) {
          adapter.persistChange('planItem', item.id, item).catch(console.error);
        }
      }
      // Trigger delayed plan notifications
      if (result.delayedPlans.length > 0) {
        get().notifyPlanDelayed(result.delayedPlans);
      }
    },

    addPlanItem(form) {
      const prevCount = (get().planItems ?? []).filter(i => !i.deleted).length;
      set(s => ({ planItems: addPlanItem(s.planItems ?? [], form, s.plans) }));
      const items = get().planItems;
      if (items.filter(i => !i.deleted).length > prevCount) {
        const item = items[items.length - 1];
        if (item) adapter.persistChange('planItem', item.id, item).catch(console.error);
      }
    },

    updatePlanItem(id, patch) {
      set(s => ({ planItems: updatePlanItem(s.planItems ?? [], id, patch) }));
      const updated = get().planItems.find(i => i.id === id && !i.deleted);
      if (updated) adapter.persistChange('planItem', id, updated).catch(console.error);
    },

    deletePlanItem(id) {
      const now = Date.now();
      // Pre-compute ALL affected IDs BEFORE set() to keep updater pure
      const deletedCheckinIds = (get().planItemCheckins ?? [])
        .filter(c => c.planItemId === id && !c.deleted)
        .map(c => c.id);
      const affectedReflectionIds = (get().reflections ?? [])
        .filter(r => !r.deleted && r.linkedPlanItemId === id)
        .map(r => r.id);
      const affectedTrailIds = (get().thoughtTrails ?? [])
        .filter(t => !t.deleted && t.linkedPlanItemIds?.includes(id))
        .map(t => t.id);
      set(prev => ({
        planItems: deletePlanItem(prev.planItems ?? [], id),
        planItemCheckins: (prev.planItemCheckins ?? []).map(c =>
          c.planItemId === id && !c.deleted ? { ...c, deleted: true, updatedAt: now } : c,
        ),
        reflections: (prev.reflections ?? []).map(r =>
          r.linkedPlanItemId === id ? { ...r, linkedPlanItemId: undefined, updatedAt: now } : r,
        ),
        thoughtTrails: (prev.thoughtTrails ?? []).map(t =>
          t.linkedPlanItemIds?.includes(id)
            ? { ...t, linkedPlanItemIds: t.linkedPlanItemIds.filter(pid => pid !== id), updatedAt: now }
            : t,
        ),
      }));
      adapter.markDeleted('planItem', id).catch(console.error);
      deletedCheckinIds.forEach(checkinId => adapter.markDeleted('planItemCheckin', checkinId).catch(console.error));
      // Persist affected reflections by captured IDs (linkedPlanItemId already cleared in set())
      affectedReflectionIds.forEach(rid => {
        const r = get().reflections.find(x => x.id === rid && !x.deleted);
        if (r) adapter.persistChange('reflection', rid, r).catch(console.error);
      });
      // Persist affected thought trails by captured IDs (linkedPlanItemIds already filtered in set())
      affectedTrailIds.forEach(tid => {
        const t = get().thoughtTrails.find(x => x.id === tid && !x.deleted);
        if (t) adapter.persistChange('thoughtTrail', tid, t).catch(console.error);
      });
    },

    checkinPlanItem(planItemId, date) {
      const today = date ?? dateStr();
      set(s => {
        const newCheckins = checkinItem(s.planItemCheckins ?? [], planItemId, today);
        const newItems = refreshPlanItemStats(s.planItems ?? [], newCheckins, today);
        const item = newItems.find(i => i.id === planItemId && !i.deleted);
        const newHistory = item
          ? saveDailyTodoHistoryBiz(s.dailyTodoHistory ?? [], item.planId, today, newItems, newCheckins, s.dailyCustomTodos ?? [])
          : s.dailyTodoHistory;
        return { planItemCheckins: newCheckins, planItems: newItems, dailyTodoHistory: newHistory };
      });
      // Persist
      const state = get();
      const checkin = state.planItemCheckins.find(c => c.planItemId === planItemId && c.date === today && !c.deleted);
      if (checkin) adapter.persistChange('planItemCheckin', checkin.id, checkin).catch(console.error);
      const item = state.planItems.find(i => i.id === planItemId && !i.deleted);
      if (item) {
        const entry = (state.dailyTodoHistory ?? []).find(h => h.planId === item.planId && h.date === today && !h.deleted);
        if (entry) adapter.persistChange('dailyTodoHistory', entry.id, entry).catch(console.error);
      }
    },

    uncheckinPlanItem(planItemId, date) {
      const today = date ?? dateStr();
      set(s => {
        const newCheckins = uncheckinItem(s.planItemCheckins ?? [], planItemId, today);
        const newItems = refreshPlanItemStats(s.planItems ?? [], newCheckins, today);
        const item = newItems.find(i => i.id === planItemId && !i.deleted);
        const newHistory = item
          ? saveDailyTodoHistoryBiz(s.dailyTodoHistory ?? [], item.planId, today, newItems, newCheckins, s.dailyCustomTodos ?? [])
          : s.dailyTodoHistory;
        return { planItemCheckins: newCheckins, planItems: newItems, dailyTodoHistory: newHistory };
      });
      // Persist
      const state = get();
      const checkin = state.planItemCheckins.find(c => c.planItemId === planItemId && c.date === today && !c.deleted);
      if (checkin) adapter.persistChange('planItemCheckin', checkin.id, checkin).catch(console.error);
      const item = state.planItems.find(i => i.id === planItemId && !i.deleted);
      if (item) {
        const entry = (state.dailyTodoHistory ?? []).find(h => h.planId === item.planId && h.date === today && !h.deleted);
        if (entry) adapter.persistChange('dailyTodoHistory', entry.id, entry).catch(console.error);
      }
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
        // Atomic: update checkins and refresh plan item stats in one set()
        set(prev => ({
          planItemCheckins: updatedCheckins,
          planItems: refreshPlanItemStats(prev.planItems ?? [], updatedCheckins, today),
        }));
        // Persist all changed/new checkins
        for (const c of updatedCheckins) {
          const prev = existingMap.get(c.id);
          if (!prev || prev.done !== c.done || prev.linkedModule !== c.linkedModule || prev.deleted !== c.deleted) {
            adapter.persistChange('planItemCheckin', c.id, c).catch(console.error);
          }
        }
      }
    },

    addDailyCustomTodo(planId, name, date, recurring) {
      const today = date ?? dateStr();
      set(s => ({
        dailyCustomTodos: addDailyCustomTodoBiz(s.dailyCustomTodos ?? [], planId, name, today, recurring),
      }));
      const newTodo = [...get().dailyCustomTodos].reverse().find(t => !t.deleted);
      if (newTodo) adapter.persistChange('dailyCustomTodo', newTodo.id, newTodo).catch(console.error);
    },

    toggleDailyCustomTodo(id, date) {
      const today = date ?? dateStr();
      // Atomic: toggle todo and save history snapshot in one set()
      set(s => {
        const toggledTodos = toggleDailyCustomTodoBiz(s.dailyCustomTodos ?? [], id, today);
        const updated = toggledTodos.find((t: any) => t.id === id && !t.deleted);
        const updatedHistory = updated
          ? saveDailyTodoHistoryBiz(
              s.dailyTodoHistory ?? [], updated.planId, today,
              s.planItems ?? [], s.planItemCheckins ?? [], toggledTodos,
            )
          : s.dailyTodoHistory;
        return { dailyCustomTodos: toggledTodos, dailyTodoHistory: updatedHistory };
      });
      const updated = get().dailyCustomTodos.find(t => t.id === id && !t.deleted);
      if (updated) adapter.persistChange('dailyCustomTodo', id, updated).catch(console.error);
      // 自动保存当天待办历史
      if (updated) {
        const s = get();
        const entry = (s.dailyTodoHistory ?? []).find(h => h.planId === updated.planId && h.date === today && !h.deleted);
        if (entry) adapter.persistChange('dailyTodoHistory', entry.id, entry).catch(console.error);
      }
    },

    deleteDailyCustomTodo(id) {
      set(s => ({
        dailyCustomTodos: deleteDailyCustomTodoBiz(s.dailyCustomTodos ?? [], id),
      }));
      adapter.markDeleted('dailyCustomTodo', id).catch(console.error);
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
      if (entry) adapter.persistChange('dailyTodoHistory', entry.id, entry).catch(console.error);
    },

    performDailyReset(previousDate) {
      // Derive today from previousDate to handle backfill correctly
      const [py, pm, pd] = previousDate.split('-').map(Number);
      const d = new Date(py, pm - 1, pd);
      d.setDate(d.getDate() + 1);
      const today = dateStr(d);
      const s = get();
      const result = performDailyResetBiz(
        s.plans ?? [],
        s.planItems ?? [],
        s.planItemCheckins ?? [],
        s.dailyCustomTodos ?? [],
        s.dailyTodoHistory ?? [],
        previousDate,
        today,
      );

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
            adapter.persistChange('plan', p.id, p).catch(console.error);
          }
        }
        for (const item of result.planItems) {
          const orig = origItemMap.get(item.id);
          if (orig && orig.updatedAt !== item.updatedAt) {
            adapter.persistChange('planItem', item.id, item).catch(console.error);
          }
        }
        for (const t of result.dailyCustomTodos) {
          if (!origTodoMap.has(t.id)) {
            adapter.persistChange('dailyCustomTodo', t.id, t).catch(console.error);
          }
        }
        for (const h of result.dailyTodoHistory) {
          const orig = origHistMap.get(h.id);
          if (!orig || orig.updatedAt !== h.updatedAt) {
            adapter.persistChange('dailyTodoHistory', h.id, h).catch(console.error);
          }
        }
        // Trigger delayed plan notifications
        if (result.delayedPlans.length > 0) {
          get().notifyPlanDelayed(result.delayedPlans);
        }
      }
    },

    getActivePlan() {
      return getActivePlanBiz(get().plans ?? []);
    },

    createPlanItem(source: PlanItemSource, form: UnifiedPlanItemForm) {
      const s = get();
      const activePlan = getActivePlanBiz(s.plans ?? []);
      if (!activePlan) return false;

      const planItemData = createPlanItemBiz(source, activePlan.id, form);
      const newItemId = uid();

      set(prev => {
        const items = prev.planItems ?? [];
        const newItem: PlanItem = {
          ...planItemData,
          id: newItemId,
          updatedAt: Date.now(),
          deleted: false,
        };
        let updatedReflections = prev.reflections ?? [];
        let updatedTrails = prev.thoughtTrails ?? [];

        if (source.type === 'reflection') {
          updatedReflections = linkReflectionToPlanItem(
            updatedReflections, source.id, newItem.id,
          );
        } else if (source.type === 'trail') {
          updatedTrails = updatedTrails.map(t =>
            t.id === source.id
              ? {
                  ...t,
                  linkedPlanItemIds: [...(t.linkedPlanItemIds ?? []), newItem.id],
                  updatedAt: Date.now(),
                }
              : t,
          );
        }

        return { planItems: [...items, newItem], reflections: updatedReflections, thoughtTrails: updatedTrails };
      });

      // Persist AFTER set() to keep updater pure
      const newItem = get().planItems.find(i => i.id === newItemId && !i.deleted);
      if (newItem) adapter.persistChange('planItem', newItemId, newItem).catch(console.error);
      if (source.type === 'reflection') {
        const updatedReflection = get().reflections.find(r => r.id === source.id && !r.deleted);
        if (updatedReflection) adapter.persistChange('reflection', source.id, updatedReflection).catch(console.error);
      } else if (source.type === 'trail') {
        const updatedTrail = get().thoughtTrails.find(t => t.id === source.id && !t.deleted);
        if (updatedTrail) adapter.persistChange('thoughtTrail', source.id, updatedTrail).catch(console.error);
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
      const origReflectionMap = new Map<string, any>(reflections.map((r: any) => [r.id, r]));
      for (const item of updatedPlanItems) {
        const orig = origItemMap.get(item.id);
        if (orig && orig.updatedAt !== item.updatedAt) {
          adapter.persistChange('planItem', item.id, item).catch(console.error);
        }
      }
      for (const r of updatedReflections) {
        const orig = origReflectionMap.get(r.id);
        if (orig && orig.updatedAt !== r.updatedAt) {
          adapter.persistChange('reflection', r.id, r).catch(console.error);
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
          // Call API to send email notification
          const apiBase = process.env.EXPO_PUBLIC_API_BASE || 'https://egolessdo.freebytes.net';
          await fetch(`${apiBase}/api/plan/notify-delayed`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              planId: plan.id,
              planName: plan.name,
              endDate: plan.endDate,
              userId,
            }),
          });

          // Update plan with notification timestamp — re-read to avoid stale overwrite
          const currentPlan = get().plans.find(p => p.id === plan.id && !p.deleted);
          if (!currentPlan) continue; // Plan was deleted while notification was in flight
          const updatedPlan = { ...currentPlan, lastDelayedNotifyAt: now, updatedAt: now };
          set(s => ({
            plans: (s.plans ?? []).map(p => p.id === plan.id ? updatedPlan : p),
          }));

          // Persist change
          adapter.persistChange('plan', plan.id, updatedPlan).catch(console.error);
        } catch (err) {
          console.error('Failed to send delayed plan notification:', err);
        }
      }
    },
  });
}
