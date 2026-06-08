// ─── Intent slice ──────────────────────────────────────────────
import type { Intent, IntentStatus, IntentSource } from '../types/intent';
import type { StorageAdapter, IntentSlice } from './types';
import type { SliceCreator } from './sliceHelper';
import { uid } from '../utils';

export function createIntentSlice(adapter?: StorageAdapter): SliceCreator<IntentSlice> {
  return (set, get) => ({
    intents: [],

    createIntent: (content: string, why: string, source: IntentSource, linkedReflectionIds: string[] = []) => {
      const id = uid();
      const now = Date.now();
      const intent: Intent = {
        id,
        content,
        why,
        source,
        status: 'seed',
        linkedReflectionIds,
        linkedPlanIds: [],
        linkedHabitIds: [],
        createdAt: now,
        updatedAt: now,
        deleted: false,
      };

      set(s => ({ intents: [...(s.intents ?? []), intent] }));
      adapter?.persistChange('intent', id, intent).catch(console.error);
      return id;
    },

    updateIntent: (id: string, patch: Partial<Intent>) => {
      set(s => ({
        intents: (s.intents ?? []).map(i =>
          i.id === id ? { ...i, ...patch, updatedAt: Date.now() } : i
        ),
      }));
      const intent = get().intents.find(i => i.id === id);
      if (intent) adapter?.persistChange('intent', id, intent).catch(console.error);
    },

    deleteIntent: (id: string) => {
      set(s => ({
        intents: (s.intents ?? []).filter(i => i.id !== id),
      }));
      adapter?.markDeleted('intent', id).catch(console.error);
    },

    getIntentById: (id: string) => {
      return (get().intents ?? []).find(i => i.id === id && !i.deleted) ?? null;
    },

    getIntentsByReflection: (reflectionId: string) => {
      return (get().intents ?? []).filter(i => 
        !i.deleted && i.linkedReflectionIds.includes(reflectionId)
      );
    },

    getIntentsByPlan: (planId: string) => {
      return (get().intents ?? []).filter(i => 
        !i.deleted && i.linkedPlanIds.includes(planId)
      );
    },

    getIntentsByHabit: (habitId: string) => {
      return (get().intents ?? []).filter(i => 
        !i.deleted && i.linkedHabitIds.includes(habitId)
      );
    },

    linkIntentToPlan: (intentId: string, planId: string) => {
      set(s => ({
        intents: (s.intents ?? []).map(i => {
          if (i.id !== intentId || i.linkedPlanIds.includes(planId)) return i;
          return { ...i, linkedPlanIds: [...i.linkedPlanIds, planId], updatedAt: Date.now() };
        }),
      }));
      const intent = get().intents.find(i => i.id === intentId);
      if (intent) adapter?.persistChange('intent', intentId, intent).catch(console.error);
    },

    linkIntentToHabit: (intentId: string, habitId: string) => {
      set(s => ({
        intents: (s.intents ?? []).map(i => {
          if (i.id !== intentId || i.linkedHabitIds.includes(habitId)) return i;
          return { ...i, linkedHabitIds: [...i.linkedHabitIds, habitId], updatedAt: Date.now() };
        }),
      }));
      const intent = get().intents.find(i => i.id === intentId);
      if (intent) adapter?.persistChange('intent', intentId, intent).catch(console.error);
    },

    unlinkIntentFromPlan: (intentId: string, planId: string) => {
      set(s => ({
        intents: (s.intents ?? []).map(i => {
          if (i.id !== intentId) return i;
          return { ...i, linkedPlanIds: i.linkedPlanIds.filter(id => id !== planId), updatedAt: Date.now() };
        }),
      }));
      const intent = get().intents.find(i => i.id === intentId);
      if (intent) adapter?.persistChange('intent', intentId, intent).catch(console.error);
    },

    unlinkIntentFromHabit: (intentId: string, habitId: string) => {
      set(s => ({
        intents: (s.intents ?? []).map(i => {
          if (i.id !== intentId) return i;
          return { ...i, linkedHabitIds: i.linkedHabitIds.filter(id => id !== habitId), updatedAt: Date.now() };
        }),
      }));
      const intent = get().intents.find(i => i.id === intentId);
      if (intent) adapter?.persistChange('intent', intentId, intent).catch(console.error);
    },

    updateIntentStatus: (id: string, status: IntentStatus) => {
      set(s => ({
        intents: (s.intents ?? []).map(i =>
          i.id === id ? { ...i, status, updatedAt: Date.now() } : i
        ),
      }));
      const intent = get().intents.find(i => i.id === id);
      if (intent) adapter?.persistChange('intent', id, intent).catch(console.error);
    },

    addLearning: (intentId: string, learning: string) => {
      set(s => ({
        intents: (s.intents ?? []).map(i => {
          if (i.id !== intentId) return i;
          return { ...i, learnings: [...(i.learnings ?? []), learning], updatedAt: Date.now() };
        }),
      }));
      const intent = get().intents.find(i => i.id === intentId);
      if (intent) adapter?.persistChange('intent', intentId, intent).catch(console.error);
    },

    setOutcome: (intentId: string, outcome: string) => {
      set(s => ({
        intents: (s.intents ?? []).map(i => {
          if (i.id !== intentId) return i;
          return { ...i, outcome, updatedAt: Date.now() };
        }),
      }));
      const intent = get().intents.find(i => i.id === intentId);
      if (intent) adapter?.persistChange('intent', intentId, intent).catch(console.error);
    },

    getInactiveIntents: () => {
      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      return (get().intents ?? []).filter(i => 
        !i.deleted && 
        i.status === 'seed' && 
        (now - i.updatedAt) > sevenDays
      );
    },

    getStuckIntents: () => {
      const now = Date.now();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      return (get().intents ?? []).filter(i => 
        !i.deleted && 
        i.status === 'active' && 
        (now - i.updatedAt) > thirtyDays
      );
    },
  });
}
