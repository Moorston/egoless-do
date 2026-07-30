import { submitCheckinEntry } from '../business';
import { createLogger } from '../logger';
import type { CheckinEntry, GraceHistoryEntry } from '../types';

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
    graceHistory: [],

    submitCheckin(done: boolean, note: string, dateOverride?: string, weight?: number, grace?: boolean) {
      let previousHistory: CheckinEntry[] = [];
      let newRecord: CheckinEntry | undefined;
      // 乐观更新：立即更新 UI
      set(s => {
        previousHistory = s.checkinHistory ?? [];
        const result = submitCheckinEntry(previousHistory, done, note, dateOverride, weight, grace);
        newRecord = result.record;
        return { checkinHistory: result.history };
      });
      // 后台持久化，失败时回滚
      if (newRecord) {
        adapter.persistChange('checkin', newRecord.date, newRecord)
          .catch(e => {
            log.error(e);
            // 回滚：恢复之前的历史
            set({ checkinHistory: previousHistory });
          });
      }
      onSync?.();
    },

    /**
     * @deprecated streak 已改为派生状态（useCheckinStreak selector），此方法保留用于向后兼容。
     * 调用无实际效果，将在后续版本移除。
     */
    calculateStreak() {
      // no-op: streak 由 useCheckinStreak selector 从 checkinHistory 派生
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
