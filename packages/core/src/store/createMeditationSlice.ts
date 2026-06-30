import { activeOnly } from '../utils';
import type { MedHistoryEntry } from '../types';
import { addMedMinutesToList } from '../business/meditation';
import type { StorageAdapter, MeditationSlice } from './types';
import type { SliceCreator } from './sliceHelper';
import { createLogger } from '../logger';
const log = createLogger('Store');

export function createMeditationSlice(
  adapter: StorageAdapter,
  onSync?: () => void,
): SliceCreator<MeditationSlice> {
  return (set, get) => ({
    totalMedMinutes: 0,
    medHistory: [],

    addMedMinutes(min: number, trackId?: string, note?: string) {
      const { medHistory } = get();
      const result = addMedMinutesToList(medHistory ?? [], get().totalMedMinutes, min, trackId, note);
      const reconciledTotal = activeOnly(result.history).reduce((s, m) => s + (m.durMin || 0), 0);
      set({ totalMedMinutes: reconciledTotal, medHistory: result.history });
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const entry = result.history.find(m => m.date === todayStr && !m.deleted);
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
