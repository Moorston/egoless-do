import type { BodyGoal, BodyPlan, BodyCheckin, WeightRecord } from '../types';
import type { StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';
import { createLogger } from '../logger';
import { createBodyGoal, createBodyPlan, createBodyCheckin, createWeightRecord } from '../business/body';
const log = createLogger('Store');

export interface BodySlice {
  // Body goals
  bodyGoals: BodyGoal[];
  addBodyGoal: (goal: Parameters<typeof createBodyGoal>[0]) => void;
  updateBodyGoal: (id: string, updates: Partial<BodyGoal>) => void;
  removeBodyGoal: (id: string) => void;

  // Body plans
  bodyPlans: BodyPlan[];
  addBodyPlan: (plan: Parameters<typeof createBodyPlan>[0]) => void;
  updateBodyPlan: (id: string, updates: Partial<BodyPlan>) => void;
  removeBodyPlan: (id: string) => void;
  setBodyPlans: (plans: BodyPlan[]) => void;

  // Weight records
  weightRecords: WeightRecord[];
  addWeight: (record: Parameters<typeof createWeightRecord>[0]) => void;
  updateWeight: (id: string, updates: Partial<WeightRecord>) => void;
  removeWeight: (id: string) => void;

  // Body checkins
  bodyCheckins: BodyCheckin[];
  upsertBodyCheckin: (data: Parameters<typeof createBodyCheckin>[0]) => void;
  removeBodyCheckin: (id: string) => void;
}

export function createBodySlice(
  adapter: StorageAdapter,
  onSync?: () => void,
): SliceCreator<BodySlice> {
  return (set, get) => ({
    // ── Body goals ──────────────────────────────────────────────────────
    bodyGoals: [],

    addBodyGoal(goal) {
      const entry = createBodyGoal(goal);
      set(s => ({ bodyGoals: [...(s.bodyGoals ?? []), entry] }));
      adapter.persistChange('bodyGoal', entry.id, entry).catch(e => log.error(e));
      onSync?.();
    },

    updateBodyGoal(id, updates) {
      let entry: BodyGoal | undefined;
      set(s => {
        const newList = (s.bodyGoals ?? []).map(g => g.id === id ? { ...g, ...updates, updatedAt: Date.now() } : g);
        entry = newList.find(g => g.id === id);
        return { bodyGoals: newList };
      });
      if (entry) adapter.persistChange('bodyGoal', id, entry).catch(e => log.error(e));
      onSync?.();
    },

    removeBodyGoal(id) {
      let entry: BodyGoal | undefined;
      set(s => {
        const newList = (s.bodyGoals ?? []).map(g => g.id === id ? { ...g, deleted: true, updatedAt: Date.now() } : g);
        entry = newList.find(g => g.id === id);
        return { bodyGoals: newList };
      });
      if (entry) adapter.persistChange('bodyGoal', id, entry).catch(e => log.error(e));
      onSync?.();
    },

    // ── Body plans ──────────────────────────────────────────────────────
    bodyPlans: [],

    addBodyPlan(plan) {
      const entry = createBodyPlan(plan);
      set(s => ({ bodyPlans: [...(s.bodyPlans ?? []), entry] }));
      adapter.persistChange('bodyPlan', entry.id, entry).catch(e => log.error(e));
      onSync?.();
    },

    updateBodyPlan(id, updates) {
      let entry: BodyPlan | undefined;
      set(s => {
        const newList = (s.bodyPlans ?? []).map(p => p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p);
        entry = newList.find(p => p.id === id);
        return { bodyPlans: newList };
      });
      if (entry) adapter.persistChange('bodyPlan', id, entry).catch(e => log.error(e));
      onSync?.();
    },

    removeBodyPlan(id) {
      let entry: BodyPlan | undefined;
      set(s => {
        const newList = (s.bodyPlans ?? []).map(p => p.id === id ? { ...p, deleted: true, updatedAt: Date.now() } : p);
        entry = newList.find(p => p.id === id);
        return { bodyPlans: newList };
      });
      if (entry) adapter.persistChange('bodyPlan', id, entry).catch(e => log.error(e));
      onSync?.();
    },

    setBodyPlans(plans) {
      set({ bodyPlans: plans });
      for (const p of plans) {
        adapter.persistChange('bodyPlan', p.id, p).catch(e => log.error(e));
      }
      onSync?.();
    },

    // ── Weight records ──────────────────────────────────────────────────
    weightRecords: [],

    addWeight(record) {
      const entry = createWeightRecord(record);
      set(s => ({ weightRecords: [...(s.weightRecords ?? []), entry] }));
      adapter.persistChange('weightRecord', entry.id, entry).catch(e => log.error(e));
      onSync?.();
    },

    updateWeight(id, updates) {
      let entry: WeightRecord | undefined;
      set(s => {
        const newList = (s.weightRecords ?? []).map(r => r.id === id ? { ...r, ...updates, updatedAt: Date.now() } : r);
        entry = newList.find(r => r.id === id);
        return { weightRecords: newList };
      });
      if (entry) adapter.persistChange('weightRecord', id, entry).catch(e => log.error(e));
      onSync?.();
    },

    removeWeight(id) {
      let entry: WeightRecord | undefined;
      set(s => {
        const newList = (s.weightRecords ?? []).map(r => r.id === id ? { ...r, deleted: true, updatedAt: Date.now() } : r);
        entry = newList.find(r => r.id === id);
        return { weightRecords: newList };
      });
      if (entry) adapter.persistChange('weightRecord', id, entry).catch(e => log.error(e));
      onSync?.();
    },

    // ── Body checkins ───────────────────────────────────────────────────
    bodyCheckins: [],

    upsertBodyCheckin(data) {
      let persistId: string | undefined;
      let persistData: BodyCheckin | undefined;
      set(s => {
        const list = s.bodyCheckins ?? [];
        const existing = list.find(c => c.date === data.date && !c.deleted);
        if (existing) {
          const updated = { ...existing, ...data, updatedAt: Date.now() };
          persistId = existing.id;
          persistData = updated;
          return { bodyCheckins: list.map(c => c.id === existing.id ? updated : c) };
        }
        const entry = createBodyCheckin(data);
        persistId = entry.id;
        persistData = entry;
        return { bodyCheckins: [...list, entry] };
      });
      if (persistId && persistData) adapter.persistChange('bodyCheckin', persistId, persistData).catch(e => log.error(e));
      onSync?.();
    },

    removeBodyCheckin(id) {
      let entry: BodyCheckin | undefined;
      set(s => {
        const newList = (s.bodyCheckins ?? []).map(c => c.id === id ? { ...c, deleted: true, updatedAt: Date.now() } : c);
        entry = newList.find(c => c.id === id);
        return { bodyCheckins: newList };
      });
      if (entry) adapter.persistChange('bodyCheckin', id, entry).catch(e => log.error(e));
      onSync?.();
    },
  });
}
