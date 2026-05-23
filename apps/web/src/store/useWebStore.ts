// ─── Zustand store for web (localStorage backed) ─────────────────
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Habit, MindReflection, FoodEntry, CheckinRecord, FastingSession, ThemeName, UserProfile,
  AuthState,
} from '@egoless-do/core';
import {
  uid, dateStr, computeStreak, calculateCheckinStreak, estimateFastingKcal,
  createHabitFromForm, createReflection, createFastingSession,
  defaultAppState,
  defaultAuthState,
  defaultDataState,
  apiLogin, apiRegister, apiLogout, apiRefreshToken, apiSyncPull, setApiBase,
} from '@egoless-do/core';
import { enqueueChange } from '../db/syncQueue';

// Configure API base (empty = same origin)
setApiBase('');

// Fire-and-forget enqueue — never blocks UI
function q(entity: 'habit' | 'reflection' | 'fasting' | 'food' | 'checkin', id: string, op: 'upsert' | 'delete', payload: unknown) {
  enqueueChange(entity, id, op, payload).catch((e) => console.error('[err]', e));
}

interface WebStore {
  auth: AuthState;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, code: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  pullServerData: (token?: string) => Promise<void>;
  resetData: () => void;
  theme: ThemeName;
  language: string;
  streak: number;
  waterMl: number;
  waterGoal: number;
  calGoal: number;
  habits: Habit[];
  reflections: MindReflection[];
  activeFasting: FastingSession | null;
  fastingHistory: FastingSession[];
  totalMedMinutes: number;
  medHistory: Array<{ date: string; dur: string; mood: string }>;
  foodLog: FoodEntry[];
  checkinHistory: CheckinRecord[];
  userProfile: UserProfile;
  remindEnabled: boolean;
  remindTime: string;
  weightUnit: 'kg' | 'lb';
  // actions
  addHabit:       (form: Parameters<typeof createHabitFromForm>[0]) => void;
  updateHabit:    (id: string, patch: Partial<Habit>) => void;
  deleteHabit:    (id: string) => void;
  checkinHabit:   (id: string, date: string) => void;
  addReflection:  (params: Parameters<typeof createReflection>[0]) => void;
  togglePin:      (id: string) => void;
  startFasting:   (hours: number) => void;
  stopFasting:    (weight?: number, gender?: 'male' | 'female', age?: number) => void;
  addMedMinutes:  (min: number) => void;
  addFood:        (entry: Omit<FoodEntry, 'id'>) => void;
  submitCheckin:  (done: boolean, note: string, date?: string, weight?: number) => void;
  addWater:       (ml: number) => void;
  resetWater:     () => void;
  setTheme:       (t: ThemeName) => void;
  setLanguage:    (l: string) => void;
  setWaterGoal:   (ml: number) => void;
  setCalGoal:     (n: number) => void;
  deleteFood:     (id: string) => void;
  calculateTotalMedMin: () => void;
  deleteReflection: (id: string) => void;
  changeHabitStatus: (id: string, ns: Habit['status'], reason?: string) => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  setRemindEnabled: (v: boolean) => void;
  setRemindTime: (t: string) => void;
  setWeightUnit: (u: 'kg' | 'lb') => void;
  calculateStreak: () => void;
}

export const useWebStore = create<WebStore>()(
  persist(
    (set, get) => ({
      ...defaultAppState,
      auth:            defaultAuthState,
      theme:           'dark' as ThemeName,
      language:        'zh',
      streak:          0,
      waterMl:         0,
      waterGoal:       2000,
      calGoal:         2000,
      habits:          [],
      reflections:     [],
      activeFasting:   null,
      fastingHistory:  [],
      totalMedMinutes: 0,
      medHistory:      [],
      foodLog:         [],
      checkinHistory:  [],
      userProfile:     {},
      remindEnabled:   false,
      remindTime:      '21:00',
      weightUnit:      'kg',

      async login(email, password) {
        set({ auth: { ...get().auth, isLoading: true } });
        try {
          const res = await apiLogin(email, password);
          set({ auth: { user: res.user, token: res.token, refreshToken: res.refreshToken, isSignedIn: true, isLoading: false, expiresAt: res.expiresAt } });
          // 登录后拉取服务端数据
          await get().pullServerData(res.token);
        } catch (e) {
          set({ auth: { ...get().auth, isLoading: false } });
          throw e;
        }
      },
      async register(email, password, name, code) {
        set({ auth: { ...get().auth, isLoading: true } });
        try {
          const res = await apiRegister(email, password, name, code);
          set({ auth: { user: res.user, token: res.token, refreshToken: res.refreshToken, isSignedIn: true, isLoading: false, expiresAt: res.expiresAt } });
          // 注册后拉取服务端数据
          await get().pullServerData(res.token);
        } catch (e) {
          set({ auth: { ...get().auth, isLoading: false } });
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
          set({ auth: { ...auth, token: res.token, refreshToken: res.refreshToken, expiresAt: res.expiresAt } });
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
        set(s => ({ habits: [...s.habits, h] }));
        q('habit', h.id, 'upsert', h);
      },
      updateHabit(id, patch) {
        const now = Date.now();
        set(s => ({ habits: s.habits.map(h => h.id === id ? { ...h, ...patch, updatedAt: now } : h) }));
        const updated = get().habits.find(h => h.id === id);
        if (updated) q('habit', id, 'upsert', updated);
      },
      deleteHabit(id) {
        set(s => ({ habits: s.habits.filter(h => h.id !== id) }));
        q('habit', id, 'delete', { updatedAt: Date.now() });
      },
      checkinHabit(id, date) {
        const now = Date.now();
        set(s => ({
          habits: s.habits.map(h => {
            if (h.id !== id) return h;
            const checked = h.checkedDates.includes(date)
              ? h.checkedDates.filter(d => d !== date)
              : [...h.checkedDates, date];
            return { ...h, checkedDates: checked, doneDays: checked.length, streak: computeStreak(checked), updatedAt: now };
          }),
        }));
        const updated = get().habits.find(h => h.id === id);
        if (updated) q('habit', id, 'upsert', updated);
      },
      addReflection(params) {
        const r = createReflection(params);
        set(s => ({ reflections: [r, ...s.reflections] }));
        q('reflection', r.id, 'upsert', r);
      },
      togglePin(id) {
        const now = Date.now();
        set(s => ({
          reflections: s.reflections.map(r => r.id === id ? { ...r, isPinned: !r.isPinned, updatedAt: now } : r),
        }));
        const updated = get().reflections.find(r => r.id === id);
        if (updated) q('reflection', id, 'upsert', updated);
      },
      startFasting(hours) {
        if (get().activeFasting) return; // prevent double start
        const session = createFastingSession(hours) as FastingSession;
        set({ activeFasting: session });
        q('fasting', session.id, 'upsert', session);
      },
      stopFasting(weight, gender, age) {
        const { activeFasting, fastingHistory } = get();
        if (!activeFasting) return;
        const durSec = Math.floor((Date.now() - activeFasting.startedAt) / 1000);
        const durHours = durSec / 3600;
        const kcal = estimateFastingKcal(durHours, weight ?? 70, gender ?? 'male', age ?? 30);
        const ended: FastingSession = {
          ...activeFasting,
          endedAt: Date.now(),
          estimatedKcal: kcal,
          updatedAt: Date.now(),
        };
        set({ activeFasting: null, fastingHistory: [ended, ...fastingHistory] });
        q('fasting', ended.id, 'upsert', ended);
      },
      addMedMinutes(min) {
        const today = dateStr();
        const entry = { date: today, dur: `${min}min`, mood: '🌿 平静', updatedAt: Date.now() };
        set(s => ({
          totalMedMinutes: s.totalMedMinutes + min,
          medHistory: [entry, ...s.medHistory],
        }));
        q('meditation', today, 'upsert', entry);
      },
      addFood(entry) {
        const e: FoodEntry = { ...entry, id: uid(), updatedAt: Date.now() };
        set(s => ({ foodLog: [e, ...s.foodLog] }));
        q('food', e.id, 'upsert', e);
      },
      submitCheckin(done, note, dateOverride, weight) {
        const record: CheckinRecord = { date: dateOverride ?? dateStr(), done, note, streak: get().streak, weight, timestamp: Date.now(), updatedAt: Date.now() };
        set(s => ({
          checkinHistory: [record, ...s.checkinHistory.filter(c => c.date !== record.date)],
          streak: done ? s.streak + 1 : 0,
        }));
        q('checkin', record.date, 'upsert', record);
      },
      addWater(ml)  { if (ml > 0) set(s => ({ waterMl: Math.min(s.waterMl + ml, s.waterGoal) })); },
      resetWater()  { set({ waterMl: 0 }); },
      setTheme(theme)       { set({ theme }); },
      setLanguage(language) { set({ language }); },
      setWaterGoal(ml)      { set({ waterGoal: Math.max(100, ml) }); },
      setCalGoal(n)         { set({ calGoal: Math.max(100, n) }); },
      deleteFood(id) {
        set(s => ({ foodLog: s.foodLog.filter(f => f.id !== id) }));
        q('food', id, 'delete', { updatedAt: Date.now() });
      },
      calculateTotalMedMin() {
        const { medHistory } = get();
        const total = medHistory.reduce((sum, entry) => {
          const mins = parseInt(entry.dur) || 0;
          return sum + mins;
        }, 0);
        set({ totalMedMinutes: total });
      },
      deleteReflection(id) {
        set(s => ({ reflections: s.reflections.filter(r => r.id !== id) }));
        q('reflection', id, 'delete', { updatedAt: Date.now() });
      },
      changeHabitStatus(id, ns, reason) {
        const now = Date.now();
        set(s => ({
          habits: s.habits.map(h => h.id === id ? {
            ...h, status: ns,
            pauseReason: ns === 'paused' ? (reason ?? '') : h.pauseReason,
            abandonReason: ns === 'abandoned' ? (reason ?? '') : h.abandonReason,
            updatedAt: now,
          } : h),
        }));
        const updated = get().habits.find(h => h.id === id);
        if (updated) q('habit', id, 'upsert', updated);
      },
      updateUserProfile(profile) {
        const updated = { ...get().userProfile, ...profile, updatedAt: Date.now() };
        set({ userProfile: updated });
        q('profile', 'self', 'upsert', updated);
      },
      setRemindEnabled(v) { set({ remindEnabled: v }); },
      setRemindTime(t)    { set({ remindTime: t }); },
      setWeightUnit(u)    { set({ weightUnit: u }); },
      calculateStreak() {
        const { checkinHistory } = get();
        const newStreak = calculateCheckinStreak(checkinHistory);
        set({ streak: newStreak });
      },
    }),
    {
      name: 'egoless-do-web',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : ({} as Storage)
      ),
      partialize: s => ({
        auth: s.auth, theme: s.theme, language: s.language, streak: s.streak,
        waterGoal: s.waterGoal, calGoal: s.calGoal, waterMl: s.waterMl,
        habits: s.habits, reflections: s.reflections,
        activeFasting: s.activeFasting,
        fastingHistory: s.fastingHistory, totalMedMinutes: s.totalMedMinutes,
        medHistory: s.medHistory, foodLog: s.foodLog, checkinHistory: s.checkinHistory,
        userProfile: s.userProfile, remindEnabled: s.remindEnabled, remindTime: s.remindTime,
        weightUnit: s.weightUnit,
      }),
    }
  )
);
