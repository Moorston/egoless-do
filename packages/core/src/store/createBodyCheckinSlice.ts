import type { BodyCheckin } from '../types';
import type { StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';
import { createLogger } from '../logger';
import { createBodyCheckin } from '../business/body';
const log = createLogger('Store');

export interface BodyCheckinSlice {
  bodyCheckins: BodyCheckin[];
  upsertBodyCheckin: (data: Parameters<typeof createBodyCheckin>[0]) => void;
  removeBodyCheckin: (id: string) => void;
}

export function createBodyCheckinSlice(
  adapter: StorageAdapter,
  onSync?: () => void,
): SliceCreator<BodyCheckinSlice> {
  return (set, get) => ({
    bodyCheckins: [],

    upsertBodyCheckin(data) {
      const existing = (get().bodyCheckins ?? []).find(c => c.date === data.date && !c.deleted);
      if (existing) {
        // Update existing entry for the same date
        const updated = { ...existing, ...data, updatedAt: Date.now() };
        set(s => ({
          bodyCheckins: (s.bodyCheckins ?? []).map(c => c.id === existing.id ? updated : c),
        }));
        adapter.persistChange('bodyCheckin', existing.id, updated).catch(e => log.error(e));
      } else {
        // Create new entry
        const entry = createBodyCheckin(data);
        set(s => ({ bodyCheckins: [...(s.bodyCheckins ?? []), entry] }));
        adapter.persistChange('bodyCheckin', entry.id, entry).catch(e => log.error(e));
      }
      onSync?.();
    },

    removeBodyCheckin(id) {
      set(s => ({
        bodyCheckins: (s.bodyCheckins ?? []).map(c => c.id === id ? { ...c, deleted: true, updatedAt: Date.now() } : c),
      }));
      const entry = get().bodyCheckins.find(c => c.id === id);
      if (entry) adapter.persistChange('bodyCheckin', id, entry).catch(e => log.error(e));
      onSync?.();
    },
  });
}
