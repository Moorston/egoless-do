import type { Habit } from '../types';
import {
  addHabitToList, updateHabitInList, deleteHabitFromList,
  checkinHabitInList, changeHabitStatusInList, checkAutoStatus,
  type CreateHabitForm,
} from '../business/habits';
import { dateStr } from '../utils';
import type { StorageAdapter, HabitSlice } from './types';
import type { SliceCreator } from './sliceHelper';

export function createHabitSlice(
  adapter: StorageAdapter,
  onSync?: () => void,
): SliceCreator<HabitSlice> {
  return (set, get) => ({
    habits: [],

    addHabit(form: CreateHabitForm) {
      set(s => ({ habits: addHabitToList(s.habits ?? [], form) }));
      const h = get().habits.slice(-1)[0];
      if (h) adapter.persistChange('habit', h.id, h).catch(console.error);
    },

    updateHabit(id: string, patch: Partial<Habit>) {
      set(s => ({ habits: updateHabitInList(s.habits ?? [], id, patch) }));
      const updated = get().habits.find(h => h.id === id);
      if (updated) adapter.persistChange('habit', id, updated).catch(console.error);
    },

    deleteHabit(id: string) {
      const state = get();
      const habit = (state.habits ?? []).find(h => h.id === id);
      if (habit) {
        state.addToRecycleBin({ id, entityType: 'habit', data: habit });
      }
      set(s => ({ habits: deleteHabitFromList(s.habits ?? [], id) }));
      adapter.markDeleted('habit', id).catch(console.error);
    },

    checkinHabit(id: string, date: string) {
      set(s => ({ habits: checkinHabitInList(s.habits ?? [], id, date) }));
      const updated = get().habits.find(h => h.id === id);
      if (updated) adapter.persistChange('habit', id, updated).catch(console.error);
      onSync?.();
    },

    changeHabitStatus(id: string, ns: Habit['status'], reason?: string) {
      set(s => ({ habits: changeHabitStatusInList(s.habits ?? [], id, ns, reason) }));
      const updated = get().habits.find(h => h.id === id);
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
  });
}
