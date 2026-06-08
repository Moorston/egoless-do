// ─── Mobile-specific UiSlice extension ─────────────────────────
import type { StateCreator } from 'zustand';
import type {
  FoodSlice, ExerciseSlice, CheckinSlice, ProfileSlice, SettingsSlice, TagMoodSlice,
  StorageAdapter, FullStore,
} from '@egoless-do/core';
import { submitCheckinEntry, createResetDataPatch } from '@egoless-do/core';

export interface MobileUiSlice extends FoodSlice, ExerciseSlice, CheckinSlice, ProfileSlice, SettingsSlice, TagMoodSlice {
  healthSyncEnabled: boolean;
  todaySteps: number | null;
  setHealthSyncEnabled: (v: boolean) => void;
  setTodaySteps: (n: number) => void;
  syncWeightFromHealth: (weight: number) => void;
  resetData: () => void;
}

export function createMobileUiSlice(
  adapter: StorageAdapter,
  foodSlice: StateCreator<FullStore, [], [], FoodSlice>,
  exerciseSlice: StateCreator<FullStore, [], [], ExerciseSlice>,
  checkinSlice: StateCreator<FullStore, [], [], CheckinSlice>,
  profileSlice: StateCreator<FullStore, [], [], ProfileSlice>,
  settingsSlice: StateCreator<FullStore, [], [], SettingsSlice>,
  tagMoodSlice: StateCreator<FullStore, [], [], TagMoodSlice>,
  onReset?: () => void,
): StateCreator<FullStore, [], [], MobileUiSlice> {
  return (set, get, api) => ({
    ...foodSlice(set, get, api),
    ...exerciseSlice(set, get, api),
    ...checkinSlice(set, get, api),
    ...profileSlice(set, get, api),
    ...settingsSlice(set, get, api),
    ...tagMoodSlice(set, get, api),

    healthSyncEnabled: false,
    todaySteps: null,

    setHealthSyncEnabled(v: boolean) { set({ healthSyncEnabled: v } as any); },
    setTodaySteps(n: number) { set({ todaySteps: n } as any); },

    syncWeightFromHealth(weight: number) {
      const s = get();
      const result = submitCheckinEntry(s.checkinHistory ?? [], false, '', undefined, weight);
      const updatedProfile = { ...(s.userProfile ?? {}), weight, updatedAt: Date.now() };
      set({
        checkinHistory: result.history,
        streak: result.streak,
        userProfile: updatedProfile,
      } as any);
      const entry = result.history[0];
      if (entry) adapter.persistChange('checkin', entry.date, entry).catch(console.error);
      adapter.persistChange('profile', 'self', updatedProfile).catch(console.error);
    },

    resetData() {
      const { auth, theme, language } = get();
      set(createResetDataPatch(auth, theme, language) as any);
      onReset?.();
    },
  });
}
