import { submitCheckinEntry } from '../business';
import { createLogger } from '../logger';
import type { CheckinEntry, GraceHistoryEntry } from '../types';
import { calculateCheckinStreak } from '../utils';

import type { SliceCreator } from './sliceHelper';
import type { StorageAdapter, CheckinSlice } from './types';

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
      // streak 已改为派生状态（useCheckinStreak selector），此方法保留用于向后兼容
      const { checkinHistory } = get();
      calculateCheckinStreak((checkinHistory ?? []).filter(c => !c.deleted));
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
