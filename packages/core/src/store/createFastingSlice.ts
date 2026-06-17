import type { FastingSession } from '../types';
import { startFastingSession, stopFastingSession, type StopFastingOpts } from '../business/fasting';
import type { StorageAdapter, FastingSlice } from './types';
import type { SliceCreator } from './sliceHelper';

export function createFastingSlice(
  adapter: StorageAdapter,
  onSync?: () => void,
): SliceCreator<FastingSlice> {
  return (set: any, get: any) => ({
    activeFasting: null,
    fastingHistory: [],

    startFasting(hours: number) {
      const current = get().activeFasting;
      const session = startFastingSession(current, hours);
      if (session) {
        set({ activeFasting: session });
        adapter.persistChange('fasting', session.id, session).catch(console.error);
      }
    },

    stopFasting(opts?: StopFastingOpts) {
      const active = get().activeFasting;
      if (!active) return;
      const finished = stopFastingSession(active, opts);
      set(s => ({
        activeFasting: null,
        fastingHistory: [finished, ...(s.fastingHistory ?? [])],
      }));
      adapter.persistChange('fasting', finished.id, finished).catch(console.error);
      onSync?.();
    },
  });
}
