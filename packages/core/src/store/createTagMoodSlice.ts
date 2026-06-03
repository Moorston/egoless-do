import { addCustomItem, removeCustomItem, updateCustomItem, reorderItem } from '../business';
import { TAGS_PRESET, MOODS } from '../constants';
import type { TagMoodSlice } from './types';
import type { SliceCreator } from './sliceHelper';

export function createTagMoodSlice(): SliceCreator<TagMoodSlice> {
  return (set) => ({
    customTags: [],
    customMoods: [],
    allTagsOrder: [],
    allMoodsOrder: [],

    addCustomTag(tag: string) {
      set(s => ({
        customTags: addCustomItem(s.customTags ?? [], tag),
        allTagsOrder: (s.allTagsOrder ?? []).includes(tag) ? s.allTagsOrder : [...(s.allTagsOrder ?? []), tag],
      }));
    },
    removeCustomTag(tag: string) {
      set(s => ({
        customTags: removeCustomItem(s.customTags ?? [], tag),
        allTagsOrder: (s.allTagsOrder ?? []).filter(t => t !== tag),
      }));
    },
    updateCustomTag(oldTag: string, newTag: string) {
      set(s => ({
        customTags: updateCustomItem(s.customTags ?? [], oldTag, newTag),
        allTagsOrder: (s.allTagsOrder ?? []).map(t => t === oldTag ? newTag : t),
      }));
    },
    addCustomMood(mood: string) {
      set(s => ({
        customMoods: addCustomItem(s.customMoods ?? [], mood),
        allMoodsOrder: (s.allMoodsOrder ?? []).includes(mood) ? s.allMoodsOrder : [...(s.allMoodsOrder ?? []), mood],
      }));
    },
    removeCustomMood(mood: string) {
      set(s => ({
        customMoods: removeCustomItem(s.customMoods ?? [], mood),
        allMoodsOrder: (s.allMoodsOrder ?? []).filter(m => m !== mood),
      }));
    },
    updateCustomMood(oldMood: string, newMood: string) {
      set(s => ({
        customMoods: updateCustomItem(s.customMoods ?? [], oldMood, newMood),
        allMoodsOrder: (s.allMoodsOrder ?? []).map(m => m === oldMood ? newMood : m),
      }));
    },
    reorderCustomTag(fromIndex: number, toIndex: number) { set(s => ({ customTags: reorderItem(s.customTags ?? [], fromIndex, toIndex) })); },
    reorderCustomMood(fromIndex: number, toIndex: number) { set(s => ({ customMoods: reorderItem(s.customMoods ?? [], fromIndex, toIndex) })); },
    reorderAllTag(fromIndex: number, toIndex: number) {
      set(s => {
        const currentOrder = s.allTagsOrder ?? [];
        const order = currentOrder.length > 0
          ? currentOrder
          : [...TAGS_PRESET, ...(s.customTags ?? [])];
        return { allTagsOrder: reorderItem(order, fromIndex, toIndex) };
      });
    },
    reorderAllMood(fromIndex: number, toIndex: number) {
      set(s => {
        const currentOrder = s.allMoodsOrder ?? [];
        const order = currentOrder.length > 0
          ? currentOrder
          : [...MOODS, ...(s.customMoods ?? [])];
        return { allMoodsOrder: reorderItem(order, fromIndex, toIndex) };
      });
    },
  });
}
