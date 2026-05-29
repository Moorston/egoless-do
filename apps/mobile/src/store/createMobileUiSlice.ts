// ─── Mobile-specific UiSlice extension ─────────────────────────
import type { StateCreator } from 'zustand';
import type { UiSlice } from '@egoless-do/core';
import { submitCheckinEntry } from '@egoless-do/core';
import type { StorageAdapter } from '@egoless-do/core';

export interface MobileUiSlice extends UiSlice {
  healthSyncEnabled: boolean;
  todaySteps: number | null;
  setHealthSyncEnabled: (v: boolean) => void;
  setTodaySteps: (n: number) => void;
  syncWeightFromHealth: (weight: number) => void;
}

export function createMobileUiSlice<S extends MobileUiSlice>(
  adapter: StorageAdapter,
  baseCreateUiSlice: StateCreator<S, [], [], UiSlice>,
): StateCreator<S, [], [], MobileUiSlice> {
  return (set, get, api) => ({
    ...baseCreateUiSlice(set, get, api),

    healthSyncEnabled: false,
    todaySteps: null,

    setHealthSyncEnabled(v: boolean) { set({ healthSyncEnabled: v } as any); },
    setTodaySteps(n: number) { set({ todaySteps: n } as any); },

    syncWeightFromHealth(weight: number) {
      const s = get() as any;
      const result = submitCheckinEntry(s.checkinHistory ?? [], false, '', undefined, weight);
      set({
        checkinHistory: result.history,
        streak: result.streak,
        userProfile: { ...(s.userProfile ?? {}), weight },
      } as any);
      const entry = result.history[0];
      if (entry) adapter.persistChange('checkin', entry.date, entry as any).catch(console.error);
    },
  });
}
