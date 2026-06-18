import type { CheckinEntry, GraceHistoryEntry } from '../types';
import { calculateCheckinStreak } from '../utils';
import { submitCheckinEntry } from '../business';
import type { StorageAdapter, CheckinSlice } from './types';
import type { SliceCreator } from './sliceHelper';

export function createCheckinSlice(
  adapter: StorageAdapter,
  onSync?: () => void,
): SliceCreator<CheckinSlice> {
  return (set: any, get: any) => ({
    checkinHistory: [],
    streak: 0,
    graceHistory: [],

    submitCheckin(done: boolean, note: string, dateOverride?: string, weight?: number, grace?: boolean) {
      const history = get().checkinHistory;
      const result = submitCheckinEntry(history ?? [], done, note, dateOverride, weight, grace);
      set({ checkinHistory: result.history, streak: result.streak });
      adapter.persistChange('checkin', result.record.date, result.record).catch(console.error);
      // Trigger sync when checkin status changes (especially when unchecking)
      onSync?.();
    },

    calculateStreak() {
      const { checkinHistory } = get();
      set({ streak: calculateCheckinStreak((checkinHistory ?? []).filter(c => !c.deleted)) });
    },

    addGraceRecord(date: string) {
      if ((get().graceHistory ?? []).some(g => g.date === date && !g.deleted)) return;
      const entry: GraceHistoryEntry = { date, restoredAt: Date.now(), updatedAt: Date.now(), deleted: false };
      set(s => ({
        graceHistory: [...(s.graceHistory ?? []), entry],
      }));
      adapter.persistChange('grace', date, entry).catch(console.error);
      onSync?.();
    },
  });
}
