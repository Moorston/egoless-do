import { dateStr } from '../utils';
import type { SleepEntry, SleepGoal } from '../types';
import { DEFAULT_SLEEP_GOAL } from '../types';
import type { StorageAdapter, SleepSlice } from './types';
import type { SliceCreator } from './sliceHelper';
import { createLogger } from '../logger';
const log = createLogger('Sleep');

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function createSleepSlice(
  adapter: StorageAdapter,
  onSync?: () => void,
): SliceCreator<SleepSlice> {
  return (set, get) => ({
    sleepHistory: [],
    sleepGoal: { ...DEFAULT_SLEEP_GOAL },

    getTodaySleep() {
      const today = dateStr();
      return (get().sleepHistory ?? []).find(s => s.date === today && !s.deleted);
    },

    completeBarrier(opts) {
      const today = dateStr();
      const now = Date.now();
      let persistEntry: SleepEntry | undefined;
      set(s => {
        const existing = (s.sleepHistory ?? []).find(e => e.date === today && !e.deleted);
        if (existing) {
          const updated: SleepEntry = { ...existing, barrierDone: true, barrierMin: opts.barrierMin, awayMin: opts.awayMin, practice: opts.practice, updatedAt: now };
          persistEntry = updated;
          return { sleepHistory: s.sleepHistory.map(e => e.id === existing.id ? updated : e) };
        }
        const entry: SleepEntry = { id: uuid(), date: today, barrierDone: true, barrierMin: opts.barrierMin, awayMin: opts.awayMin, practice: opts.practice, updatedAt: now, deleted: false };
        persistEntry = entry;
        return { sleepHistory: [...s.sleepHistory, entry] };
      });
      if (persistEntry) adapter.persistChange('sleep', persistEntry.id, persistEntry).catch(e => log.error(e));
      onSync?.();
    },

    saveSleepDiary(partial) {
      const today = dateStr();
      const now = Date.now();
      let persistEntry: SleepEntry | undefined;
      set(s => {
        const existing = (s.sleepHistory ?? []).find(e => e.date === today && !e.deleted);
        if (existing) {
          const updated: SleepEntry = { ...existing, ...partial, id: existing.id, date: today, updatedAt: now };
          if (updated.bedtimeAt && updated.wakeAt) {
            let diff = updated.wakeAt - updated.bedtimeAt;
            if (diff < 0) diff += 24 * 60 * 60 * 1000; // cross-midnight correction
            updated.durationMin = Math.round(diff / 60000);
          }
          persistEntry = updated;
          return { sleepHistory: s.sleepHistory.map(e => e.id === existing.id ? updated : e) };
        }
        const entry: SleepEntry = { id: uuid(), date: today, barrierDone: false, updatedAt: now, deleted: false, ...partial };
        if (entry.bedtimeAt && entry.wakeAt) {
          let diff = entry.wakeAt - entry.bedtimeAt;
          if (diff < 0) diff += 24 * 60 * 60 * 1000;
          entry.durationMin = Math.round(diff / 60000);
        }
        persistEntry = entry;
        return { sleepHistory: [...s.sleepHistory, entry] };
      });
      if (persistEntry) adapter.persistChange('sleep', persistEntry.id, persistEntry).catch(e => log.error(e));
      onSync?.();
    },

    setSleepGoal(goal) {
      set({ sleepGoal: goal });
      adapter.persistSettings('sleepGoal', goal).catch(e => log.error(e));
    },
  });
}
