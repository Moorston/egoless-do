import type { StateCreator } from 'zustand';
import type {
  FoodEntry, ExerciseEntry, CheckinEntry, ThemeName,
  UserProfile, CustomFoodPreset,
} from '../types';
import { uid, calculateCheckinStreak } from '../utils';
import {
  deleteFoodFromList, deleteExerciseFromList,
  submitCheckinEntry,
  addCustomItem, removeCustomItem, updateCustomItem, reorderItem, ensureOrderContains,
} from '../business';
import { TAGS_PRESET, MOODS } from '../constants';
import type { StorageAdapter } from './storageAdapter';
import type { UiSlice } from './types';

export function createUiSlice<S extends UiSlice>(
  adapter: StorageAdapter,
): StateCreator<S, [], [], UiSlice> {
  return (set, get) => ({
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
    allTagsOrder: [],
    allMoodsOrder: [],
    customFoodPresets: [],

    setTheme(theme: ThemeName) { set({ theme } as any); },
    setLanguage(language: string) { set({ language } as any); },

    addWater(ml: number) {
      if (ml > 0) {
        set(((s: any) => ({ waterMl: Math.min((s.waterMl ?? 0) + ml, s.waterGoal ?? 2000) })) as any);
        const s = get() as any;
        adapter.persistChange('profile', 'self', {
          ...s.userProfile, waterMl: s.waterMl, waterGoal: s.waterGoal, updatedAt: Date.now(),
        }).catch(console.error);
      }
    },

    resetWater() {
      set({ waterMl: 0 } as any);
      const s = get() as any;
      adapter.persistChange('profile', 'self', {
        ...s.userProfile, waterMl: 0, waterGoal: s.waterGoal, updatedAt: Date.now(),
      }).catch(console.error);
    },

    setWaterGoal(ml: number) {
      set({ waterGoal: Math.max(100, ml) } as any);
      const s = get() as any;
      adapter.persistChange('profile', 'self', {
        ...s.userProfile, waterMl: s.waterMl, waterGoal: s.waterGoal, updatedAt: Date.now(),
      }).catch(console.error);
    },

    setCalGoal(n: number) { set({ calGoal: Math.max(100, n) } as any); },

    addFood(entry: Omit<FoodEntry, 'id'>) {
      const e: FoodEntry = { ...entry, id: uid(), updatedAt: Date.now() };
      set(((s: any) => ({ foodLog: [e, ...(s.foodLog ?? [])] })) as any);
      adapter.persistChange('food', e.id, e as any).catch(console.error);
    },

    deleteFood(id: string) {
      const state = get() as any;
      const food = (state.foodLog ?? []).find((f: any) => f.id === id);
      if (food && state.addToRecycleBin) {
        state.addToRecycleBin({ id, entityType: 'food', data: food });
      }
      set(((s: any) => ({ foodLog: deleteFoodFromList(s.foodLog ?? [], id) })) as any);
      adapter.markDeleted('food', id).catch(console.error);
    },

    addExercise(entry: Omit<ExerciseEntry, 'id'>) {
      const e: ExerciseEntry = { ...entry, id: uid(), updatedAt: Date.now() };
      set(((s: any) => ({ exerciseLog: [e, ...(s.exerciseLog ?? [])] })) as any);
      adapter.persistChange('exercise', e.id, e as any).catch(console.error);
    },

    deleteExercise(id: string) {
      const state = get() as any;
      const exercise = (state.exerciseLog ?? []).find((e: any) => e.id === id);
      if (exercise && state.addToRecycleBin) {
        state.addToRecycleBin({ id, entityType: 'exercise', data: exercise });
      }
      set(((s: any) => ({ exerciseLog: deleteExerciseFromList(s.exerciseLog ?? [], id) })) as any);
      adapter.markDeleted('exercise', id).catch(console.error);
    },

    submitCheckin(done: boolean, note: string, dateOverride?: string, weight?: number) {
      const history = (get() as any).checkinHistory as CheckinEntry[];
      const result = submitCheckinEntry(history ?? [], done, note, dateOverride, weight);
      set({ checkinHistory: result.history, streak: result.streak } as any);
      adapter.persistChange('checkin', result.record.date, result.record as any).catch(console.error);
    },

    addGraceRecord(date: string) {
      const entry = { date, restoredAt: Date.now() };
      set(((s: any) => ({
        graceHistory: [...(s.graceHistory ?? []), entry],
      })) as any);
      adapter.persistChange('grace', date, entry as any).catch(console.error);
    },

    updateUserProfile(profile: Partial<UserProfile>) {
      const current = (get() as any).userProfile as UserProfile;
      const updated = { ...current, ...profile, updatedAt: Date.now() };
      set({ userProfile: updated } as any);
      adapter.persistChange('profile', 'self', updated as any).catch(console.error);
    },

    setRemindEnabled(v: boolean) { set({ remindEnabled: v } as any); },
    setRemindTime(t: string) { set({ remindTime: t } as any); },
    setWeightUnit(u: 'kg' | 'lb') { set({ weightUnit: u } as any); },

    calculateStreak() {
      const { checkinHistory } = get() as any;
      set({ streak: calculateCheckinStreak(checkinHistory ?? []) } as any);
    },

    resetData() {
      const { auth, theme, language } = get() as any;
      set({
        streak: 0, waterMl: 0, waterGoal: 2000, calGoal: 2000,
        habits: [], reflections: [], activeFasting: null, fastingHistory: [],
        totalMedMinutes: 0, medHistory: [], foodLog: [], exerciseLog: [], checkinHistory: [],
        userProfile: {}, auth, theme, language, customTags: [], customMoods: [],
        allTagsOrder: [], allMoodsOrder: [],
        plans: [], planItems: [], planItemCheckins: [],
      } as any);
    },

    addCustomTag(tag: string) {
      set(((s: any) => ({
        customTags: addCustomItem(s.customTags ?? [], tag),
        allTagsOrder: (s.allTagsOrder ?? []).includes(tag) ? s.allTagsOrder : [...(s.allTagsOrder ?? []), tag],
      })) as any);
    },
    removeCustomTag(tag: string) {
      set(((s: any) => ({
        customTags: removeCustomItem(s.customTags ?? [], tag),
        allTagsOrder: (s.allTagsOrder ?? []).filter((t: string) => t !== tag),
      })) as any);
    },
    updateCustomTag(oldTag: string, newTag: string) {
      set(((s: any) => ({
        customTags: updateCustomItem(s.customTags ?? [], oldTag, newTag),
        allTagsOrder: (s.allTagsOrder ?? []).map((t: string) => t === oldTag ? newTag : t),
      })) as any);
    },
    addCustomMood(mood: string) {
      set(((s: any) => ({
        customMoods: addCustomItem(s.customMoods ?? [], mood),
        allMoodsOrder: (s.allMoodsOrder ?? []).includes(mood) ? s.allMoodsOrder : [...(s.allMoodsOrder ?? []), mood],
      })) as any);
    },
    removeCustomMood(mood: string) {
      set(((s: any) => ({
        customMoods: removeCustomItem(s.customMoods ?? [], mood),
        allMoodsOrder: (s.allMoodsOrder ?? []).filter((m: string) => m !== mood),
      })) as any);
    },
    updateCustomMood(oldMood: string, newMood: string) {
      set(((s: any) => ({
        customMoods: updateCustomItem(s.customMoods ?? [], oldMood, newMood),
        allMoodsOrder: (s.allMoodsOrder ?? []).map((m: string) => m === oldMood ? newMood : m),
      })) as any);
    },
    reorderCustomTag(fromIndex: number, toIndex: number) { set(((s: any) => ({ customTags: reorderItem(s.customTags ?? [], fromIndex, toIndex) })) as any); },
    reorderCustomMood(fromIndex: number, toIndex: number) { set(((s: any) => ({ customMoods: reorderItem(s.customMoods ?? [], fromIndex, toIndex) })) as any); },
    reorderAllTag(fromIndex: number, toIndex: number) {
      set(((s: any) => {
        const currentOrder = s.allTagsOrder ?? [];
        const order = currentOrder.length > 0
          ? currentOrder
          : [...TAGS_PRESET, ...(s.customTags ?? [])];
        return { allTagsOrder: reorderItem(order, fromIndex, toIndex) };
      }) as any);
    },
    reorderAllMood(fromIndex: number, toIndex: number) {
      set(((s: any) => {
        const currentOrder = s.allMoodsOrder ?? [];
        const order = currentOrder.length > 0
          ? currentOrder
          : [...MOODS, ...(s.customMoods ?? [])];
        return { allMoodsOrder: reorderItem(order, fromIndex, toIndex) };
      }) as any);
    },

    addCustomFoodPreset(name: string, calories: number, note?: string) {
      set(((s: any) => ({
        customFoodPresets: [
          { id: uid(), name, calories, note },
          ...(s.customFoodPresets ?? []),
        ],
      })) as any);
    },

    removeCustomFoodPreset(id: string) {
      set(((s: any) => ({
        customFoodPresets: (s.customFoodPresets ?? []).filter((p: CustomFoodPreset) => p.id !== id),
      })) as any);
    },
  });
}
