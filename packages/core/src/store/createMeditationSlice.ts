import type { MedHistoryEntry } from '../types';
import { addMedMinutesToList } from '../business/meditation';
import type { StorageAdapter, MeditationSlice } from './types';
import type { SliceCreator } from './sliceHelper';

export function createMeditationSlice(adapter: StorageAdapter): SliceCreator<MeditationSlice> {
  return (set, get) => ({
    totalMedMinutes: 0,
    medHistory: [],

    addMedMinutes(min: number) {
      const { totalMedMinutes, medHistory } = get();
      const result = addMedMinutesToList(medHistory ?? [], totalMedMinutes ?? 0, min);
      set({ totalMedMinutes: result.total, medHistory: result.history });
      const entry = result.history[0];
      if (entry) adapter.persistChange('meditation', entry.date, entry).catch(console.error);
    },

    calculateTotalMedMin() {
      const medHistory = get().medHistory;
      const total = (medHistory ?? []).reduce((s, m) => {
        const n = parseInt(m.dur) || 0;
        return s + n;
      }, 0);
      set({ totalMedMinutes: total });
    },
  });
}
