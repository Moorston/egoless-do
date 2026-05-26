// ─── Zustand store (mobile) ───────────────────────────────────────
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import type {
  Habit, MindReflection, FoodEntry, CheckinRecord, FastingSession,
  ThemeName, AppState as CoreAppState, AuthState, ExerciseEntry,
} from '@egoless-do/core';
import {
  uid, dateStr, computeStreak, estimateFastKcal, calculateCheckinStreak,
  createHabitFromForm, createReflection, createFastingSession,
  defaultAppState, defaultAuthState, defaultDataState,
  apiLogin, apiRegister, apiRefreshToken, apiLogout, apiSyncPull, setApiBase,
  DAILY_RESET_KEY, getDailyResetPatch, msUntilMidnight,
} from '@egoless-do/core';
import Constants from 'expo-constants';
import { markForDeletion } from '../features/sync/SyncService';
import { openDatabase } from '../db/schema';

// 移动端必须用完整地址（localhost 在真机上不可用，需用电脑局域网 IP）
const hostUri = Constants.expoConfig?.hostUri ?? Constants.experienceUrl?.split('?')[0]?.split('://')[1];
const devHost = hostUri?.split(':')[0] ?? 'localhost';
const DEV_API = `http://${devHost}:3000`;
const apiBase = __DEV__ ? DEV_API : 'https://your-production-domain.com';
setApiBase(apiBase);

interface MedHistoryEntry { date: string; dur: string; mood: string; }

interface AppStore extends CoreAppState {
  habits: Habit[];
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, code: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  pullServerData: (token?: string) => Promise<void>;
  resetData: () => void;
  addHabit: (form: Parameters<typeof createHabitFromForm>[0]) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  checkinHabit: (id: string, date: string) => void;
  changeHabitStatus: (id: string, ns: Habit['status'], reason?: string) => void;
  reflections: MindReflection[];
  addReflection: (params: Parameters<typeof createReflection>[0]) => void;
  togglePin: (id: string) => void;
  deleteReflection: (id: string) => void;
  activeFasting: FastingSession | null;
  fastingHistory: FastingSession[];
  startFasting: (hours: number) => void;
  stopFasting: () => void;
  totalMedMinutes: number;
  addMedMinutes: (min: number) => void;
  medHistory: MedHistoryEntry[];
  foodLog: FoodEntry[];
  addFoodEntry: (name: string, cal: number, note: string) => void;
  deleteFood: (id: string) => void;
  exerciseLog: ExerciseEntry[];
  addExercise: (entry: Omit<ExerciseEntry, 'id' | 'updatedAt'>) => void;
  deleteExercise: (id: string) => void;
  checkinHistory: CheckinRecord[];
  submitCheckin: (done: boolean, note: string, dateOverride?: string, weight?: number) => void;
  addWater: (ml: number) => void;
  resetWater: () => void;
  setWaterGoal: (ml: number) => void;
  setCalGoal: (n: number) => void;
  remindEnabled: boolean;
  remindTime: string;
  setRemindEnabled: (v: boolean) => void;
  setRemindTime: (t: string) => void;
  setTheme: (t: ThemeName) => void;
  setLanguage: (l: string) => void;
  customTags: string[];
  customMoods: string[];
  addCustomTag: (tag: string) => void;
  removeCustomTag: (tag: string) => void;
  updateCustomTag: (oldTag: string, newTag: string) => void;
  addCustomMood: (mood: string) => void;
  removeCustomMood: (mood: string) => void;
  updateCustomMood: (oldMood: string, newMood: string) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...defaultAppState,
      auth: defaultAuthState,
      theme: 'dark', language: 'zh', streak: 0,
      waterMl: 0, waterGoal: 2000, calGoal: 2000,
      habits: [], reflections: [],
      activeFasting: null, fastingHistory: [],
      totalMedMinutes: 0, medHistory: [],
      foodLog: [], exerciseLog: [], checkinHistory: [],
      remindEnabled: false, remindTime: '21:00',
      customTags: [], customMoods: [],

      async login(email, password) {
        set(s => ({ auth: { ...s.auth, isLoading: true } }));
        try {
          const res = await apiLogin(email, password);
          set({ auth: { user: res.user, token: res.token, refreshToken: res.refreshToken, isLoading: false, isSignedIn: true, expiresAt: res.expiresAt } });
          await get().pullServerData(res.token);
        } catch (e) {
          set(s => ({ auth: { ...s.auth, isLoading: false } }));
          throw e;
        }
      },
      async register(email, password, name, code) {
        set(s => ({ auth: { ...s.auth, isLoading: true } }));
        try {
          const res = await apiRegister(email, password, name, code);
          set({ auth: { user: res.user, token: res.token, refreshToken: res.refreshToken, isLoading: false, isSignedIn: true, expiresAt: res.expiresAt } });
          await get().pullServerData(res.token);
        } catch (e) {
          set(s => ({ auth: { ...s.auth, isLoading: false } }));
          throw e;
        }
      },
      logout() {
        const { auth } = get();
        if (auth.token && auth.refreshToken) {
          apiLogout(auth.token, auth.refreshToken).catch((e) => console.error('[err]', e));
        }
        set({ auth: defaultAuthState });
      },
      async refreshAuth() {
        const { auth } = get();
        if (!auth.refreshToken) return;
        try {
          const res = await apiRefreshToken(auth.refreshToken);
          set(s => ({ auth: { ...s.auth, token: res.token, refreshToken: res.refreshToken, expiresAt: res.expiresAt } }));
        } catch {
          set({ auth: defaultAuthState });
        }
      },
      async pullServerData(tokenOverride) {
        const token = tokenOverride ?? get().auth.token;
        if (!token) return;
        try {
          const result = await apiSyncPull(token);
          if (!result.data) return;
          const data = result.data;
          const patch: Record<string, unknown> = {};
          if (data.habit)      patch.habits = data.habit;
          if (data.reflection) patch.reflections = data.reflection;
          if (data.fasting)    patch.fastingHistory = data.fasting;
          if (data.food)       patch.foodLog = data.food;
          if (data.checkin)    patch.checkinHistory = data.checkin;
          if (data.exercise) {
            const local = get().exerciseLog ?? [];
            const server = data.exercise as ExerciseEntry[];
            const map = new Map<string, ExerciseEntry>();
            for (const e of local) map.set(e.id, e);
            for (const e of server) {
              const existing = map.get(e.id);
              if (!existing || (e.updatedAt ?? 0) > (existing.updatedAt ?? 0)) map.set(e.id, e);
            }
            patch.exerciseLog = [...map.values()].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
          }
          if (Object.keys(patch).length) {
            set(patch as any);
            if (patch.checkinHistory) {
              set({ streak: calculateCheckinStreak(patch.checkinHistory as CheckinRecord[]) });
            }
          }
        } catch (err) {
          console.error('[pullServerData] Error:', err);
        }
      },
      resetData() {
        const { auth, theme, language } = get();
        set({ ...defaultDataState, auth, theme, language });
      },

      addHabit(form) {
        const h = createHabitFromForm(form);
        set(s => ({ habits: [...(s.habits ?? []), h] }));
      },
      updateHabit(id, patch) {
        const now = Date.now();
        set(s => ({ habits: (s.habits ?? []).map(h => h.id === id ? { ...h, ...patch, updatedAt: now } : h) }));
      },
      deleteHabit(id) {
        set(s => ({ habits: (s.habits ?? []).filter(h => h.id !== id) }));
        markForDeletion('habit', id).catch((e) => console.error('[err]', e));
      },
      changeHabitStatus(id, ns, reason) {
        const now = Date.now();
        set(s => ({
          habits: (s.habits ?? []).map(h => h.id === id ? {
            ...h, status: ns,
            pauseReason: ns === 'paused' ? (reason ?? '') : h.pauseReason,
            abandonReason: ns === 'abandoned' ? (reason ?? '') : h.abandonReason,
            updatedAt: now,
          } : h),
        }));
      },
      checkinHabit(id, date) {
        const now = Date.now();
        set(s => ({
          habits: (s.habits ?? []).map(h => {
            if (h.id !== id) return h;
            const checked = (h.checkedDates ?? []).includes(date)
              ? (h.checkedDates ?? []).filter(d => d !== date) : [...(h.checkedDates ?? []), date];
            return { ...h, checkedDates: checked, doneDays: checked.length, streak: computeStreak(checked), updatedAt: now };
          }),
        }));
      },
      reflections: [],
      addReflection(params) {
        const r = createReflection(params);
        set(s => ({ reflections: [r, ...(s.reflections ?? [])] }));
      },
      togglePin(id) {
        const now = Date.now();
        set(s => ({ reflections: (s.reflections ?? []).map(r => r.id === id ? { ...r, isPinned: !r.isPinned, updatedAt: now } : r) }));
      },
      deleteReflection(id) {
        set(s => ({ reflections: (s.reflections ?? []).filter(r => r.id !== id) }));
        markForDeletion('reflection', id).catch((e) => console.error('[err]', e));
      },
      activeFasting: null,
      fastingHistory: [],
      startFasting(hours) {
        const session = createFastingSession(hours);
        set({ activeFasting: session as FastingSession });
      },
      stopFasting() {
        const { activeFasting, fastingHistory } = get();
        if (!activeFasting) return;
        const ended: FastingSession = {
          ...activeFasting,
          endedAt: Date.now(),
          estimatedKcal: estimateFastKcal(Math.floor((Date.now() - activeFasting.startedAt) / 1000)),
          updatedAt: Date.now(),
        };
        set({ activeFasting: null, fastingHistory: [ended, ...(fastingHistory ?? [])] });
      },
      totalMedMinutes: 0,
      addMedMinutes(min) {
        const today = dateStr();
        set(s => ({
          totalMedMinutes: s.totalMedMinutes + min,
          medHistory: [{ date: today, dur: `${min}min`, mood: '🌿 平静', updatedAt: Date.now() }, ...(s.medHistory ?? [])],
        }));
      },
      medHistory: [],
      foodLog: [],
      addFoodEntry(name, cal, note) {
        const e: FoodEntry = { id: uid(), name, calories: cal, note, timestamp: Date.now(), updatedAt: Date.now() };
        set(s => ({ foodLog: [e, ...(s.foodLog ?? [])] }));
      },
      deleteFood(id) {
        set(s => ({ foodLog: (s.foodLog ?? []).filter(f => f.id !== id) }));
        markForDeletion('food', id).catch((e) => console.error('[err]', e));
      },
      exerciseLog: [],
      addExercise(entry) {
        const e: ExerciseEntry = { ...entry, id: uid(), updatedAt: Date.now() };
        set(s => ({ exerciseLog: [e, ...(s.exerciseLog ?? [])] }));
        (async () => {
          try {
            const db = await openDatabase();
            await db.runAsync(
              `INSERT OR REPLACE INTO exercise_entries
               (id,sport_key,sport_icon,duration_sec,distance_km,calories,avg_pace,track_points,is_gps_sport,ts,synced)
               VALUES (?,?,?,?,?,?,?,?,?,?,0)`,
              [e.id, e.sportKey, e.sportIcon, e.durationSec,
               e.distanceKm ?? 0, e.calories ?? 0, e.avgPace ?? 0,
               JSON.stringify(e.trackPoints ?? []), e.isGpsSport ? 1 : 0, e.timestamp]
            );
          } catch (err) { console.error('[addExercise] SQLite error:', err); }
        })();
      },
      deleteExercise(id) {
        set(s => ({ exerciseLog: (s.exerciseLog ?? []).filter(e => e.id !== id) }));
        markForDeletion('exercise', id).catch((e) => console.error('[err]', e));
      },
      checkinHistory: [],
      submitCheckin(done, note, dateOverride, weight) {
        const today = dateOverride ?? dateStr();
        const tempRecord: CheckinRecord = { date: today, done, note, streak: 0, weight, timestamp: Date.now(), updatedAt: Date.now() };
        const newHistory = [tempRecord, ...(get().checkinHistory ?? []).filter(c => c.date !== today)];
        const newStreak = calculateCheckinStreak(newHistory);
        const record: CheckinRecord = { ...tempRecord, streak: newStreak };
        const finalHistory = [record, ...(get().checkinHistory ?? []).filter(c => c.date !== today)];
        set({ checkinHistory: finalHistory, streak: newStreak });
      },
      addWater(ml) { set(s => ({ waterMl: Math.min(s.waterMl + ml, s.waterGoal) })); },
      resetWater() { set({ waterMl: 0 }); },
      setWaterGoal(ml) { set({ waterGoal: ml }); },
      setCalGoal(n) { set({ calGoal: n }); },
      setRemindEnabled(v) { set({ remindEnabled: v }); },
      setRemindTime(t) { set({ remindTime: t }); },
      setTheme(theme) { set({ theme }); },
      setLanguage(language) { set({ language }); },

      addCustomTag(tag) {
        if (!tag.trim()) return;
        set(s => ({
          customTags: (s.customTags ?? []).includes(tag) ? s.customTags : [...(s.customTags ?? []), tag],
        }));
      },
      removeCustomTag(tag) {
        set(s => ({
          customTags: (s.customTags ?? []).filter(t => t !== tag),
        }));
      },
      updateCustomTag(oldTag, newTag) {
        if (!newTag.trim()) return;
        set(s => ({
          customTags: (s.customTags ?? []).map(t => t === oldTag ? newTag : t),
        }));
      },
      addCustomMood(mood) {
        if (!mood.trim()) return;
        set(s => ({
          customMoods: (s.customMoods ?? []).includes(mood) ? s.customMoods : [...(s.customMoods ?? []), mood],
        }));
      },
      removeCustomMood(mood) {
        set(s => ({
          customMoods: (s.customMoods ?? []).filter(m => m !== mood),
        }));
      },
      updateCustomMood(oldMood, newMood) {
        if (!newMood.trim()) return;
        set(s => ({
          customMoods: (s.customMoods ?? []).map(m => m === oldMood ? newMood : m),
        }));
      },
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
              useAppStore.setState(patch);
              AsyncStorage.setItem(DAILY_RESET_KEY, dateStr()).catch(() => {});
            }
          }).catch(() => {});
        };
        // Check on load
        checkAndReset();
        // Check when app comes to foreground (handles background / sleep)
        AppState.addEventListener('change', (s) => {
          if (s === 'active') checkAndReset();
        });
        // Schedule midnight reset for when the app stays open across days
        const scheduleNext = () => {
          setTimeout(() => { checkAndReset(); scheduleNext(); }, msUntilMidnight() + 1000);
        };
        scheduleNext();
      },
    }
  )
);
