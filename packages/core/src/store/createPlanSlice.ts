import type { Plan, PlanItem, PlanItemCheckin, DailyCustomTodo, DailyTodoHistory } from '../types';
import {
  addPlan, updatePlan, deletePlan, canDeletePlan,
  startPlan, pausePlan, resumePlan, completePlan, cancelPlan,
  checkPlanAutoStatus, performDailyReset as performDailyResetBiz,
  addPlanItem, updatePlanItem, deletePlanItem,
  checkinItem, uncheckinItem,
  syncPlanItemsFromModules, refreshPlanItemStats,
  addDailyCustomTodo as addDailyCustomTodoBiz,
  toggleDailyCustomTodo as toggleDailyCustomTodoBiz,
  deleteDailyCustomTodo as deleteDailyCustomTodoBiz,
  saveDailyTodoHistory as saveDailyTodoHistoryBiz,
  getActivePlan as getActivePlanBiz,
  createPlanItemFromReflection as createPlanItemFromReflectionBiz,
  canArchivePlan as canArchivePlanBiz,
  unlinkAllReflectionsFromPlan as unlinkAllReflectionsFromPlanBiz,
} from '../business/plan';
import {
  linkReflectionToPlanItem, unlinkReflectionFromPlanItem,
} from '../business/reflections';
import { uid, dateStr } from '../utils';
import type { StorageAdapter, PlanSlice } from './types';
import type { SliceCreator } from './sliceHelper';

export function createPlanSlice(
  adapter: StorageAdapter,
): SliceCreator<PlanSlice> {
  return (set, get) => ({
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
      set(prev => ({
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
          const item = (prev.planItems ?? []).find(i => i.id === c.planItemId);
          if (item?.planId === id) {
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
      }));
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
      const updated = get().plans.find(p => p.id === id);
      if (updated) adapter.persistChange('plan', id, updated).catch(console.error);
      get().planItems.filter(i => i.planId === id)
        .forEach(i => adapter.persistChange('planItem', i.id, i).catch(console.error));
    },

    pausePlan(id) {
      const s = get();
      const result = pausePlan(s.plans ?? [], s.planItems ?? [], id);
      set({ plans: result.plans, planItems: result.planItems });
      const updated = get().plans.find(p => p.id === id);
      if (updated) adapter.persistChange('plan', id, updated).catch(console.error);
      get().planItems.filter(i => i.planId === id)
        .forEach(i => adapter.persistChange('planItem', i.id, i).catch(console.error));
    },

    resumePlan(id) {
      const s = get();
      const result = resumePlan(s.plans ?? [], s.planItems ?? [], id);
      set({ plans: result.plans, planItems: result.planItems });
      const updated = get().plans.find(p => p.id === id);
      if (updated) adapter.persistChange('plan', id, updated).catch(console.error);
      get().planItems.filter(i => i.planId === id)
        .forEach(i => adapter.persistChange('planItem', i.id, i).catch(console.error));
    },

    completePlan(id) {
      const s = get();
      const result = completePlan(s.plans ?? [], s.planItems ?? [], id);
      set({ plans: result.plans, planItems: result.planItems });
      const updated = get().plans.find(p => p.id === id);
      if (updated) adapter.persistChange('plan', id, updated).catch(console.error);
      get().planItems.filter(i => i.planId === id)
        .forEach(i => adapter.persistChange('planItem', i.id, i).catch(console.error));
    },

    cancelPlan(id) {
      const s = get();
      const result = cancelPlan(s.plans ?? [], s.planItems ?? [], id);
      set({ plans: result.plans, planItems: result.planItems });
      const updated = get().plans.find(p => p.id === id);
      if (updated) adapter.persistChange('plan', id, updated).catch(console.error);
      get().planItems.filter(i => i.planId === id)
        .forEach(i => adapter.persistChange('planItem', i.id, i).catch(console.error));
    },

    checkAutoStatus() {
      const today = dateStr();
      const s = get();
      const result = checkPlanAutoStatus(s.plans ?? [], s.planItems ?? [], today);
      set({ plans: result.plans, planItems: result.planItems });
      // Persist changed plans
      result.plans.forEach(p => {
        const orig = (s.plans ?? []).find(op => op.id === p.id);
        if (orig && orig.updatedAt !== p.updatedAt) {
          adapter.persistChange('plan', p.id, p).catch(console.error);
        }
      });
      // Persist changed items
      result.planItems.forEach(item => {
        const orig = (s.planItems ?? []).find(oi => oi.id === item.id);
        if (orig && orig.updatedAt !== item.updatedAt) {
          adapter.persistChange('planItem', item.id, item).catch(console.error);
        }
      });
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
      set(s => ({
        planItems: deletePlanItem(s.planItems ?? [], id),
        planItemCheckins: (s.planItemCheckins ?? []).map(c => {
          if (c.planItemId === id) {
            deletedCheckinIds.push(c.id);
            return { ...c, deleted: true, updatedAt: now };
          }
          return c;
        }),
        reflections: (s.reflections ?? []).map(r =>
          r.linkedPlanItemId === id ? { ...r, linkedPlanItemId: undefined, updatedAt: now } : r,
        ),
      }));
      adapter.markDeleted('planItem', id).catch(console.error);
      deletedCheckinIds.forEach(checkinId => adapter.markDeleted('planItemCheckin', checkinId).catch(console.error));
      // 清除关联感念的 linkedPlanItemId
      (get().reflections ?? [])
        .filter(r => r.linkedPlanItemId === id)
        .forEach(r => adapter.persistChange('reflection', r.id, r).catch(console.error));
    },

    checkinPlanItem(planItemId, date) {
      const today = date ?? dateStr();
      set(s => ({ planItemCheckins: checkinItem(s.planItemCheckins ?? [], planItemId, today) }));
      const checkin = get().planItemCheckins.find(
        c => c.planItemId === planItemId && c.date === today
      );
      if (checkin) adapter.persistChange('planItemCheckin', checkin.id, checkin).catch(console.error);
      const todayStr = dateStr();
      set(s => ({ planItems: refreshPlanItemStats(s.planItems ?? [], s.planItemCheckins ?? [], todayStr) }));
      // 自动保存当天待办历史
      const item = get().planItems.find(i => i.id === planItemId);
      if (item) {
        const s = get();
        const updatedHistory = saveDailyTodoHistoryBiz(
          s.dailyTodoHistory ?? [], item.planId, today,
          s.planItems ?? [], s.planItemCheckins ?? [], s.dailyCustomTodos ?? [],
        );
        set({ dailyTodoHistory: updatedHistory });
        const entry = updatedHistory.find(h => h.planId === item.planId && h.date === today);
        if (entry) adapter.persistChange('dailyTodoHistory', entry.id, entry).catch(console.error);
      }
    },

    uncheckinPlanItem(planItemId, date) {
      const today = date ?? dateStr();
      set(s => ({ planItemCheckins: uncheckinItem(s.planItemCheckins ?? [], planItemId, today) }));
      const checkin = get().planItemCheckins.find(
        c => c.planItemId === planItemId && c.date === today
      );
      if (checkin) adapter.persistChange('planItemCheckin', checkin.id, checkin).catch(console.error);
      const todayStr = dateStr();
      set(s => ({ planItems: refreshPlanItemStats(s.planItems ?? [], s.planItemCheckins ?? [], todayStr) }));
      // 自动保存当天待办历史
      const item = get().planItems.find(i => i.id === planItemId);
      if (item) {
        const s = get();
        const updatedHistory = saveDailyTodoHistoryBiz(
          s.dailyTodoHistory ?? [], item.planId, today,
          s.planItems ?? [], s.planItemCheckins ?? [], s.dailyCustomTodos ?? [],
        );
        set({ dailyTodoHistory: updatedHistory });
        const entry = updatedHistory.find(h => h.planId === item.planId && h.date === today);
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
      const changed = updatedCheckins.length !== existingCheckins.length
        || JSON.stringify(updatedCheckins) !== JSON.stringify(existingCheckins);
      if (changed) {
        set({ planItemCheckins: updatedCheckins });
        // Persist all changed/new checkins
        const existingMap = new Map(existingCheckins.map(c => [c.id, c]));
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
        });

        // 持久化变更
        result.plans.forEach(p => {
          const orig = (s.plans ?? []).find(op => op.id === p.id);
          if (orig && orig.updatedAt !== p.updatedAt) {
            adapter.persistChange('plan', p.id, p).catch(console.error);
          }
        });
        result.planItems.forEach(item => {
          const orig = (s.planItems ?? []).find(oi => oi.id === item.id);
          if (orig && orig.updatedAt !== item.updatedAt) {
            adapter.persistChange('planItem', item.id, item).catch(console.error);
          }
        });
        // 持久化新复制的重复待办
        result.dailyTodoHistory.forEach(h => {
          const orig = (s.dailyTodoHistory ?? []).find(oh => oh.id === h.id);
          if (!orig || orig.updatedAt !== h.updatedAt) {
            adapter.persistChange('dailyTodoHistory', h.id, h).catch(console.error);
          }
        });
        // Trigger delayed plan notifications
        if (result.delayedPlans.length > 0) {
          get().notifyPlanDelayed(result.delayedPlans);
        }
      }
    },

    getActivePlan() {
      return getActivePlanBiz(get().plans ?? []);
    },

    createPlanItemFromReflection(reflectionId, startDate, endDate, priority, name, description, targetMetric) {
      const s = get();
      const reflections = s.reflections ?? [];
      const reflection = reflections.find(r => r.id === reflectionId && !r.deleted);
      if (!reflection) return false;

      const activePlan = getActivePlanBiz(s.plans ?? []);
      if (!activePlan) return false;

      const planItemData = createPlanItemFromReflectionBiz(
        reflection, activePlan.id, startDate, endDate, priority, name, description, targetMetric
      );

      // Add plan item
      set(prev => {
        const items = prev.planItems ?? [];
        const newItem: PlanItem = {
          ...planItemData,
          id: uid(),
          updatedAt: Date.now(),
          deleted: false,
        };
        const updatedItems = [...items, newItem];

        // Link reflection to plan item
        const updatedReflections = linkReflectionToPlanItem(
          prev.reflections ?? [], reflectionId, newItem.id
        );

        // Persist
        adapter.persistChange('planItem', newItem.id, newItem).catch(console.error);
        const updatedReflection = updatedReflections.find(r => r.id === reflectionId);
        if (updatedReflection) {
          adapter.persistChange('reflection', reflectionId, updatedReflection).catch(console.error);
        }

        return { planItems: updatedItems, reflections: updatedReflections };
      });

      return true;
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

      // Unlink from reflections
      let updatedReflections = [...reflections];
      for (const reflectionId of linkedReflectionIds) {
        updatedReflections = unlinkReflectionFromPlanItem(updatedReflections, reflectionId);
      }

      set({ planItems: updatedPlanItems, reflections: updatedReflections });

      // Persist changes
      updatedPlanItems.forEach(item => {
        const orig = planItems.find(i => i.id === item.id);
        if (orig && orig.updatedAt !== item.updatedAt) {
          adapter.persistChange('planItem', item.id, item).catch(console.error);
        }
      });
      updatedReflections.forEach(r => {
        const orig = reflections.find(or => or.id === r.id);
        if (orig && orig.updatedAt !== r.updatedAt) {
          adapter.persistChange('reflection', r.id, r).catch(console.error);
        }
      });
    },

    async notifyPlanDelayed(delayedPlans) {
      const s = get();
      const userId = s.auth?.user?.id;
      if (!userId) return;

      const now = Date.now();
      
      for (const plan of delayedPlans) {
        // Skip if already notified
        if (plan.lastDelayedNotifyAt) continue;

        try {
          // Call API to send email notification
          const apiBase = process.env.EXPO_PUBLIC_API_BASE || 'https://egoless-do.vercel.app';
          await fetch(`${apiBase}/api/plan/notify-delayed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
