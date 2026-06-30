import type { FastingSession } from '../types';
import { startFastingSession, stopFastingSession, type StopFastingOpts } from '../business/fasting';
import type { StorageAdapter, FastingSlice } from './types';
import type { SliceCreator } from './sliceHelper';
import { createLogger } from '../logger';
const log = createLogger('Store');

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
  });
}
