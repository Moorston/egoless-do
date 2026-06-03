// ─── Zustand store (mobile) — slice composition ────────────────
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import type {
  AuthSlice, HabitSlice, ReflectionSlice, FastingSlice, MeditationSlice,
  FoodSlice, ExerciseSlice, CheckinSlice, ProfileSlice, SettingsSlice, TagMoodSlice,
  PlanSlice, RecycleBinSlice,
} from '@egoless-do/core';
import {
  setApiBase, dateStr, DAILY_RESET_KEY, DailyResetManager,
  createAuthSlice, createHabitSlice, createReflectionSlice, createFastingSlice, createMeditationSlice,
  createFoodSlice, createExerciseSlice, createCheckinSlice, createProfileSlice, createSettingsSlice, createTagMoodSlice,
  createPlanSlice, createRecycleBinSlice,
} from '@egoless-do/core';
import Constants from 'expo-constants';
import { mobileStorageAdapter } from './storageAdapter';
import { createMobileUiSlice, type MobileUiSlice } from './createMobileUiSlice';
import { runSync } from '../features/sync/SyncService';
import { openDatabase } from '../db/schema';
import { dbGetAllFoodEntries } from '../db/queries';

// Configure API base for mobile
const hostUri = Constants.expoConfig?.hostUri ?? Constants.experienceUrl?.split('?')[0]?.split('://')[1];
const devHost = hostUri?.split(':')[0] ?? 'localhost';
const DEV_API = `http://${devHost}:3000`;
const apiBase = __DEV__ ? DEV_API : 'https://your-production-domain.com';
setApiBase(apiBase);

const adapter = mobileStorageAdapter;

export type MobileStore = AuthSlice & HabitSlice & ReflectionSlice & FastingSlice & MeditationSlice
  & FoodSlice & ExerciseSlice & CheckinSlice & ProfileSlice & SettingsSlice & TagMoodSlice
  & MobileUiSlice & PlanSlice & RecycleBinSlice;

// Delayed sync callback - set after store is created
let _autoSyncCallback: (() => void) | null = null;
const triggerAutoSync = () => _autoSyncCallback?.();

export const useAppStore = create<MobileStore>()(
  persist(
    (...a) => ({
      ...createAuthSlice(adapter, () => { runSync().catch(console.error); })(...a),
      ...createHabitSlice(adapter, triggerAutoSync)(...a),
      ...createReflectionSlice(adapter)(...a),
      ...createFastingSlice(adapter, triggerAutoSync)(...a),
      ...createMeditationSlice(adapter, triggerAutoSync)(...a),
      ...createMobileUiSlice(adapter, createFoodSlice(adapter), createExerciseSlice(adapter, triggerAutoSync), createCheckinSlice(adapter, triggerAutoSync), createProfileSlice(adapter), createSettingsSlice(), createTagMoodSlice())(...a),
      ...createPlanSlice(adapter)(...a),
      ...createRecycleBinSlice()(...a),
    }),
    {
      name: 'egoless-do-mobile',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // Set the auto sync callback after store is created
        _autoSyncCallback = () => {
          useAppStore.getState().autoSyncPlanItems?.();
        };

        const dailyReset = new DailyResetManager({
          getLastReset: () => AsyncStorage.getItem(DAILY_RESET_KEY),
          setLastReset: (date) => { AsyncStorage.setItem(DAILY_RESET_KEY, date).catch(console.error); },
          getCheckinHistory: () => useAppStore.getState().checkinHistory ?? [],
          applyPatch: (patch) => useAppStore.setState(patch as any),
          getProfile: () => (useAppStore.getState().userProfile ?? {}) as Record<string, unknown>,
          getWaterGoal: () => useAppStore.getState().waterGoal ?? 2000,
          persistProfile: (data) => {
            adapter.persistChange('profile', 'self', data).catch(console.error);
          },
          onPlanDailyReset: (previousDate) => {
            useAppStore.getState().performDailyReset?.(previousDate);
          },
          addVisibilityListener: (callback) => {
            AppState.addEventListener('change', (s) => {
              if (s === 'active') callback();
            });
          },
        });
        dailyReset.start();

        // Load food entries from SQLite into store
        openDatabase().then(db => dbGetAllFoodEntries(db)).then(entries => {
          if (!entries || entries.length === 0) return;
          const store = useAppStore.getState();
          const existing = new Set((store.foodLog ?? []).map(f => f.id));
          const newEntries = entries.filter(f => !existing.has(f.id));
          if (newEntries.length > 0) {
            const merged = [...newEntries, ...(store.foodLog ?? [])].sort((a, b) => b.timestamp - a.timestamp);
            useAppStore.setState({ foodLog: merged });
          }
        }).catch(err => console.error('[rehydrate] food load error:', err));

        // Clean up expired recycle bin items
        useAppStore.getState().cleanupRecycleBin();
      },
    }
  )
);
