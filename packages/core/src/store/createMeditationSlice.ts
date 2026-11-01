import { addMedMinutesToList } from '../business/meditation';
import { createLogger } from '../logger';
import type { MedHistoryEntry } from '../types';
import { activeOnly, dateStr } from '../utils';

import type { SliceCreator } from './sliceHelper';
import type { StorageAdapter } from './types';

const log = createLogger('Store');

export interface MeditationSlice {
  totalMedMinutes: number;
  medHistory: MedHistoryEntry[];
  addMedMinutes: (min: number, trackId?: string, note?: string) => void;
  calculateTotalMedMin: () => void;
  updateMeditationNote: (id: string, note: string) => void;
  deleteMeditationEntry: (id: string) => void;
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
        const todayStr = dateStr();
        entry = result.history.find(m => m.date === todayStr && !m.deleted);
        return { totalMedMinutes: reconciledTotal, medHistory: result.history };
      });
      if (entry) adapter.persistChange('meditation', entry.date, entry).catch(err => log.error(err));
      onSync?.();
    },
    calculateTotalMedMin() {
      const medHistory = get().medHistory;
      const total = (medHistory ?? []).filter(m => !m.deleted).reduce((s, m) => s + (m.durMin || 0), 0);
      set({ totalMedMinutes: total });
    },
    updateMeditationNote(id: string, note: string) {
      let updated: MedHistoryEntry | undefined;
      set(s => {
        const newHist = (s.medHistory ?? []).map(e =>
          e.date === id ? { ...e, note, updatedAt: Date.now() } : e
        );
        updated = newHist.find(e => e.date === id);
        return { medHistory: newHist };
      });
      if (updated) adapter.persistChange('meditation', id, updated).catch(e => log.error(e));
    },
    deleteMeditationEntry(id: string) {
      set(s => {
        const newHist = (s.medHistory ?? []).filter(e => e.date !== id);
        const reconciledTotal = activeOnly(newHist).reduce((sum, m) => sum + (m.durMin || 0), 0);
        return { medHistory: newHist, totalMedMinutes: reconciledTotal };
      });
      adapter.markDeleted('meditation', id).catch(e => log.error(e));
      onSync?.();
    },
  });
}
