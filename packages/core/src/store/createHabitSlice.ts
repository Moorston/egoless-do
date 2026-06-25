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

export function createHabitSlice(
  adapter: StorageAdapter,
  onSync?: () => void,
): SliceCreator<HabitSlice> {
  return (set: any, get: any) => ({
    habits: [],

    addHabit(form: CreateHabitForm) {
      const newHabit = createHabitFromForm(form);
      set(s => ({ habits: [...(s.habits ?? []), newHabit] }));
      adapter.persistChange('habit', newHabit.id, newHabit).catch(console.error);
    },

    updateHabit(id: string, patch: Partial<Habit>) {
      set(s => ({ habits: updateHabitInList(s.habits ?? [], id, patch) }));
      const updated = get().habits.find(h => h.id === id && !h.deleted);
      if (updated) adapter.persistChange('habit', id, updated).catch(console.error);
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
      set(s => ({
        habits: deleteHabitFromList(s.habits ?? [], id),
        planItems: (s.planItems ?? []).map(i =>
          affectedPlanItemIds.includes(i.id)
            ? { ...i, linkConfig: { ...i.linkConfig, habitId: undefined }, updatedAt: Date.now() }
            : i
        ),
        ...(habit ? { recycleBin: [...(s.recycleBin ?? []), { id, entityType: 'habit' as const, data: habit, deletedAt: Date.now() }] } : {}),
      }));
      adapter.markDeleted('habit', id).catch(console.error);

      // Persist affected plan items
      const planItemIdSet = new Set(affectedPlanItemIds);
      (get().planItems ?? [])
        .filter(i => planItemIdSet.has(i.id))
        .forEach(i => adapter.persistChange('planItem', i.id, i).catch(console.error));
      onSync?.();
    },

    checkinHabit(id: string, date: string) {
      set(s => ({ habits: checkinHabitInList(s.habits ?? [], id, date) }));
      const updated = get().habits.find(h => h.id === id && !h.deleted);
      if (updated) adapter.persistChange('habit', id, updated).catch(console.error);
      onSync?.();
    },

    changeHabitStatus(id: string, ns: Habit['status'], reason?: string) {
      set(s => ({ habits: changeHabitStatusInList(s.habits ?? [], id, ns, reason) }));
      const updated = get().habits.find(h => h.id === id && !h.deleted);
      if (updated) adapter.persistChange('habit', id, updated).catch(console.error);
    },

    checkHabitAutoStatus() {
      const today = dateStr();
      const prev = get().habits ?? [];
      const next = checkAutoStatus(prev, today);
      const changed = next.filter((h, i) => h !== prev[i]);
      if (changed.length === 0) return;
      set({ habits: next });
      changed.forEach(h => adapter.persistChange('habit', h.id, h).catch(console.error));
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
      };
      const next = syncHabitsFromModules(prev, state, today);
      if (next === prev) return;
      set({ habits: next });
      next.forEach((h, i) => {
        if (h !== prev[i]) adapter.persistChange('habit', h.id, h).catch(console.error);
      });
    },
  });
}
