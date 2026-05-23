import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import Taro from '@tarojs/taro';
import type { Habit, MindReflection, FoodEntry, CheckinRecord, FastingSession, ThemeName } from '../core';
import {
  uid, dateStr, computeStreak, calculateCheckinStreak, estimateFastKcal,
  createHabitFromForm, createReflection, createFastingSession,
  defaultAppState, defaultDataState,
} from '../core';
import { enqueueChange } from './sync';

const wxStorage: StateStorage = {
  getItem:    (key) => {
    const val = Taro.getStorageSync(key);
    if (val === '' || val === undefined || val === null) return null;
    return typeof val === 'string' ? val : JSON.stringify(val);
  },
  setItem:    (key, value) => Taro.setStorageSync(key, value),
  removeItem: (key) => Taro.removeStorageSync(key),
};

// Fire-and-forget enqueue — never blocks UI
function q(entity: string, entityId: string, payload: Record<string, unknown>, deleted = false) {
  enqueueChange(entity, entityId, payload, deleted);
}

interface MedHistoryEntry { date: string; dur: string; mood: string; }

interface MiniStore {
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
  medHistory: MedHistoryEntry[];
  foodLog: FoodEntry[];
  checkinHistory: CheckinRecord[];
  remindEnabled: boolean;
  remindTime: string;
  addHabit:      (form: Parameters<typeof createHabitFromForm>[0]) => void;
  updateHabit:   (id: string, patch: Partial<Habit>) => void;
  deleteHabit:   (id: string) => void;
  checkinHabit:  (id: string, date: string) => void;
  changeHabitStatus: (id: string, ns: Habit['status'], reason?: string) => void;
  addReflection: (params: Parameters<typeof createReflection>[0]) => void;
  togglePin:     (id: string) => void;
  deleteReflection: (id: string) => void;
  startFasting:  (hours: number) => void;
  stopFasting:   () => void;
  addMedMinutes: (min: number) => void;
  addFoodEntry:  (name: string, cal: number, note: string) => void;
  deleteFood:    (id: string) => void;
  submitCheckin: (done: boolean, note: string, dateOverride?: string, weight?: number) => void;
  addWater:      (ml: number) => void;
  resetWater:    () => void;
  setWaterGoal:  (ml: number) => void;
  setCalGoal:    (n: number) => void;
  setTheme:      (t: ThemeName) => void;
  setLanguage:   (l: string) => void;
  setRemindEnabled: (v: boolean) => void;
  setRemindTime:    (t: string) => void;
  resetData:     () => void;
  hydrateFromServer: (data: Record<string, any[]>) => void;
}

export const useStore = create<MiniStore>()(
  persist(
    (set, get) => ({
      ...defaultAppState,
      theme: 'dark', language: 'zh', streak: 0,
      waterMl: 0, waterGoal: 2000, calGoal: 2000,
      habits: [], reflections: [],
      activeFasting: null, fastingHistory: [],
      totalMedMinutes: 0, medHistory: [],
      foodLog: [], checkinHistory: [],
      remindEnabled: false, remindTime: '21:00',

      addHabit(form) {
        const h = createHabitFromForm(form);
        set(s => ({ habits: [...s.habits, h] }));
        q('habit', h.id, h as unknown as Record<string, unknown>);
      },
      updateHabit(id, patch) {
        const now = Date.now();
        let updated: Habit | undefined;
        set(s => ({
          habits: s.habits.map(h => {
            if (h.id !== id) return h;
            updated = { ...h, ...patch, updatedAt: now };
            return updated;
          }),
        }));
        if (updated) q('habit', id, updated as unknown as Record<string, unknown>);
      },
      deleteHabit(id) {
        set(s => ({ habits: s.habits.filter(h => h.id !== id) }));
        q('habit', id, { updatedAt: Date.now() }, true);
      },
      changeHabitStatus(id, ns, reason) {
        const now = Date.now();
        let updated: Habit | undefined;
        set(s => ({
          habits: s.habits.map(h => {
            if (h.id !== id) return h;
            updated = { ...h, status: ns, pauseReason: ns === 'paused' ? (reason ?? '') : h.pauseReason, abandonReason: ns === 'abandoned' ? (reason ?? '') : h.abandonReason, updatedAt: now };
            return updated;
          }),
        }));
        if (updated) q('habit', id, updated as unknown as Record<string, unknown>);
      },
      checkinHabit(id, date) {
        const now = Date.now();
        let updated: Habit | undefined;
        set(s => ({
          habits: s.habits.map(h => {
            if (h.id !== id) return h;
            const checked = h.checkedDates.includes(date)
              ? h.checkedDates.filter(d => d !== date) : [...h.checkedDates, date];
            updated = { ...h, checkedDates: checked, doneDays: checked.length, streak: computeStreak(checked), updatedAt: now };
            return updated;
          }),
        }));
        if (updated) q('habit', id, updated as unknown as Record<string, unknown>);
      },
      addReflection(params) {
        const r = createReflection(params);
        set(s => ({ reflections: [r, ...s.reflections] }));
        q('reflection', r.id, r as unknown as Record<string, unknown>);
      },
      togglePin(id) {
        const now = Date.now();
        let updated: MindReflection | undefined;
        set(s => ({
          reflections: s.reflections.map(r => {
            if (r.id !== id) return r;
            updated = { ...r, isPinned: !r.isPinned, updatedAt: now };
            return updated;
          }),
        }));
        if (updated) q('reflection', id, updated as unknown as Record<string, unknown>);
      },
      deleteReflection(id) {
        set(s => ({ reflections: s.reflections.filter(r => r.id !== id) }));
        q('reflection', id, { updatedAt: Date.now() }, true);
      },
      startFasting(hours) {
        const session = createFastingSession(hours) as FastingSession;
        set({ activeFasting: session });
        q('fasting', session.id, session as unknown as Record<string, unknown>);
      },
      stopFasting() {
        const { activeFasting, fastingHistory } = get();
        if (!activeFasting) return;
        const ended = { ...activeFasting, endedAt: Date.now(),
          estimatedKcal: estimateFastKcal(Math.floor((Date.now() - activeFasting.startedAt) / 1000)),
          updatedAt: Date.now() };
        set({ activeFasting: null, fastingHistory: [ended, ...fastingHistory] });
        q('fasting', ended.id, ended as unknown as Record<string, unknown>);
      },
      addMedMinutes(min) {
        const today = dateStr();
        const entry = { date: today, dur: `${min}min`, mood: '🌿 平静', updatedAt: Date.now() };
        set(s => ({
          totalMedMinutes: s.totalMedMinutes + min,
          medHistory: [entry, ...s.medHistory],
        }));
        q('meditation', today, entry);
      },
      addFoodEntry(name, cal, note) {
        const e: FoodEntry = { id: uid(), name, calories: cal, note, timestamp: Date.now(), updatedAt: Date.now() };
        set(s => ({ foodLog: [e, ...s.foodLog] }));
        q('food', e.id, e as unknown as Record<string, unknown>);
      },
      deleteFood(id) {
        set(s => ({ foodLog: s.foodLog.filter(f => f.id !== id) }));
        q('food', id, { updatedAt: Date.now() }, true);
      },
      submitCheckin(done, note, dateOverride, weight) {
        const record: CheckinRecord = { date: dateOverride ?? dateStr(), done, note, streak: get().streak, weight, timestamp: Date.now(), updatedAt: Date.now() };
        set(s => ({
          checkinHistory: [record, ...s.checkinHistory.filter(c => c.date !== record.date)],
          streak: done ? s.streak + 1 : 0,
        }));
        q('checkin', record.date, record as unknown as Record<string, unknown>);
        Taro.showToast({ title: done ? '打卡成功 ✓' : '记录已保存', icon: done ? 'success' : 'none' });
      },
      addWater(ml) { set(s => ({ waterMl: Math.min(s.waterMl + ml, s.waterGoal) })); },
      resetWater() { set({ waterMl: 0 }); },
      setWaterGoal(ml) { set({ waterGoal: ml }); },
      setCalGoal(n) { set({ calGoal: n }); },
      setTheme(theme) { set({ theme }); },
      setLanguage(language) { set({ language }); },
      setRemindEnabled(v) { set({ remindEnabled: v }); },
      setRemindTime(t) { set({ remindTime: t }); },
      resetData() {
        const { theme, language } = get();
        set({ ...defaultDataState, theme, language });
      },
      hydrateFromServer(data) {
        const patch: Record<string, any> = {};
        const alive = (arr: any[]) => (arr ?? []).filter((x: any) => !x.deleted);
        if (data.habit)       patch.habits = alive(data.habit);
        if (data.reflection)  patch.reflections = alive(data.reflection);
        if (data.fasting) {
          const sessions = alive(data.fasting) as FastingSession[];
          const active = sessions.find(s => !s.endedAt);
          const history = sessions.filter(s => s.endedAt);
          if (active) patch.activeFasting = active;
          if (history.length) patch.fastingHistory = history;
        }
        if (data.food)        patch.foodLog = alive(data.food);
        if (data.checkin)     patch.checkinHistory = alive(data.checkin);
        if (data.meditation) {
          patch.medHistory = alive(data.meditation);
          const total = (patch.medHistory as MedHistoryEntry[]).reduce((sum, e) => {
            return sum + (parseInt(e.dur) || 0);
          }, 0);
          patch.totalMedMinutes = total;
        }
        if (Object.keys(patch).length) set(patch);
      },
    }),
    {
      name: 'egoless-do-mini',
      storage: createJSONStorage(() => wxStorage),
    }
  )
);
