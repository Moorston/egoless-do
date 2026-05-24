import type { StateCreator } from 'zustand';
import type { Habit } from '@egoless-do/core';
import { uid, computeStreak, createHabitFromForm } from '@egoless-do/core';
import { enqueueChange } from '../../db/syncQueue';
import type { SyncEntity } from '../../db/webDb';
import type { WebStore } from '../useWebStore';

function q(entity: SyncEntity, id: string, op: 'upsert' | 'delete', payload: unknown) {
  enqueueChange(entity, id, op, payload).catch((e) => console.error('[err]', e));
}

export interface HabitSlice {
  habits: Habit[];
  addHabit: (form: Parameters<typeof createHabitFromForm>[0]) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  checkinHabit: (id: string, date: string) => void;
  changeHabitStatus: (id: string, ns: Habit['status'], reason?: string) => void;
}

export const createHabitSlice: StateCreator<WebStore, [], [], HabitSlice> = (set, get) => ({
  habits: [],

  addHabit(form) {
    const h = createHabitFromForm(form);
    set(s => ({ habits: [...s.habits, h] }));
    q('habit', h.id, 'upsert', h);
  },

  updateHabit(id, patch) {
    const now = Date.now();
    set(s => ({ habits: s.habits.map(h => h.id === id ? { ...h, ...patch, updatedAt: now } : h) }));
    const updated = get().habits.find(h => h.id === id);
    if (updated) q('habit', id, 'upsert', updated);
  },

  deleteHabit(id) {
    set(s => ({ habits: s.habits.filter(h => h.id !== id) }));
    q('habit', id, 'delete', { updatedAt: Date.now() });
  },

  checkinHabit(id, date) {
    const now = Date.now();
    set(s => ({
      habits: s.habits.map(h => {
        if (h.id !== id) return h;
        const checked = h.checkedDates.includes(date)
          ? h.checkedDates.filter(d => d !== date)
          : [...h.checkedDates, date];
        return { ...h, checkedDates: checked, doneDays: checked.length, streak: computeStreak(checked), updatedAt: now };
      }),
    }));
    const updated = get().habits.find(h => h.id === id);
    if (updated) q('habit', id, 'upsert', updated);
  },

  changeHabitStatus(id, ns, reason) {
    const now = Date.now();
    set(s => ({
      habits: s.habits.map(h => h.id === id ? {
        ...h, status: ns,
        pauseReason: ns === 'paused' ? (reason ?? '') : h.pauseReason,
        abandonReason: ns === 'abandoned' ? (reason ?? '') : h.abandonReason,
        updatedAt: now,
      } : h),
    }));
    const updated = get().habits.find(h => h.id === id);
    if (updated) q('habit', id, 'upsert', updated);
  },
});
