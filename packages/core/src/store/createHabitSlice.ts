import type { StateCreator } from 'zustand';
import type { Habit } from '../types';
import {
  addHabitToList, updateHabitInList, deleteHabitFromList,
  checkinHabitInList, changeHabitStatusInList,
  type CreateHabitForm,
} from '../business/habits';
import type { StorageAdapter } from './storageAdapter';
import type { HabitSlice } from './types';

export function createHabitSlice<S extends HabitSlice>(
  adapter: StorageAdapter,
): StateCreator<S, [], [], HabitSlice> {
  return (set, get) => ({
    habits: [],

    addHabit(form: CreateHabitForm) {
      set(((s: any) => ({ habits: addHabitToList(s.habits ?? [], form) })) as any);
      const h = (get() as any).habits.slice(-1)[0];
      if (h) adapter.persistChange('habit', h.id, h).catch(console.error);
    },

    updateHabit(id: string, patch: Partial<Habit>) {
      set(((s: any) => ({ habits: updateHabitInList(s.habits ?? [], id, patch) })) as any);
      const updated = (get() as any).habits.find((h: Habit) => h.id === id);
      if (updated) adapter.persistChange('habit', id, updated).catch(console.error);
    },

    deleteHabit(id: string) {
      const state = get() as any;
      const habit = (state.habits ?? []).find((h: any) => h.id === id);
      if (habit && state.addToRecycleBin) {
        state.addToRecycleBin({ id, entityType: 'habit', data: habit });
      }
      set(((s: any) => ({ habits: deleteHabitFromList(s.habits ?? [], id) })) as any);
      adapter.markDeleted('habit', id).catch(console.error);
    },

    checkinHabit(id: string, date: string) {
      set(((s: any) => ({ habits: checkinHabitInList(s.habits ?? [], id, date) })) as any);
      const updated = (get() as any).habits.find((h: Habit) => h.id === id);
      if (updated) adapter.persistChange('habit', id, updated).catch(console.error);
    },

    changeHabitStatus(id: string, ns: Habit['status'], reason?: string) {
      set(((s: any) => ({ habits: changeHabitStatusInList(s.habits ?? [], id, ns, reason) })) as any);
      const updated = (get() as any).habits.find((h: Habit) => h.id === id);
      if (updated) adapter.persistChange('habit', id, updated).catch(console.error);
    },
  });
}
