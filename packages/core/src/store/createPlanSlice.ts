import type { Plan, PlanItem, PlanItemCheckin, DailyCustomTodo, DailyTodoHistory, PlanItemSource, UnifiedPlanItemForm } from '../types';
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
      const p = get().plans.find(p => p.id === planId);
      if (p) adapter.persistChange('plan', p.id, p).catch(console.error);
      return planId;
    },

    updatePlan(id, patch) {
      set(s => ({ plans: updatePlan(s.plans ?? [], id, patch) }));
      const updated = get().plans.find(p => p.id === id);
      if (updated) adapter.persistChange('plan', id, updated).catch(console.error);
    },

    deletePlan(id) {
      const s = get();
      const plan = (s.plans ?? []).find(p => p.id === id);
      if (!plan || !canDeletePlan(plan.status)) return;
      s.addToRecycleBin({ id, entityType: 'plan', data: plan });
      const now = Date.now();
      const deletedItemIds: string[] = [];
      const deletedCheckinIds: string[] = [];
      const deletedItemIdsSet = new Set<string>();
      set(prev => {
        // Pre-build planId index for O(1) checkin lookup
        const planIdByItemId = new Map<string, string>();
        for (const i of (prev.planItems ?? [])) {
          planIdByItemId.set(i.id, i.planId);
        }
        return {
          plans: deletePlan(prev.plans ?? [], id),
          planItems: (prev.planItems ?? []).map(i => {
            if (i.planId === id) {
              deletedItemIds.push(i.id);
              deletedItemIdsSet.add(i.id);
              return { ...i, deleted: true, updatedAt: now };
            }
            return i;
          }),
          planItemCheckins: (prev.planItemCheckins ?? []).map(c => {
            if (planIdByItemId.get(c.planItemId) === id) {
              deletedCheckinIds.push(c.id);
              return { ...c, deleted: true, updatedAt: now };
            }
            return c;
          }),
          reflections: (prev.reflections ?? []).map(r =>
            r.linkedPlanItemId && deletedItemIdsSet.has(r.linkedPlanItemId)
              ? { ...r, linkedPlanItemId: undefined, updatedAt: now }
              : r,
          ),
        };
      });
      adapter.markDeleted('plan', id).catch(console.error);
      deletedItemIds.forEach(itemId => adapter.markDeleted('planItem', itemId).catch(console.error));
      deletedCheckinIds.forEach(checkinId => adapter.markDeleted('planItemCheckin', checkinId).catch(console.error));
      // 清除关联感念的 linkedPlanItemId
      (get().reflections ?? [])
        .filter(r => r.linkedPlanItemId && deletedItemIdsSet.has(r.linkedPlanItemId))
        .forEach(r => adapter.persistChange('reflection', r.id, r).catch(console.error));
    },

    startPlan(id) {
      const s = get();
      const result = startPlan(s.plans ?? [], s.planItems ?? [], id);
      set({ plans: result.plans, planItems: result.planItems });
      const updated = result.plans.find(p => p.id === id);
      if (updated) adapter.persistChange('plan', id, updated).catch(console.error);
      result.planItems.filter(i => i.planId === id)
        .forEach(i => adapter.persistChange('planItem', i.id, i).catch(console.error));
    },

    pausePlan(id) {
      const s = get();
      const result = pausePlan(s.plans ?? [], s.planItems ?? [], id);
      set({ plans: result.plans, planItems: result.planItems });
      const updated = result.plans.find(p => p.id === id);
      if (updated) adapter.persistChange('plan', id, updated).catch(console.error);
      result.planItems.filter(i => i.planId === id)
        .forEach(i => adapter.persistChange('planItem', i.id, i).catch(console.error));
    },

    resumePlan(id) {
      const s = get();
      const result = resumePlan(s.plans ?? [], s.planItems ?? [], id);
      set({ plans: result.plans, planItems: result.planItems });
      const updated = result.plans.find(p => p.id === id);
      if (updated) adapter.persistChange('plan', id, updated).catch(console.error);
      result.planItems.filter(i => i.planId === id)
        .forEach(i => adapter.persistChange('planItem', i.id, i).catch(console.error));
    },

    completePlan(id) {
      const s = get();
      const result = completePlan(s.plans ?? [], s.planItems ?? [], id);
      set({ plans: result.plans, planItems: result.planItems });
      const updated = result.plans.find(p => p.id === id);
      if (updated) adapter.persistChange('plan', id, updated).catch(console.error);
      result.planItems.filter(i => i.planId === id)
        .forEach(i => adapter.persistChange('planItem', i.id, i).catch(console.error));
    },

    cancelPlan(id) {
      const s = get();
      const result = cancelPlan(s.plans ?? [], s.planItems ?? [], id);
      set({ plans: result.plans, planItems: result.planItems });
      const updated = result.plans.find(p => p.id === id);
      if (updated) adapter.persistChange('plan', id, updated).catch(console.error);
      result.planItems.filter(i => i.planId === id)
        .forEach(i => adapter.persistChange('planItem', i.id, i).catch(console.error));
    },

    checkAutoStatus() {
      const today = dateStr();
      const s = get();
      const result = checkAutoStatus(s.plans ?? [], s.planItems ?? [], today);
      set({ plans: result.plans, planItems: result.planItems });
      // Persist changed plans/items — pre-build maps for O(1) lookup
      const origPlanMap = new Map((s.plans ?? []).map(p => [p.id, p]));
      const origItemMap = new Map((s.planItems ?? []).map(i => [i.id, i]));
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
      set(s => ({ planItems: addPlanItem(s.planItems ?? [], form, s.plans) }));
      const items = get().planItems;
      const item = items[items.length - 1];
      if (item) adapter.persistChange('planItem', item.id, item).catch(console.error);
    },

    updatePlanItem(id, patch) {
      set(s => ({ planItems: updatePlanItem(s.planItems ?? [], id, patch) }));
      const updated = get().planItems.find(i => i.id === id);
      if (updated) adapter.persistChange('planItem', id, updated).catch(console.error);
    },

    deletePlanItem(id) {
      const now = Date.now();
      const deletedCheckinIds: string[] = [];
      set(prev => ({
        planItems: deletePlanItem(prev.planItems ?? [], id),
        planItemCheckins: (prev.planItemCheckins ?? []).map(c => {
          if (c.planItemId === id) {
            deletedCheckinIds.push(c.id);
            return { ...c, deleted: true, updatedAt: now };
          }
          return c;
        }),
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
      // 清除关联感念的 linkedPlanItemId
      (get().reflections ?? [])
        .filter(r => r.linkedPlanItemId === id)
        .forEach(r => adapter.persistChange('reflection', r.id, r).catch(console.error));
      // 清除关联脉络的 linkedPlanItemIds
      (get().thoughtTrails ?? [])
        .filter(t => t.linkedPlanItemIds?.includes(id))
        .forEach(t => adapter.persistChange('thoughtTrail', t.id, t).catch(console.error));
    },

    checkinPlanItem(planItemId, date) {
      const today = date ?? dateStr();
      const todayStr = dateStr();
      set(s => {
        const newCheckins = checkinItem(s.planItemCheckins ?? [], planItemId, today);
        const newItems = refreshPlanItemStats(s.planItems ?? [], newCheckins, todayStr);
        const item = newItems.find(i => i.id === planItemId);
        const newHistory = item
          ? saveDailyTodoHistoryBiz(s.dailyTodoHistory ?? [], item.planId, today, newItems, newCheckins, s.dailyCustomTodos ?? [])
          : s.dailyTodoHistory;
        return { planItemCheckins: newCheckins, planItems: newItems, dailyTodoHistory: newHistory };
      });
      // Persist
      const state = get();
      const checkin = state.planItemCheckins.find(c => c.planItemId === planItemId && c.date === today);
      if (checkin) adapter.persistChange('planItemCheckin', checkin.id, checkin).catch(console.error);
      const item = state.planItems.find(i => i.id === planItemId);
      if (item) {
        const entry = (state.dailyTodoHistory ?? []).find(h => h.planId === item.planId && h.date === today);
        if (entry) adapter.persistChange('dailyTodoHistory', entry.id, entry).catch(console.error);
      }
    },

    uncheckinPlanItem(planItemId, date) {
      const today = date ?? dateStr();
      const todayStr = dateStr();
      set(s => {
        const newCheckins = uncheckinItem(s.planItemCheckins ?? [], planItemId, today);
        const newItems = refreshPlanItemStats(s.planItems ?? [], newCheckins, todayStr);
        const item = newItems.find(i => i.id === planItemId);
        const newHistory = item
          ? saveDailyTodoHistoryBiz(s.dailyTodoHistory ?? [], item.planId, today, newItems, newCheckins, s.dailyCustomTodos ?? [])
          : s.dailyTodoHistory;
        return { planItemCheckins: newCheckins, planItems: newItems, dailyTodoHistory: newHistory };
      });
      // Persist
      const state = get();
      const checkin = state.planItemCheckins.find(c => c.planItemId === planItemId && c.date === today);
      if (checkin) adapter.persistChange('planItemCheckin', checkin.id, checkin).catch(console.error);
      const item = state.planItems.find(i => i.id === planItemId);
      if (item) {
        const entry = (state.dailyTodoHistory ?? []).find(h => h.planId === item.planId && h.date === today);
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
      const existingMap = new Map(existingCheckins.map(c => [c.id, c]));
      const changed = (() => {
        if (updatedCheckins.length !== existingCheckins.length) return true;
        for (const c of updatedCheckins) {
          const prev = existingMap.get(c.id);
          if (!prev || prev.done !== c.done || prev.linkedModule !== c.linkedModule || prev.deleted !== c.deleted) return true;
        }
        return false;
      })();
      if (changed) {
        set({ planItemCheckins: updatedCheckins });
        // Persist all changed/new checkins
        for (const c of updatedCheckins) {
          const prev = existingMap.get(c.id);
          if (!prev || prev.done !== c.done || prev.linkedModule !== c.linkedModule || prev.deleted !== c.deleted) {
            adapter.persistChange('planItemCheckin', c.id, c).catch(console.error);
          }
        }
        set(prev => ({
          planItems: refreshPlanItemStats(prev.planItems ?? [], updatedCheckins, today),
        }));
      }
    },

    addDailyCustomTodo(planId, name, date, recurring) {
      const today = date ?? dateStr();
      set(s => ({
        dailyCustomTodos: addDailyCustomTodoBiz(s.dailyCustomTodos ?? [], planId, name, today, recurring),
      }));
      const todos = get().dailyCustomTodos;
      const newTodo = todos[todos.length - 1];
      if (newTodo) adapter.persistChange('dailyCustomTodo', newTodo.id, newTodo).catch(console.error);
    },

    toggleDailyCustomTodo(id, date) {
      const today = date ?? dateStr();
      set(s => ({
        dailyCustomTodos: toggleDailyCustomTodoBiz(s.dailyCustomTodos ?? [], id, today),
      }));
      const updated = get().dailyCustomTodos.find(t => t.id === id);
      if (updated) adapter.persistChange('dailyCustomTodo', id, updated).catch(console.error);
      // 自动保存当天待办历史
      if (updated) {
        const s = get();
        const updatedHistory = saveDailyTodoHistoryBiz(
          s.dailyTodoHistory ?? [], updated.planId, today,
          s.planItems ?? [], s.planItemCheckins ?? [], s.dailyCustomTodos ?? [],
        );
        set({ dailyTodoHistory: updatedHistory });
        const entry = updatedHistory.find(h => h.planId === updated.planId && h.date === today);
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
      const entry = updatedHistory.find(h => h.planId === planId && h.date === today);
      if (entry) adapter.persistChange('dailyTodoHistory', entry.id, entry).catch(console.error);
    },

    performDailyReset(previousDate) {
      // Derive today from previousDate to handle backfill correctly
      const d = new Date(previousDate);
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
        const origPlanMap = new Map((s.plans ?? []).map(p => [p.id, p]));
        const origItemMap = new Map((s.planItems ?? []).map(i => [i.id, i]));
        const origTodoMap = new Map((s.dailyCustomTodos ?? []).map(t => [t.id, t]));
        const origHistMap = new Map((s.dailyTodoHistory ?? []).map(h => [h.id, h]));
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

      set(prev => {
        const items = prev.planItems ?? [];
        const newItem: PlanItem = {
          ...planItemData,
          id: uid(),
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

        adapter.persistChange('planItem', newItem.id, newItem).catch(console.error);
        if (source.type === 'reflection') {
          const updatedReflection = updatedReflections.find(r => r.id === source.id);
          if (updatedReflection) {
            adapter.persistChange('reflection', source.id, updatedReflection).catch(console.error);
          }
        } else if (source.type === 'trail') {
          const updatedTrail = updatedTrails.find(t => t.id === source.id);
          if (updatedTrail) {
            adapter.persistChange('thoughtTrail', source.id, updatedTrail).catch(console.error);
          }
        }

        return { planItems: [...items, newItem], reflections: updatedReflections, thoughtTrails: updatedTrails };
      });

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
      const origItemMap = new Map(planItems.map(i => [i.id, i]));
      const origReflectionMap = new Map(reflections.map(r => [r.id, r]));
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
          const apiBase = process.env.EXPO_PUBLIC_API_BASE || 'https://egoless-do.vercel.app';
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

          // Update plan with notification timestamp
          const updatedPlan = { ...plan, lastDelayedNotifyAt: now, updatedAt: now };
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
