import { submitCheckinEntry } from '../business';
import { createLogger } from '../logger';
import type { CheckinEntry, GraceHistoryEntry } from '../types';
import { calculateCheckinStreak } from '../utils';
import { calculateStreakFromCheckins } from '../utils';

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
      let previousHistory: CheckinEntry[] = [];
      let newRecord: CheckinEntry | undefined;
      // 乐观更新：立即更新 UI
      set(s => {
        previousHistory = s.checkinHistory ?? [];
        const result = submitCheckinEntry(previousHistory, done, note, dateOverride, weight, grace);
        newRecord = result.record;
        return { checkinHistory: result.history, streak: result.streak };
      });
      // 后台持久化，失败时回滚
      if (newRecord) {
        adapter.persistChange('checkin', newRecord.date, newRecord)
          .catch(e => {
            log.error(e);
            // 回滚：恢复之前的历史
            set({ checkinHistory: previousHistory, streak: calculateCheckinStreak(previousHistory.filter(c => !c.deleted)) });
          });
      }
      onSync?.();
    },

    calculateStreak() {
      // streak 已改为派生状态（useCheckinStreak selector），此方法保留用于向后兼容
      const { checkinHistory } = get();
      const streak = calculateCheckinStreak((checkinHistory ?? []).filter(c => !c.deleted));
      set({ streak });  // 保留以兼容旧代码
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
