import type { GiveEntry } from '../types';
import type { StorageAdapter, GiveSlice } from './types';
import type { SliceCreator } from './sliceHelper';
import { createLogger } from '../logger';
const log = createLogger('Give');

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function createGiveSlice(
  adapter: StorageAdapter,
  onSync?: () => void,
): SliceCreator<GiveSlice> {
  return (set, get) => ({
    giveHistory: [],

    addGive(entry) {
      const giveEntry: GiveEntry = {
        ...entry,
        id: uuid(),
        updatedAt: Date.now(),
        deleted: false,
      };
      set(s => ({ giveHistory: [giveEntry, ...s.giveHistory] }));
      adapter.persistChange('give', giveEntry.id, giveEntry).catch(e => log.error(e));
      onSync?.();
    },

    deleteGive(id) {
      const now = Date.now();
      set(s => ({
        giveHistory: s.giveHistory.map(g => g.id === id ? { ...g, deleted: true, updatedAt: now } : g),
      }));
      adapter.markDeleted('give', id).catch(e => log.error(e));
      onSync?.();
    },
  });
}
