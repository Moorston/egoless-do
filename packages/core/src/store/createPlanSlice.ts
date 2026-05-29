import type { StateCreator } from 'zustand';
import type { Plan, PlanItem, PlanItemCheckin, PlanItemLink } from '../types';
import {
  addPlan, updatePlan, deletePlan,
  startPlan, pausePlan, resumePlan, completePlan, cancelPlan, delayPlan,
  checkAutoStatus,
  addPlanItem, updatePlanItem, deletePlanItem,
  checkinItem, uncheckinItem,
  syncPlanItemsFromModules, refreshPlanItemStats,
} from '../business/plan';
import type { StorageAdapter } from './storageAdapter';
import type { PlanSlice } from './types';

export function createPlanSlice<S extends PlanSlice>(
  adapter: StorageAdapter,
): StateCreator<S, [], [], PlanSlice> {
  return (set, get) => ({
    plans: [],
    planItems: [],
    planItemCheckins: [],

    addPlan(form) {
      let planId = '';
      set(((s: any) => {
        const result = addPlan(s.plans ?? [], form);
        planId = result.planId;
        return { plans: result.plans };
      }) as any);
      const p = (get() as any).plans.find((p: Plan) => p.id === planId);
      if (p) adapter.persistChange('plan', p.id, p as any).catch(console.error);
      return planId;
    },

    updatePlan(id, patch) {
      set(((s: any) => ({ plans: updatePlan(s.plans ?? [], id, patch) })) as any);
      const updated = (get() as any).plans.find((p: Plan) => p.id === id);
      if (updated) adapter.persistChange('plan', id, updated as any).catch(console.error);
    },

    deletePlan(id) {
      const s = get() as any;
      const plan = (s.plans ?? []).find((p: Plan) => p.id === id);
      if (plan && s.addToRecycleBin) {
        s.addToRecycleBin({ id, entityType: 'plan', data: plan });
      }
      const itemsToDelete = (s.planItems ?? []).filter((i: PlanItem) => i.planId === id);
      const checkinsToDelete = (s.planItemCheckins ?? []).filter((c: PlanItemCheckin) =>
        itemsToDelete.some((i: PlanItem) => i.id === c.planItemId)
      );
      set(((prev: any) => ({
        plans: deletePlan(prev.plans ?? [], id),
        planItems: (prev.planItems ?? []).filter((i: PlanItem) => i.planId !== id),
        planItemCheckins: (prev.planItemCheckins ?? []).filter((c: PlanItemCheckin) => {
          const item = (prev.planItems ?? []).find((i: PlanItem) => i.id === c.planItemId);
          return item?.planId !== id;
        }),
      })) as any);
      adapter.markDeleted('plan', id).catch(console.error);
      itemsToDelete.forEach((i: PlanItem) => adapter.markDeleted('planItem', i.id).catch(console.error));
      checkinsToDelete.forEach((c: PlanItemCheckin) => adapter.markDeleted('planItemCheckin', c.id).catch(console.error));
    },

    startPlan(id) {
      const s = get() as any;
      const result = startPlan(s.plans ?? [], s.planItems ?? [], id);
      set({ plans: result.plans, planItems: result.planItems } as any);
      const updated = (get() as any).plans.find((p: Plan) => p.id === id);
      if (updated) adapter.persistChange('plan', id, updated as any).catch(console.error);
      (get() as any).planItems.filter((i: PlanItem) => i.planId === id)
        .forEach((i: PlanItem) => adapter.persistChange('planItem', i.id, i as any).catch(console.error));
    },

    pausePlan(id) {
      const s = get() as any;
      const result = pausePlan(s.plans ?? [], s.planItems ?? [], id);
      set({ plans: result.plans, planItems: result.planItems } as any);
      const updated = (get() as any).plans.find((p: Plan) => p.id === id);
      if (updated) adapter.persistChange('plan', id, updated as any).catch(console.error);
      (get() as any).planItems.filter((i: PlanItem) => i.planId === id)
        .forEach((i: PlanItem) => adapter.persistChange('planItem', i.id, i as any).catch(console.error));
    },

    resumePlan(id) {
      const s = get() as any;
      const result = resumePlan(s.plans ?? [], s.planItems ?? [], id);
      set({ plans: result.plans, planItems: result.planItems } as any);
      const updated = (get() as any).plans.find((p: Plan) => p.id === id);
      if (updated) adapter.persistChange('plan', id, updated as any).catch(console.error);
      (get() as any).planItems.filter((i: PlanItem) => i.planId === id)
        .forEach((i: PlanItem) => adapter.persistChange('planItem', i.id, i as any).catch(console.error));
    },

    completePlan(id) {
      set(((s: any) => ({ plans: completePlan(s.plans ?? [], id) })) as any);
      const updated = (get() as any).plans.find((p: Plan) => p.id === id);
      if (updated) adapter.persistChange('plan', id, updated as any).catch(console.error);
    },

    cancelPlan(id) {
      set(((s: any) => ({ plans: cancelPlan(s.plans ?? [], id) })) as any);
      const updated = (get() as any).plans.find((p: Plan) => p.id === id);
      if (updated) adapter.persistChange('plan', id, updated as any).catch(console.error);
    },

    delayPlan(id) {
      set(((s: any) => ({ plans: delayPlan(s.plans ?? [], id) })) as any);
      const updated = (get() as any).plans.find((p: Plan) => p.id === id);
      if (updated) adapter.persistChange('plan', id, updated as any).catch(console.error);
    },

    checkAutoStatus() {
      const today = new Date().toISOString().slice(0, 10);
      set(((s: any) => {
        const result = checkAutoStatus(s.plans ?? [], s.planItems ?? [], today);
        return { plans: result.plans, planItems: result.planItems };
      }) as any);
    },

    addPlanItem(form) {
      set(((s: any) => ({ planItems: addPlanItem(s.planItems ?? [], form) })) as any);
      const items = (get() as any).planItems as PlanItem[];
      const item = items[items.length - 1];
      if (item) adapter.persistChange('planItem', item.id, item as any).catch(console.error);
    },

    updatePlanItem(id, patch) {
      set(((s: any) => ({ planItems: updatePlanItem(s.planItems ?? [], id, patch) })) as any);
      const updated = (get() as any).planItems.find((i: PlanItem) => i.id === id);
      if (updated) adapter.persistChange('planItem', id, updated as any).catch(console.error);
    },

    deletePlanItem(id) {
      const checkinsToDelete = (get() as any).planItemCheckins.filter((c: PlanItemCheckin) => c.planItemId === id);
      set(((s: any) => ({
        planItems: deletePlanItem(s.planItems ?? [], id),
        planItemCheckins: (s.planItemCheckins ?? []).filter((c: PlanItemCheckin) => c.planItemId !== id),
      })) as any);
      adapter.markDeleted('planItem', id).catch(console.error);
      checkinsToDelete.forEach((c: PlanItemCheckin) => adapter.markDeleted('planItemCheckin', c.id).catch(console.error));
    },

    checkinPlanItem(planItemId, date) {
      const today = date ?? new Date().toISOString().slice(0, 10);
      set(((s: any) => ({ planItemCheckins: checkinItem(s.planItemCheckins ?? [], planItemId, today) })) as any);
      const checkin = (get() as any).planItemCheckins.find(
        (c: PlanItemCheckin) => c.planItemId === planItemId && c.date === today
      );
      if (checkin) adapter.persistChange('planItemCheckin', checkin.id, checkin as any).catch(console.error);
      const todayStr = new Date().toISOString().slice(0, 10);
      set(((s: any) => ({ planItems: refreshPlanItemStats(s.planItems ?? [], s.planItemCheckins ?? [], todayStr) })) as any);
    },

    uncheckinPlanItem(planItemId, date) {
      const today = date ?? new Date().toISOString().slice(0, 10);
      set(((s: any) => ({ planItemCheckins: uncheckinItem(s.planItemCheckins ?? [], planItemId, today) })) as any);
      const checkin = (get() as any).planItemCheckins.find(
        (c: PlanItemCheckin) => c.planItemId === planItemId && c.date === today
      );
      if (checkin) adapter.persistChange('planItemCheckin', checkin.id, checkin as any).catch(console.error);
      const todayStr = new Date().toISOString().slice(0, 10);
      set(((s: any) => ({ planItems: refreshPlanItemStats(s.planItems ?? [], s.planItemCheckins ?? [], todayStr) })) as any);
    },

    autoSyncPlanItems() {
      const today = new Date().toISOString().slice(0, 10);
      const s = get() as any;
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
        set({ planItemCheckins: updatedCheckins } as any);
        updatedCheckins.slice((s.planItemCheckins ?? []).length).forEach((c: PlanItemCheckin) => {
          adapter.persistChange('planItemCheckin', c.id, c as any).catch(console.error);
        });
        set(((prev: any) => ({
          planItems: refreshPlanItemStats(prev.planItems ?? [], updatedCheckins, today),
        })) as any);
      }
    },
  });
}
