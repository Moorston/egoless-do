import type { CheckinEntry, GraceHistoryEntry } from '../types';
import { calculateCheckinStreak } from '../utils';
import { submitCheckinEntry } from '../business';
import type { StorageAdapter, CheckinSlice } from './types';
import type { SliceCreator } from './sliceHelper';
import { createLogger } from '../logger';
const log = createLogger('Store');

export type { CheckinSlice } from './types';

export function createCheckinSlice(
  adapter: StorageAdapter,
  onSync?: () => void,
): SliceCreator<CheckinSlice> {
  return (set, get) => ({
    // ── Checkin ────────────────────────────────────────────────────────
    checkinHistory: [],
    streak: 0,
    graceHistory: [],

    submitCheckin(done: boolean, note: string, dateOverride?: string, weight?: number, grace?: boolean) {
      let record: CheckinEntry | undefined;
      set(s => {
        const result = submitCheckinEntry(s.checkinHistory ?? [], done, note, dateOverride, weight, grace);
        record = result.record;
        return { checkinHistory: result.history, streak: result.streak };
      });
      if (record) adapter.persistChange('checkin', record.date, record).catch(e => log.error(e));
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
      adapter.persistChange('grace', date, entry).catch(e => log.error(e));
      onSync?.();
    },
  });
}
