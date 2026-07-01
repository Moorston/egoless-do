import type { WeightRecord } from '../types';
import type { StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';
import { createLogger } from '../logger';
import { createWeightRecord } from '../business/body';
const log = createLogger('Store');

export interface WeightSlice {
  weightRecords: WeightRecord[];
  addWeight: (record: Parameters<typeof createWeightRecord>[0]) => void;
  updateWeight: (id: string, updates: Partial<WeightRecord>) => void;
  removeWeight: (id: string) => void;
}

export function createWeightSlice(
  adapter: StorageAdapter,
  onSync?: () => void,
): SliceCreator<WeightSlice> {
  return (set, get) => ({
    weightRecords: [],

    addWeight(record) {
      const entry = createWeightRecord(record);
      set(s => ({ weightRecords: [...(s.weightRecords ?? []), entry] }));
      adapter.persistChange('weightRecord', entry.id, entry).catch(e => log.error(e));
      onSync?.();
    },

    updateWeight(id, updates) {
      set(s => ({
        weightRecords: (s.weightRecords ?? []).map(r => r.id === id ? { ...r, ...updates, updatedAt: Date.now() } : r),
      }));
      const entry = get().weightRecords.find(r => r.id === id);
      if (entry) adapter.persistChange('weightRecord', id, entry).catch(e => log.error(e));
      onSync?.();
    },

    removeWeight(id) {
      set(s => ({
        weightRecords: (s.weightRecords ?? []).map(r => r.id === id ? { ...r, deleted: true, updatedAt: Date.now() } : r),
      }));
      const entry = get().weightRecords.find(r => r.id === id);
      if (entry) adapter.persistChange('weightRecord', id, entry).catch(e => log.error(e));
      onSync?.();
    },
  });
}
