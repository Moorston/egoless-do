import type { Dedication, DedicationSettings } from '../types';
import { DEFAULT_DEDICATION_SETTINGS } from '../types';
import type { StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';
import { createLogger } from '../logger';
const log = createLogger('Store');

function genId() {
  return 'd_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export interface DedicationSlice {
  dedications: Dedication[];
  dedicationSettings: DedicationSettings;
  addDedication: (data: Omit<Dedication, 'id' | 'updatedAt' | 'deleted'>) => void;
  removeDedication: (id: string) => void;
  updateDedicationSettings: (settings: Partial<DedicationSettings>) => void;
}

export function createDedicationSlice(
  adapter: StorageAdapter,
  onSync?: () => void,
): SliceCreator<DedicationSlice> {
  return (set, get) => ({
    dedications: [],
    dedicationSettings: { ...DEFAULT_DEDICATION_SETTINGS },

    addDedication(data) {
      const entry: Dedication = {
        ...data,
        id: genId(),
        updatedAt: Date.now(),
        deleted: false,
      };
      set((s: DedicationSlice) => ({ dedications: [...(s.dedications ?? []), entry] }));
      adapter.persistChange('dedication', entry.id, entry).catch(e => log.error(e));
      onSync?.();
    },

    removeDedication(id) {
      set((s: DedicationSlice) => ({
        dedications: (s.dedications ?? []).map((d: Dedication) => d.id === id ? { ...d, deleted: true, updatedAt: Date.now() } : d),
      }));
      const entry = get().dedications.find((d: Dedication) => d.id === id);
      if (entry) adapter.persistChange('dedication', id, entry).catch(e => log.error(e));
      onSync?.();
    },

    updateDedicationSettings(settings) {
      set((s: DedicationSlice) => ({
        dedicationSettings: { ...s.dedicationSettings, ...settings },
      }));
    },
  });
}
