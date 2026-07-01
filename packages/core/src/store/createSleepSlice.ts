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
      const existing = get().sleepHistory.find(s => s.date === today && !s.deleted);
      const now = Date.now();

      if (existing) {
        const updated: SleepEntry = {
          ...existing,
          barrierDone: true,
          barrierMin: opts.barrierMin,
          awayMin: opts.awayMin,
          practice: opts.practice,
          updatedAt: now,
        };
        set(s => ({
          sleepHistory: s.sleepHistory.map(e => e.id === existing.id ? updated : e),
        }));
        adapter.persistChange('sleep', updated.id, updated).catch(e => log.error(e));
      } else {
        const entry: SleepEntry = {
          id: uuid(),
          date: today,
          barrierDone: true,
          barrierMin: opts.barrierMin,
          awayMin: opts.awayMin,
          practice: opts.practice,
          updatedAt: now,
          deleted: false,
        };
        set(s => ({ sleepHistory: [...s.sleepHistory, entry] }));
        adapter.persistChange('sleep', entry.id, entry).catch(e => log.error(e));
      }
      onSync?.();
    },

    saveSleepDiary(partial) {
      const today = dateStr();
      const existing = get().sleepHistory.find(s => s.date === today && !s.deleted);
      const now = Date.now();

      if (existing) {
        const updated: SleepEntry = {
          ...existing,
          ...partial,
          id: existing.id,
          date: today,
          updatedAt: now,
        };
        // Recalculate duration if both times present
        if (updated.bedtimeAt && updated.wakeAt) {
          updated.durationMin = Math.round((updated.wakeAt - updated.bedtimeAt) / 60000);
        }
        set(s => ({
          sleepHistory: s.sleepHistory.map(e => e.id === existing.id ? updated : e),
        }));
        adapter.persistChange('sleep', updated.id, updated).catch(e => log.error(e));
      } else {
        const entry: SleepEntry = {
          id: uuid(),
          date: today,
          barrierDone: false,
          updatedAt: now,
          deleted: false,
          ...partial,
        };
        if (entry.bedtimeAt && entry.wakeAt) {
          entry.durationMin = Math.round((entry.wakeAt - entry.bedtimeAt) / 60000);
        }
        set(s => ({ sleepHistory: [...s.sleepHistory, entry] }));
        adapter.persistChange('sleep', entry.id, entry).catch(e => log.error(e));
      }
      onSync?.();
    },

    setSleepGoal(goal) {
      set({ sleepGoal: goal });
    },
  });
}
