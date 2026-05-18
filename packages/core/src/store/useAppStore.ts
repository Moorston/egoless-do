import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { MindReflection, Habit, FoodEntry, CheckinEntry, FastHistoryEntry, MedHistoryEntry } from '../types';

const uid = () => Math.random().toString(36).slice(2);
const today = () => new Date().toISOString().slice(0, 10);

const memStore = new Map<string, string>();
export function getStorage(): Storage {
  if (typeof localStorage !== 'undefined') {
    try { localStorage.getItem('__test__'); return localStorage; } catch {}
  }
  return {
    getItem: (name) => memStore.get(name) ?? null,
    setItem: (name, value) => { memStore.set(name, value); },
    removeItem: (name) => { memStore.delete(name); },
    get length() { return memStore.size; },
    clear: () => { memStore.clear(); },
    key: (i) => [...memStore.keys()][i] ?? null,
  };
}

export interface CheckinState {
  done: boolean | null;
  weight: number;
  fasted: boolean;
  water: string;
  practices: { sit: boolean; stand: boolean; chant: boolean };
  note: string;
}

interface AppState {
  themeName: string;
  setThemeName: (n: string) => void;
  lang: string;
  setLang: (l: string) => void;

  streak: number;
  setStreak: (n: number) => void;

  checkinDone: boolean | null;
  checkinHistory: CheckinEntry[];
  setCheckinDone: (v: boolean | null) => void;
  addCheckin: (entry: CheckinEntry) => void;

  waterMl: number;
  waterGoal: number;
  addWater: (ml: number) => void;
  setWaterGoal: (ml: number) => void;

  calGoal: number;
  foodLog: FoodEntry[];
  setCalGoal: (n: number) => void;
  addFood: (entry: Omit<FoodEntry, 'id'>) => void;
  deleteFood: (id: string) => void;

  fastingSession: { id: string; targetHours: number; startedAt: number } | null;
  fastHistory: FastHistoryEntry[];
  startFasting: (targetHours: number) => void;
  stopFasting: () => void;

  totalMedMin: number;
  medHistory: MedHistoryEntry[];
  addMedSession: (minutes: number) => void;

  habits: Habit[];
  addHabit: (h: Omit<Habit, 'id' | 'doneDays' | 'streak' | 'interrupted' | 'checkedDates' | 'pauseReason' | 'abandonReason'>) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  checkInHabit: (id: string, date: string) => void;
  changeHabitStatus: (id: string, ns: Habit['status'], reason?: string) => void;

  remindEnabled: boolean;
  remindTime: string;
  setRemindEnabled: (v: boolean) => void;
  setRemindTime: (t: string) => void;

  reflections: MindReflection[];
  addReflection: (r: Omit<MindReflection, 'id' | 'timestamp' | 'isPinned' | 'isPublished'>) => void;
  deleteReflection: (id: string) => void;
  togglePinReflection: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      themeName: 'dark',
      setThemeName: (n) => set({ themeName: n }),
      lang: 'zh',
      setLang: (l) => set({ lang: l }),

      streak: 7,
      setStreak: (n) => set({ streak: n }),

      checkinDone: null,
      checkinHistory: [
        { date: '2026-05-13', done: true, note: '状态不错', streak: 6 },
        { date: '2026-05-12', done: false, note: '', streak: 5 },
        { date: '2026-05-11', done: true, note: '', streak: 4 },
      ],
      setCheckinDone: (v) => set({ checkinDone: v }),
      addCheckin: (entry) => set((s) => ({ checkinHistory: [entry, ...s.checkinHistory] })),

      waterMl: 0,
      waterGoal: 2000,
      addWater: (ml) => set((s) => ({ waterMl: Math.min(s.waterMl + ml, s.waterGoal) })),
      setWaterGoal: (ml) => set({ waterGoal: ml }),

      calGoal: 2000,
      foodLog: [],
      setCalGoal: (n) => set({ calGoal: n }),
      addFood: (entry) => set((s) => ({ foodLog: [{ ...entry, id: uid() }, ...s.foodLog] })),
      deleteFood: (id) => set((s) => ({ foodLog: s.foodLog.filter((f) => f.id !== id) })),

      fastingSession: null,
      fastHistory: [
        { date: '2026-05-13', dur: '16h 02m', kcal: 580 },
        { date: '2026-05-12', dur: '15h 48m', kcal: 560 },
        { date: '2026-05-11', dur: '16h 05m', kcal: 585 },
      ],
      startFasting: (targetHours) => set({ fastingSession: { id: uid(), targetHours, startedAt: Date.now() } }),
      stopFasting: () => {
        const s = get().fastingSession;
        if (!s) return;
        const durSec = Math.floor((Date.now() - s.startedAt) / 1000);
        const kcal = Math.round(durSec / 3600 * 32);
        const h = Math.floor(durSec / 3600);
        const m = Math.floor((durSec % 3600) / 60);
        set((st) => ({
          fastingSession: null,
          fastHistory: [{ date: today(), dur: `${h}h ${m}m`, kcal }, ...st.fastHistory],
        }));
      },

      totalMedMin: 42,
      medHistory: [
        { date: '2026-05-13', dur: '10分钟', mood: '🌿 平静' },
        { date: '2026-05-12', dur: '5分钟', mood: '🌙 沉思' },
        { date: '2026-05-11', dur: '20分钟', mood: '🌸 感恩' },
      ],
      addMedSession: (minutes) => set((s) => ({
        totalMedMin: s.totalMedMin + minutes,
        medHistory: [{ date: today(), dur: `${minutes}分钟`, mood: '🌿 平静' }, ...s.medHistory],
      })),

      habits: [
        {
          id: '1', name: '早起冥想', startDate: '2026-05-01', targetDays: 30,
          goal: '每天静心5分钟', insight: '宁静致远', createTag: true,
          doneDays: 12, streak: 5, interrupted: 1, status: 'inProgress',
          checkedDates: ['2026-05-01','2026-05-02','2026-05-03','2026-05-04','2026-05-05',
                         '2026-05-08','2026-05-09','2026-05-10','2026-05-11','2026-05-12',
                         '2026-05-13','2026-05-14'],
          pauseReason: '', abandonReason: '',
        },
        {
          id: '2', name: '每日阅读', startDate: today(), targetDays: 60,
          goal: '每天阅读30分钟', insight: '书中自有黄金屋', createTag: true,
          doneDays: 0, streak: 0, interrupted: 0, status: 'notStarted',
          checkedDates: [], pauseReason: '', abandonReason: '',
        },
      ],
      addHabit: (h) => set((s) => ({
        habits: [...s.habits, { ...h, id: uid(), doneDays: 0, streak: 0, interrupted: 0, checkedDates: [], pauseReason: '', abandonReason: '' }],
      })),
      updateHabit: (id, patch) => set((s) => ({
        habits: s.habits.map((h) => h.id === id ? { ...h, ...patch } : h),
      })),
      deleteHabit: (id) => set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),
      checkInHabit: (id, date) => set((s) => ({
        habits: s.habits.map((h) => {
          if (h.id !== id) return h;
          const already = h.checkedDates.includes(date);
          const newDates = already ? h.checkedDates.filter((d) => d !== date) : [...h.checkedDates, date];
          const newDone = already ? h.doneDays - 1 : h.doneDays + 1;
          return {
            ...h,
            checkedDates: newDates,
            doneDays: newDone,
            streak: already ? Math.max(0, h.streak - 1) : h.streak + 1,
            status: (!already && newDone >= h.targetDays) ? 'completed' : h.status,
          };
        }),
      })),
      changeHabitStatus: (id, ns, reason) => set((s) => ({
        habits: s.habits.map((h) => h.id === id ? {
          ...h, status: ns,
          pauseReason: ns === 'paused' ? (reason ?? '') : h.pauseReason,
          abandonReason: ns === 'abandoned' ? (reason ?? '') : h.abandonReason,
        } : h),
      })),

      reflections: [
        { id: '1', timestamp: Date.now() - 3600000, content: '今天跑步时感受到风吹过的那一刻，突然理解了什么叫当下。', tags: ['#跑步心得','#觉察'], mood: '🌿 平静', colors: ['#0C4A6E','#0EA5E9'], isPinned: false, isPublished: false },
        { id: '2', timestamp: Date.now() - 86400000, content: '焦虑不是敌人，它只是提醒你还在乎一些东西。', tags: ['#压力释放','#内心独白'], mood: '🌙 沉思', colors: ['#2D1B69','#7C3AED'], isPinned: false, isPublished: false },
        { id: '3', timestamp: Date.now() - 86400000 * 2, content: '感谢今天的阳光，感谢今天能呼吸。', tags: ['#感恩'], mood: '🌸 感恩', colors: ['#064E3B','#10B981'], isPinned: false, isPublished: false },
      ],
      addReflection: (r) => set((s) => ({
        reflections: [{ ...r, id: uid(), timestamp: Date.now(), isPinned: false, isPublished: false }, ...s.reflections],
      })),
      deleteReflection: (id) => set((s) => ({
        reflections: s.reflections.filter((r) => r.id !== id),
      })),
      remindEnabled: false,
      remindTime: '21:00',
      setRemindEnabled: (v) => set({ remindEnabled: v }),
      setRemindTime: (t) => set({ remindTime: t }),

      togglePinReflection: (id) => set((s) => ({
        reflections: s.reflections.map((r) => r.id === id ? { ...r, isPinned: !r.isPinned } : r),
      })),
    }),
    {
      name: 'egoless-app-storage',
      storage: createJSONStorage(() => getStorage()),
    },
  ),
);
