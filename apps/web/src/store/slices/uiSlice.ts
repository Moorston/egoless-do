import type { StateCreator } from 'zustand';
import type { FoodEntry, CheckinRecord, ThemeName, UserProfile, ExerciseEntry } from '@egoless-do/core';
import { uid, dateStr, calculateCheckinStreak } from '@egoless-do/core';
import { enqueueChange } from '../../db/syncQueue';
import type { SyncEntity } from '../../db/webDb';
import type { WebStore } from '../useWebStore';

function q(entity: SyncEntity, id: string, op: 'upsert' | 'delete', payload: unknown) {
  enqueueChange(entity, id, op, payload).catch((e) => console.error('[err]', e));
}

export interface UiSlice {
  theme: ThemeName;
  language: string;
  streak: number;
  waterMl: number;
  waterGoal: number;
  calGoal: number;
  foodLog: FoodEntry[];
  exerciseLog: ExerciseEntry[];
  checkinHistory: CheckinRecord[];
  userProfile: UserProfile;
  remindEnabled: boolean;
  remindTime: string;
  weightUnit: 'kg' | 'lb';
  customTags: string[];
  customMoods: string[];
  // actions
  setTheme: (t: ThemeName) => void;
  setLanguage: (l: string) => void;
  addWater: (ml: number) => void;
  resetWater: () => void;
  setWaterGoal: (ml: number) => void;
  setCalGoal: (n: number) => void;
  addFood: (entry: Omit<FoodEntry, 'id'>) => void;
  deleteFood: (id: string) => void;
  addExercise: (entry: Omit<ExerciseEntry, 'id'>) => void;
  submitCheckin: (done: boolean, note: string, date?: string, weight?: number) => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  setRemindEnabled: (v: boolean) => void;
  setRemindTime: (t: string) => void;
  setWeightUnit: (u: 'kg' | 'lb') => void;
  calculateStreak: () => void;
  resetData: () => void;
  addCustomTag: (tag: string) => void;
  removeCustomTag: (tag: string) => void;
  updateCustomTag: (oldTag: string, newTag: string) => void;
  addCustomMood: (mood: string) => void;
  removeCustomMood: (mood: string) => void;
  updateCustomMood: (oldMood: string, newMood: string) => void;
}

export const createUiSlice: StateCreator<WebStore, [], [], UiSlice> = (set, get) => ({
  theme: 'dark' as ThemeName,
  language: 'zh',
  streak: 0,
  waterMl: 0,
  waterGoal: 2000,
  calGoal: 2000,
  foodLog: [],
  exerciseLog: [],
  checkinHistory: [],
  userProfile: {},
  remindEnabled: false,
  remindTime: '21:00',
  weightUnit: 'kg',
  customTags: [],
  customMoods: [],

  setTheme(theme) { set({ theme }); },
  setLanguage(language) { set({ language }); },
  addWater(ml) { if (ml > 0) set(s => ({ waterMl: Math.min(s.waterMl + ml, s.waterGoal) })); },
  resetWater() { set({ waterMl: 0 }); },
  setWaterGoal(ml) { set({ waterGoal: Math.max(100, ml) }); },
  setCalGoal(n) { set({ calGoal: Math.max(100, n) }); },

  addFood(entry) {
    const e: FoodEntry = { ...entry, id: uid(), updatedAt: Date.now() };
    set(s => ({ foodLog: [e, ...s.foodLog] }));
    q('food', e.id, 'upsert', e);
  },

  deleteFood(id) {
    set(s => ({ foodLog: s.foodLog.filter(f => f.id !== id) }));
    q('food', id, 'delete', { updatedAt: Date.now() });
  },

  addExercise(entry) {
    const e: ExerciseEntry = { ...entry, id: uid(), updatedAt: Date.now() };
    set(s => ({ exerciseLog: [e, ...s.exerciseLog] }));
    q('exercise', e.id, 'upsert', e);
  },

  submitCheckin(done, note, dateOverride, weight) {
    const today = dateOverride ?? dateStr();
    const tempRecord: CheckinRecord = { date: today, done, note, streak: 0, weight, timestamp: Date.now(), updatedAt: Date.now() };
    const newHistory = [tempRecord, ...get().checkinHistory.filter(c => c.date !== today)];
    const newStreak = calculateCheckinStreak(newHistory);
    const record: CheckinRecord = { ...tempRecord, streak: newStreak };
    const finalHistory = [record, ...get().checkinHistory.filter(c => c.date !== today)];
    set({ checkinHistory: finalHistory, streak: newStreak });
    q('checkin', record.date, 'upsert', record);
  },

  updateUserProfile(profile) {
    const updated = { ...get().userProfile, ...profile, updatedAt: Date.now() };
    set({ userProfile: updated });
    q('profile', 'self', 'upsert', updated);
  },

  setRemindEnabled(v) { set({ remindEnabled: v }); },
  setRemindTime(t) { set({ remindTime: t }); },
  setWeightUnit(u) { set({ weightUnit: u }); },

  calculateStreak() {
    const { checkinHistory } = get();
    const newStreak = calculateCheckinStreak(checkinHistory);
    set({ streak: newStreak });
  },

  resetData() {
    const { auth, theme, language } = get();
    // Import defaultDataState dynamically to avoid circular dependency
    set({
      streak: 0, waterMl: 0, waterGoal: 2000, calGoal: 2000,
      habits: [], reflections: [], activeFasting: null, fastingHistory: [],
      totalMedMinutes: 0, medHistory: [], foodLog: [], exerciseLog: [], checkinHistory: [],
      userProfile: {}, auth, theme, language, customTags: [], customMoods: [],
    });
  },

  addCustomTag(tag) {
    if (!tag.trim()) return;
    set(s => ({
      customTags: s.customTags.includes(tag) ? s.customTags : [...s.customTags, tag],
    }));
  },

  removeCustomTag(tag) {
    set(s => ({
      customTags: s.customTags.filter(t => t !== tag),
    }));
  },

  updateCustomTag(oldTag, newTag) {
    if (!newTag.trim()) return;
    set(s => ({
      customTags: s.customTags.map(t => t === oldTag ? newTag : t),
    }));
  },

  addCustomMood(mood) {
    if (!mood.trim()) return;
    set(s => ({
      customMoods: s.customMoods.includes(mood) ? s.customMoods : [...s.customMoods, mood],
    }));
  },

  removeCustomMood(mood) {
    set(s => ({
      customMoods: s.customMoods.filter(m => m !== mood),
    }));
  },

  updateCustomMood(oldMood, newMood) {
    if (!newMood.trim()) return;
    set(s => ({
      customMoods: s.customMoods.map(m => m === oldMood ? newMood : m),
    }));
  },
});
