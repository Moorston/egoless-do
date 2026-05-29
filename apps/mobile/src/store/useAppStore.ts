// ─── Zustand store (mobile) — slice composition ────────────────
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import type { ThemeName, AuthSlice, HabitSlice, ReflectionSlice, FastingSlice, UiSlice, PlanSlice, RecycleBinSlice } from '@egoless-do/core';
import {
  setApiBase, dateStr, DAILY_RESET_KEY, getDailyResetPatch, msUntilMidnight,
  createAuthSlice, createHabitSlice, createReflectionSlice, createFastingSlice,
  createUiSlice, createPlanSlice, createRecycleBinSlice,
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

export type MobileStore = AuthSlice & HabitSlice & ReflectionSlice & FastingSlice & MobileUiSlice & PlanSlice & RecycleBinSlice;

export const useAppStore = create<MobileStore>()(
  persist(
    (...a) => ({
      ...createAuthSlice<MobileStore>(adapter, () => { runSync().catch(() => {}); })(...a),
      ...createHabitSlice<MobileStore>(adapter)(...a),
      ...createReflectionSlice<MobileStore>(adapter)(...a),
      ...createFastingSlice<MobileStore>(adapter)(...a),
      ...createMobileUiSlice<MobileStore>(adapter, createUiSlice<MobileStore>(adapter))(...a),
      ...createPlanSlice<MobileStore>(adapter)(...a),
      ...createRecycleBinSlice<MobileStore>()(...a),
    }),
    {
      name: 'egoless-do-mobile',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const checkAndReset = () => {
          AsyncStorage.getItem(DAILY_RESET_KEY).then(lastReset => {
            const patch = getDailyResetPatch(lastReset);
            if (patch) {
              // Check if today's checkin has water amount
              const today = dateStr();
              const { checkinHistory } = useAppStore.getState();
              const todayCheckin = (checkinHistory ?? []).find((c: any) => c.date === today);
              let todayWater = 0;
              if (todayCheckin?.note) {
                try {
                  const noteData = JSON.parse(todayCheckin.note);
                  if (typeof noteData.water === 'number') todayWater = noteData.water;
                } catch {}
              }
              // Use checkin water amount if available, otherwise reset to 0
              const resetPatch = { ...patch, waterMl: todayWater };
              useAppStore.setState(resetPatch);
              AsyncStorage.setItem(DAILY_RESET_KEY, dateStr()).catch(() => {});
              const { userProfile, waterGoal } = useAppStore.getState();
              openDatabase().then(db => {
                db.runAsync(
                  `INSERT OR REPLACE INTO user_profiles (profile_id,data,synced) VALUES (?,?,0)`,
                  ['self', JSON.stringify({ ...userProfile, waterMl: todayWater, waterGoal })]
                );
              }).catch(() => {});
            }
          }).catch(() => {});
        };
        checkAndReset();

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
        AppState.addEventListener('change', (s) => {
          if (s === 'active') checkAndReset();
        });
        const scheduleNext = () => {
          setTimeout(() => { checkAndReset(); scheduleNext(); }, msUntilMidnight() + 1000);
        };
        scheduleNext();
      },
    }
  )
);
