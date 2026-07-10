import type { MedHistoryEntry } from '../types';
import { activeOnly } from '../utils';
import { addMedMinutesToList } from '../business/meditation';
import type { StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';
import { createLogger } from '../logger';
const log = createLogger('Store');

export interface MeditationSlice {
  totalMedMinutes: number;
  medHistory: MedHistoryEntry[];
  addMedMinutes: (min: number, trackId?: string, note?: string) => void;
  calculateTotalMedMin: () => void;
}

export function createMeditationSlice(
  adapter: StorageAdapter,
  onSync?: () => void,
): SliceCreator<MeditationSlice> {
  return (set, get) => ({
    totalMedMinutes: 0,
    medHistory: [],
    addMedMinutes(min: number, trackId?: string, note?: string) {
      let entry: ReturnType<typeof addMedMinutesToList>['history'][number] | undefined;
      set(s => {
        const result = addMedMinutesToList(s.medHistory ?? [], s.totalMedMinutes, min, trackId, note);
        const reconciledTotal = activeOnly(result.history).reduce((sum, m) => sum + (m.durMin || 0), 0);
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        entry = result.history.find(m => m.date === todayStr && !m.deleted);
        return { totalMedMinutes: reconciledTotal, medHistory: result.history };
      });
      if (entry) adapter.persistChange('meditation', entry.date, entry).catch(e => log.error(e));
      onSync?.();
    },
    calculateTotalMedMin() {
      const medHistory = get().medHistory;
      const total = (medHistory ?? []).filter(m => !m.deleted).reduce((s, m) => s + (m.durMin || 0), 0);
      set({ totalMedMinutes: total });
    },
  });
}
