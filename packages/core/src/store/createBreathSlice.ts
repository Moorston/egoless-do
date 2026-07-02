import type { BreathingRecord } from '../types/breath';
import type { StorageAdapter, BreathSlice, FullStore } from './types';
import type { SliceCreator } from './sliceHelper';
import { createLogger } from '../logger';
const log = createLogger('Store');

export function createBreathSlice(
  adapter: StorageAdapter,
  onSync?: () => void,
): SliceCreator<BreathSlice> {
  return (set, get) => ({
    breathHistory: [],

    addBreathRecord(data: Omit<BreathingRecord, 'id' | 'updatedAt' | 'deleted'>) {
      const entry: BreathingRecord = {
        id: `breath_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ...data,
        updatedAt: Date.now(),
        deleted: false,
      };
      set((s: FullStore) => ({ breathHistory: [...(s.breathHistory ?? []), entry] }));
      adapter.persistChange('breath', entry.id, entry).catch((e: unknown) => log.error(e));
      onSync?.();
    },

    removeBreathRecord(id: string) {
      set((s: FullStore) => ({
        breathHistory: (s.breathHistory ?? []).map((r: BreathingRecord) =>
          r.id === id ? { ...r, deleted: true, updatedAt: Date.now() } : r,
        ),
      }));
      adapter.markDeleted('breath', id).catch((e: unknown) => log.error(e));
      onSync?.();
    },
  });
}
