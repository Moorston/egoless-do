import type { StateCreator } from 'zustand';
import type { FastingSession, MedHistoryEntry } from '../types';
import { startFastingSession, stopFastingSession, type StopFastingOpts } from '../business/fasting';
import { addMedMinutesToList } from '../business/meditation';
import type { StorageAdapter } from './storageAdapter';
import type { FastingSlice } from './types';

export function createFastingSlice<S extends FastingSlice>(
  adapter: StorageAdapter,
): StateCreator<S, [], [], FastingSlice> {
  return (set, get) => ({
    activeFasting: null,
    fastingHistory: [],
    totalMedMinutes: 0,
    medHistory: [],

    startFasting(hours: number) {
      const current = (get() as any).activeFasting as FastingSession | null;
      const session = startFastingSession(current, hours);
      if (session) {
        set({ activeFasting: session } as any);
        adapter.persistChange('fasting', session.id, session as any).catch(console.error);
      }
    },

    stopFasting(opts?: StopFastingOpts) {
      const active = (get() as any).activeFasting as FastingSession | null;
      if (!active) return;
      const finished = stopFastingSession(active, opts);
      set(((s: any) => ({
        activeFasting: null,
        fastingHistory: [finished, ...(s.fastingHistory ?? [])],
      })) as any);
      adapter.persistChange('fasting', finished.id, finished as any).catch(console.error);
    },

    addMedMinutes(min: number) {
      const { totalMedMinutes, medHistory } = get() as any;
      const result = addMedMinutesToList(medHistory ?? [], totalMedMinutes ?? 0, min);
      set({ totalMedMinutes: result.total, medHistory: result.history } as any);
      const entry = result.history[0];
      if (entry) adapter.persistChange('meditation', entry.date, entry as any).catch(console.error);
    },

    calculateTotalMedMin() {
      const medHistory = (get() as any).medHistory as MedHistoryEntry[];
      const total = (medHistory ?? []).reduce((s: number, m: MedHistoryEntry) => {
        const n = parseInt(m.dur) || 0;
        return s + n;
      }, 0);
      set({ totalMedMinutes: total } as any);
    },
  });
}
