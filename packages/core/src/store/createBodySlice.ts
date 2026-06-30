import type { BodyGoal, BodyPlan } from '../types';
import type { StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';
import { createLogger } from '../logger';
import { createBodyGoal, createBodyPlan } from '../business/body';
const log = createLogger('Store');

export interface BodySlice {
  bodyGoals: BodyGoal[];
  bodyPlans: BodyPlan[];
  addBodyGoal: (goal: Parameters<typeof createBodyGoal>[0]) => void;
  updateBodyGoal: (id: string, updates: Partial<BodyGoal>) => void;
  removeBodyGoal: (id: string) => void;
  addBodyPlan: (plan: Parameters<typeof createBodyPlan>[0]) => void;
  updateBodyPlan: (id: string, updates: Partial<BodyPlan>) => void;
  removeBodyPlan: (id: string) => void;
  setBodyPlans: (plans: BodyPlan[]) => void;
}

export function createBodySlice(
  adapter: StorageAdapter,
  onSync?: () => void,
): SliceCreator<BodySlice> {
  return (set, get) => ({
    bodyGoals: [],
    bodyPlans: [],

    addBodyGoal(goal) {
      const entry = createBodyGoal(goal);
      set(s => ({ bodyGoals: [...(s.bodyGoals ?? []), entry] }));
      adapter.persistChange('bodyGoal', entry.id, entry).catch(e => log.error(e));
      onSync?.();
    },

    updateBodyGoal(id, updates) {
      set(s => ({
        bodyGoals: (s.bodyGoals ?? []).map(g => g.id === id ? { ...g, ...updates, updatedAt: Date.now() } : g),
      }));
      const entry = get().bodyGoals.find(g => g.id === id);
      if (entry) adapter.persistChange('bodyGoal', id, entry).catch(e => log.error(e));
      onSync?.();
    },

    removeBodyGoal(id) {
      set(s => ({
        bodyGoals: (s.bodyGoals ?? []).map(g => g.id === id ? { ...g, deleted: true, updatedAt: Date.now() } : g),
      }));
      const entry = get().bodyGoals.find(g => g.id === id);
      if (entry) adapter.persistChange('bodyGoal', id, entry).catch(e => log.error(e));
      onSync?.();
    },

    addBodyPlan(plan) {
      const entry = createBodyPlan(plan);
      set(s => ({ bodyPlans: [...(s.bodyPlans ?? []), entry] }));
      adapter.persistChange('bodyPlan', entry.id, entry).catch(e => log.error(e));
      onSync?.();
    },

    updateBodyPlan(id, updates) {
      set(s => ({
        bodyPlans: (s.bodyPlans ?? []).map(p => p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p),
      }));
      const entry = get().bodyPlans.find(p => p.id === id);
      if (entry) adapter.persistChange('bodyPlan', id, entry).catch(e => log.error(e));
      onSync?.();
    },

    removeBodyPlan(id) {
      set(s => ({
        bodyPlans: (s.bodyPlans ?? []).map(p => p.id === id ? { ...p, deleted: true, updatedAt: Date.now() } : p),
      }));
      const entry = get().bodyPlans.find(p => p.id === id);
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
  });
}
