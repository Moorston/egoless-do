// ─── Zustand store (mobile) ───────────────────────────────────────
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Habit, MindReflection, FoodEntry, CheckinRecord, FastingSession,
  ThemeName, AppState, AuthState,
} from '@egoless-do/core';
import {
  uid, dateStr, computeStreak, estimateFastKcal,
  createHabitFromForm, createReflection, createFastingSession,
  defaultAppState, defaultAuthState, defaultDataState,
  apiLogin, apiRegister, apiRefreshToken, apiLogout, apiSyncPull, setApiBase,
} from '@egoless-do/core';
import Constants from 'expo-constants';
import { markForDeletion } from '../features/sync/SyncService';

// 移动端必须用完整地址（localhost 在真机上不可用，需用电脑局域网 IP）
const hostUri = Constants.expoConfig?.hostUri ?? Constants.experienceUrl?.split('?')[0]?.split('://')[1];
const devHost = hostUri?.split(':')[0] ?? 'localhost';
const DEV_API = `http://${devHost}:3000`;
const apiBase = __DEV__ ? DEV_API : 'https://your-production-domain.com';
setApiBase(apiBase);
console.log('[Auth] API base:', apiBase);

interface MedHistoryEntry { date: string; dur: string; mood: string; }

interface AppStore extends AppState {
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
      foodLog: [], checkinHistory: [],
      remindEnabled: false, remindTime: '21:00',

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
          const { data } = await apiSyncPull(token);
          if (!data) return;
          const patch: Record<string, unknown> = {};
          if (data.habit)      patch.habits = data.habit;
          if (data.reflection) patch.reflections = data.reflection;
          if (data.fasting)    patch.fastingHistory = data.fasting;
          if (data.food)       patch.foodLog = data.food;
          if (data.checkin)    patch.checkinHistory = data.checkin;
          if (Object.keys(patch).length) set(patch as any);
        } catch {
          // 拉取失败不阻断登录流程
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
      checkinHistory: [],
      submitCheckin(done, note, dateOverride, weight) {
        const record: CheckinRecord = { date: dateOverride ?? dateStr(), done, note, streak: get().streak, weight, timestamp: Date.now(), updatedAt: Date.now() };
        set(s => ({
          checkinHistory: [record, ...(s.checkinHistory ?? []).filter(c => c.date !== record.date)],
          streak: done ? s.streak + 1 : 0,
        }));
      },
      addWater(ml) { set(s => ({ waterMl: Math.min(s.waterMl + ml, s.waterGoal) })); },
      resetWater() { set({ waterMl: 0 }); },
      setWaterGoal(ml) { set({ waterGoal: ml }); },
      setCalGoal(n) { set({ calGoal: n }); },
      setRemindEnabled(v) { set({ remindEnabled: v }); },
      setRemindTime(t) { set({ remindTime: t }); },
      setTheme(theme) { set({ theme }); },
      setLanguage(language) { set({ language }); },
    }),
    {
      name: 'egoless-do-mobile',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
