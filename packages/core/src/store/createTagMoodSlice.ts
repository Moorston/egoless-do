import { addCustomItem, removeCustomItem, updateCustomItem, reorderItem } from '../business';
import { TAGS_PRESET, MOODS } from '../constants';
import type { TagMoodSlice } from './types';
import type { SliceCreator } from './sliceHelper';

export function createTagMoodSlice(onPersist?: () => void): SliceCreator<TagMoodSlice> {
  return (set: any) => ({
    customTags: [],
    customMoods: [],
    allTagsOrder: [],
    allMoodsOrder: [],

    addCustomTag(tag: string) {
      set(s => ({
        customTags: addCustomItem(s.customTags ?? [], tag),
        allTagsOrder: (s.allTagsOrder ?? []).includes(tag) ? s.allTagsOrder : [...(s.allTagsOrder ?? []), tag],
      }));
      onPersist?.();
    },
    removeCustomTag(tag: string) {
      set(s => ({
        customTags: removeCustomItem(s.customTags ?? [], tag),
        allTagsOrder: (s.allTagsOrder ?? []).filter(t => t !== tag),
      }));
      onPersist?.();
    },
    updateCustomTag(oldTag: string, newTag: string) {
      set(s => ({
        customTags: updateCustomItem(s.customTags ?? [], oldTag, newTag),
        allTagsOrder: (s.allTagsOrder ?? []).map(t => t === oldTag ? newTag : t),
      }));
      onPersist?.();
    },
    addCustomMood(mood: string) {
      set(s => ({
        customMoods: addCustomItem(s.customMoods ?? [], mood),
        allMoodsOrder: (s.allMoodsOrder ?? []).includes(mood) ? s.allMoodsOrder : [...(s.allMoodsOrder ?? []), mood],
      }));
      onPersist?.();
    },
    removeCustomMood(mood: string) {
      set(s => ({
        customMoods: removeCustomItem(s.customMoods ?? [], mood),
        allMoodsOrder: (s.allMoodsOrder ?? []).filter(m => m !== mood),
      }));
      onPersist?.();
    },
    updateCustomMood(oldMood: string, newMood: string) {
      set(s => ({
        customMoods: updateCustomItem(s.customMoods ?? [], oldMood, newMood),
        allMoodsOrder: (s.allMoodsOrder ?? []).map(m => m === oldMood ? newMood : m),
      }));
      onPersist?.();
    },
    reorderCustomTag(fromIndex: number, toIndex: number) { set(s => ({ customTags: reorderItem(s.customTags ?? [], fromIndex, toIndex) })); onPersist?.(); },
    reorderCustomMood(fromIndex: number, toIndex: number) { set(s => ({ customMoods: reorderItem(s.customMoods ?? [], fromIndex, toIndex) })); onPersist?.(); },
    reorderAllTag(fromIndex: number, toIndex: number) {
      set(s => {
        const currentOrder = s.allTagsOrder ?? [];
        const order = currentOrder.length > 0
          ? currentOrder
          : [...TAGS_PRESET, ...(s.customTags ?? [])];
        return { allTagsOrder: reorderItem(order, fromIndex, toIndex) };
      });
      onPersist?.();
    },
    reorderAllMood(fromIndex: number, toIndex: number) {
      set(s => {
        const currentOrder = s.allMoodsOrder ?? [];
        const order = currentOrder.length > 0
          ? currentOrder
          : [...MOODS, ...(s.customMoods ?? [])];
        return { allMoodsOrder: reorderItem(order, fromIndex, toIndex) };
      });
      onPersist?.();
    },
  });
}
