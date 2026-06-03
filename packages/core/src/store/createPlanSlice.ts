import type { Plan, PlanItem, PlanItemCheckin, DailyCustomTodo, DailyTodoHistory } from '../types';
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
} from '../business/plan';
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
      set(prev => ({
        plans: deletePlan(prev.plans ?? [], id),
        planItems: (prev.planItems ?? []).map(i =>
          i.planId === id ? { ...i, deleted: true, updatedAt: now } : i
        ),
        planItemCheckins: (prev.planItemCheckins ?? []).map(c => {
          const item = (prev.planItems ?? []).find(i => i.id === c.planItemId);
          return item?.planId === id ? { ...c, deleted: true, updatedAt: now } : c;
        }),
      }));
      const deletedPlan = get().plans.find(p => p.id === id);
      if (deletedPlan) adapter.persistChange('plan', id, deletedPlan).catch(console.error);
      get().planItems
        .filter(i => i.planId === id && i.deleted)
        .forEach(i => adapter.persistChange('planItem', i.id, i).catch(console.error));
      get().planItemCheckins
        .filter(c => c.deleted)
        .forEach(c => adapter.persistChange('planItemCheckin', c.id, c).catch(console.error));
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
      const today = new Date().toISOString().slice(0, 10);
      const s = get();
      const result = checkAutoStatus(s.plans ?? [], s.planItems ?? [], today);
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
      set(s => ({
        planItems: deletePlanItem(s.planItems ?? [], id),
        planItemCheckins: (s.planItemCheckins ?? []).map(c =>
          c.planItemId === id ? { ...c, deleted: true, updatedAt: now } : c
        ),
      }));
      const deletedItem = get().planItems.find(i => i.id === id);
      if (deletedItem) adapter.persistChange('planItem', id, deletedItem).catch(console.error);
      get().planItemCheckins
        .filter(c => c.planItemId === id && c.deleted)
        .forEach(c => adapter.persistChange('planItemCheckin', c.id, c).catch(console.error));
    },

    checkinPlanItem(planItemId, date) {
      const today = date ?? new Date().toISOString().slice(0, 10);
      set(s => ({ planItemCheckins: checkinItem(s.planItemCheckins ?? [], planItemId, today) }));
      const checkin = get().planItemCheckins.find(
        c => c.planItemId === planItemId && c.date === today
      );
      if (checkin) adapter.persistChange('planItemCheckin', checkin.id, checkin).catch(console.error);
      const todayStr = new Date().toISOString().slice(0, 10);
      set(s => ({ planItems: refreshPlanItemStats(s.planItems ?? [], s.planItemCheckins ?? [], todayStr) }));
    },

    uncheckinPlanItem(planItemId, date) {
      const today = date ?? new Date().toISOString().slice(0, 10);
      set(s => ({ planItemCheckins: uncheckinItem(s.planItemCheckins ?? [], planItemId, today) }));
      const checkin = get().planItemCheckins.find(
        c => c.planItemId === planItemId && c.date === today
      );
      if (checkin) adapter.persistChange('planItemCheckin', checkin.id, checkin).catch(console.error);
      const todayStr = new Date().toISOString().slice(0, 10);
      set(s => ({ planItems: refreshPlanItemStats(s.planItems ?? [], s.planItemCheckins ?? [], todayStr) }));
    },

    autoSyncPlanItems() {
      const today = new Date().toISOString().slice(0, 10);
      const s = get();
      const state = {
        habits: s.habits ?? [],
        fastingHistory: s.fastingHistory ?? [],
        activeFasting: s.activeFasting,
        medHistory: s.medHistory ?? [],
        exerciseLog: s.exerciseLog ?? [],
        checkinHistory: s.checkinHistory ?? [],
      };
      const updatedCheckins = syncPlanItemsFromModules(
        s.planItems ?? [], s.planItemCheckins ?? [], s.plans ?? [], state, today
      );
      if (updatedCheckins.length !== (s.planItemCheckins ?? []).length) {
        set({ planItemCheckins: updatedCheckins });
        updatedCheckins.slice((s.planItemCheckins ?? []).length).forEach(c => {
          adapter.persistChange('planItemCheckin', c.id, c).catch(console.error);
        });
        set(prev => ({
          planItems: refreshPlanItemStats(prev.planItems ?? [], updatedCheckins, today),
        }));
      }
    },

    addDailyCustomTodo(planId, name, date) {
      const today = date ?? new Date().toISOString().slice(0, 10);
      set(s => ({
        dailyCustomTodos: addDailyCustomTodoBiz(s.dailyCustomTodos ?? [], planId, name, today),
      }));
      const todos = get().dailyCustomTodos;
      const newTodo = todos[todos.length - 1];
      if (newTodo) adapter.persistChange('dailyCustomTodo', newTodo.id, newTodo).catch(console.error);
    },

    toggleDailyCustomTodo(id, date) {
      const today = date ?? new Date().toISOString().slice(0, 10);
      set(s => ({
        dailyCustomTodos: toggleDailyCustomTodoBiz(s.dailyCustomTodos ?? [], id, today),
      }));
      const updated = get().dailyCustomTodos.find(t => t.id === id);
      if (updated) adapter.persistChange('dailyCustomTodo', id, updated).catch(console.error);
    },

    deleteDailyCustomTodo(id) {
      set(s => ({
        dailyCustomTodos: deleteDailyCustomTodoBiz(s.dailyCustomTodos ?? [], id),
      }));
      const deleted = get().dailyCustomTodos.find(t => t.id === id);
      if (deleted) adapter.persistChange('dailyCustomTodo', id, deleted).catch(console.error);
    },

    saveDailyTodoHistory(planId, date) {
      const today = date ?? new Date().toISOString().slice(0, 10);
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
      const today = new Date().toISOString().slice(0, 10);
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
        result.dailyTodoHistory.forEach(h => {
          const orig = (s.dailyTodoHistory ?? []).find(oh => oh.id === h.id);
          if (!orig || orig.updatedAt !== h.updatedAt) {
            adapter.persistChange('dailyTodoHistory', h.id, h).catch(console.error);
          }
        });
      }
    },
  });
}
