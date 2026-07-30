// ─── Mobile-specific UiSlice extension ─────────────────────────
import type {
  FoodSlice, CheckinSlice, ProfileSlice, SettingsSlice, ReflectionSlice,
  StorageAdapter, FullStore,
} from '@egoless-do/core';
import { submitCheckinEntry, createResetDataPatch, createLogger } from '@egoless-do/core';
import type { StateCreator } from 'zustand';

const log = createLogger('App');

export interface PersistError {
  error: string;
  entity: string;
  id: string;
  timestamp: number;
}

export interface MobileUiSlice extends FoodSlice, CheckinSlice, ProfileSlice, SettingsSlice, ReflectionSlice {
  healthSyncEnabled: boolean;
  todaySteps: number | null;
  setHealthSyncEnabled: (v: boolean) => void;
  setTodaySteps: (n: number) => void;
  syncWeightFromHealth: (weight: number) => void;
  resetData: () => void;
  clearLocalData: () => Promise<void>;
  /** Recent persist errors (max 10, newest first). UI can subscribe to show a banner. */
  persistErrors: PersistError[];
  addPersistError: (error: Error, entity: string, id: string) => void;
  clearPersistErrors: () => void;
}

export function createMobileUiSlice(
  adapter: StorageAdapter,
  foodSlice: StateCreator<FullStore, [], [], FoodSlice>,
  checkinSlice: StateCreator<FullStore, [], [], CheckinSlice>,
  profileSlice: StateCreator<FullStore, [], [], ProfileSlice>,
  settingsSlice: StateCreator<FullStore, [], [], SettingsSlice>,
  reflectionSlice: StateCreator<FullStore, [], [], ReflectionSlice>,
  onReset?: () => void,
  onSettingsPersist?: () => void,
  onResetSyncState?: () => Promise<void>,
): StateCreator<FullStore, [], [], MobileUiSlice> {
  return (set, get, api) => ({
    ...foodSlice(set, get, api),
    ...checkinSlice(set, get, api),
    ...profileSlice(set, get, api),
    ...settingsSlice(set, get, api),
    ...reflectionSlice(set, get, api),

    healthSyncEnabled: false,
    todaySteps: null,
    persistErrors: [],

    addPersistError(error: Error, entity: string, id: string) {
      set((s: FullStore & MobileUiSlice) => ({
        persistErrors: [
          { error: error.message, entity, id, timestamp: Date.now() },
          ...(s.persistErrors ?? []).slice(0, 9), // keep max 10
        ],
      } as Partial<FullStore>));
    },

    clearPersistErrors() {
      set({ persistErrors: [] } as Partial<FullStore>);
    },

    setHealthSyncEnabled(v: boolean) { set({ healthSyncEnabled: v } as Partial<FullStore>); onSettingsPersist?.(); },
    setTodaySteps(n: number) { set({ todaySteps: n } as Partial<FullStore>); },

    syncWeightFromHealth(weight: number) {
      const s = get();
      const result = submitCheckinEntry(s.checkinHistory ?? [], false, '', undefined, weight);
      const updatedProfile = { ...(s.userProfile ?? {}), weight, updatedAt: Date.now() };
      set({
        checkinHistory: result.history,
        userProfile: updatedProfile,
      } as Partial<FullStore>);
      const entry = result.history[0];
      if (entry) adapter.persistChange('checkin', entry.date, entry).catch((e) => log.error(e));
      adapter.persistChange('profile', 'self', updatedProfile).catch((e) => log.error(e));
    },

    resetData() {
      const { auth, theme, language } = get();
      set(createResetDataPatch(auth, theme, language) as Partial<FullStore>);
      onReset?.();
    },

    async clearLocalData() {
      // Step 1: Hard-delete all SQLite tables (skip sync push — data is being cleared anyway)
      if (onResetSyncState) {
        await onResetSyncState();
      }

      // Step 2: Reset store to defaults (preserve auth, theme, language)
      const { auth, theme, language } = get();
      set(createResetDataPatch(auth, theme, language) as Partial<FullStore>);

      // Step 3: Pull server data to restore
      await get().pullServerData();
    },
  });
}
