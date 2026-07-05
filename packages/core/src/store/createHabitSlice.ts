import type { Habit } from '../types';
import {
  addHabitToList, updateHabitInList, deleteHabitFromList,
  checkinHabitInList, changeHabitStatusInList, checkAutoStatus,
  syncHabitsFromModules,
  createHabitFromForm,
  type CreateHabitForm,
} from '../business/habits';
import { dateStr } from '../utils';
import type { StorageAdapter, HabitSlice } from './types';
import type { SliceCreator } from './sliceHelper';
import { createLogger } from '../logger';
const log = createLogger('Store');

export function createHabitSlice(
  adapter: StorageAdapter,
  onSync?: () => void,
): SliceCreator<HabitSlice> {
  return (set, get) => ({
    habits: [],

    addHabit(form: CreateHabitForm) {
      const newHabit = createHabitFromForm(form);
      set(s => ({ habits: [...(s.habits ?? []), newHabit] }));
      adapter.persistChange('habit', newHabit.id, newHabit).catch(e => log.error(e));
    },

    updateHabit(id: string, patch: Partial<Habit>) {
      let updated: Habit | undefined;
      set(s => {
        const newList = updateHabitInList(s.habits ?? [], id, patch);
        updated = newList.find(h => h.id === id && !h.deleted);
        return { habits: newList };
      });
      if (updated) adapter.persistChange('habit', id, updated).catch(e => log.error(e));
    },

    deleteHabit(id: string) {
      const state = get();
      const habit = (state.habits ?? []).find(h => h.id === id && !h.deleted);
      if (!habit) return;

      // Capture affected plan items before set
      const affectedPlanItemIds = (state.planItems ?? [])
        .filter(i => !i.deleted && i.linkConfig?.habitId === id)
        .map(i => i.id);

      // Atomic: recycle bin + soft-delete + plan item cleanup in one set()
      // Capture updated plan items inside set() to avoid race condition
      let updatedPlanItems: import('../types').PlanItem[] = [];
      set(s => {
        const newPlanItems = (s.planItems ?? []).map(i =>
          affectedPlanItemIds.includes(i.id)
            ? { ...i, linkConfig: { ...i.linkConfig, habitId: undefined }, updatedAt: Date.now() }
            : i
        );
        updatedPlanItems = newPlanItems;
        return {
          habits: deleteHabitFromList(s.habits ?? [], id),
          planItems: newPlanItems,
          ...(habit ? { recycleBin: [...(s.recycleBin ?? []), { id, entityType: 'habit' as const, data: habit, deletedAt: Date.now() }] } : {}),
        };
      });
      adapter.markDeleted('habit', id).catch(e => log.error(e));

      // Persist affected plan items (captured from inside set())
      const planItemIdSet = new Set(affectedPlanItemIds);
      (updatedPlanItems ?? [])
        .filter(i => planItemIdSet.has(i.id))
        .forEach(i => adapter.persistChange('planItem', i.id, i).catch(e => log.error(e)));
      onSync?.();
    },

    checkinHabit(id: string, date: string) {
      let updated: Habit | undefined;
      set(s => {
        const newList = checkinHabitInList(s.habits ?? [], id, date);
        updated = newList.find(h => h.id === id && !h.deleted);
        return { habits: newList };
      });
      if (updated) adapter.persistChange('habit', id, updated).catch(e => log.error(e));
      onSync?.();
    },

    changeHabitStatus(id: string, ns: Habit['status'], reason?: string) {
      let updated: Habit | undefined;
      set(s => {
        const newList = changeHabitStatusInList(s.habits ?? [], id, ns, reason);
        updated = newList.find(h => h.id === id && !h.deleted);
        return { habits: newList };
      });
      if (updated) adapter.persistChange('habit', id, updated).catch(e => log.error(e));
    },

    checkHabitAutoStatus() {
      const today = dateStr();
      const prev = get().habits ?? [];
      const next = checkAutoStatus(prev, today);
      const changed = next.filter((h, i) => h !== prev[i]);
      if (changed.length === 0) return;
      set({ habits: next });
      changed.forEach(h => adapter.persistChange('habit', h.id, h).catch(e => log.error(e)));
    },

    autoSyncHabits() {
      const s = get();
      const today = dateStr();
      const prev = s.habits ?? [];
      const state = {
        fastingHistory: s.fastingHistory ?? [],
        activeFasting: s.activeFasting,
        medHistory: s.medHistory ?? [],
        exerciseLog: s.exerciseLog ?? [],
        sleepHistory: s.sleepHistory ?? [],
      };
      const next = syncHabitsFromModules(prev, state, today);
      if (next === prev) return;
      set({ habits: next });
      next.forEach((h, i) => {
        if (h !== prev[i]) adapter.persistChange('habit', h.id, h).catch(e => log.error(e));
      });
    },
  });
}
