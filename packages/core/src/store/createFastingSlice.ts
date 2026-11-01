import { startFastingSession, stopFastingSession, type StopFastingOpts } from '../business/fasting';
import { createLogger } from '../logger';
import type { FastingSession } from '../types';

import type { SliceCreator } from './sliceHelper';
import type { StorageAdapter } from './types';

const log = createLogger('Store');

export interface FastingSlice {
  activeFasting: FastingSession | null;
  fastingHistory: FastingSession[];
  startFasting: (hours: number) => void;
  stopFasting: (opts?: StopFastingOpts & { note?: string }) => void;
  updateFastingNote: (id: string, note: string) => void;
  deleteFastingEntry: (id: string) => void;
}

export function createFastingSlice(
  adapter: StorageAdapter,
  onSync?: () => void,
): SliceCreator<FastingSlice> {
  return (set, get) => ({
    activeFasting: null,
    fastingHistory: [],
    startFasting(hours: number) {
      const current = get().activeFasting;
      const session = startFastingSession(current, hours);
      if (session) {
        set({ activeFasting: session });
        adapter.persistChange('fasting', session.id, session).catch(e => log.error(e));
      }
    },
    stopFasting(opts?: StopFastingOpts & { note?: string }) {
      const current = get().activeFasting;
      if (!current) return;
      const result = stopFastingSession(current, opts);
      set(s => ({
        activeFasting: null,
        fastingHistory: [result, ...(s.fastingHistory ?? [])],
      }));
      adapter.persistChange('fasting', result.id, result).catch(e => log.error(e));
      onSync?.();
    },
    updateFastingNote(id: string, note: string) {
      let updated: FastingSession | undefined;
      set(s => {
        const newHist = (s.fastingHistory ?? []).map(e =>
          e.id === id ? { ...e, note, updatedAt: Date.now() } : e
        );
        updated = newHist.find(e => e.id === id);
        return { fastingHistory: newHist };
      });
      if (updated) adapter.persistChange('fasting', id, updated).catch(e => log.error(e));
    },
    deleteFastingEntry(id: string) {
      set(s => ({
        fastingHistory: (s.fastingHistory ?? []).filter(e => e.id !== id),
      }));
      adapter.markDeleted('fasting', id).catch(e => log.error(e));
      onSync?.();
    },
  });
}
