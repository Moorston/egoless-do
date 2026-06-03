import type { MindReflection, ReflectionFilters } from '../types';
import { DEFAULT_REFLECTION_FILTERS } from '../types';
import {
  addReflectionToList, togglePinInList, deleteReflectionFromList, updateReflectionInList,
  unlinkReflectionFromPlanItem as unlinkReflectionFromPlanItemBiz,
  type CreateReflectionParams,
} from '../business/reflections';
import type { StorageAdapter, ReflectionSlice, RecycleBinSlice } from './types';
import type { SliceCreator } from './sliceHelper';

export function createReflectionSlice(
  adapter: StorageAdapter,
): SliceCreator<ReflectionSlice> {
  return (set, get) => ({
    reflections: [],
    reflectionFilters: { ...DEFAULT_REFLECTION_FILTERS },

    addReflection(params: CreateReflectionParams) {
      set(s => ({ reflections: addReflectionToList(s.reflections ?? [], params) }));
      const r = get().reflections[0];
      if (r) adapter.persistChange('reflection', r.id, r).catch(console.error);
    },

    togglePin(id: string) {
      set(s => ({ reflections: togglePinInList(s.reflections ?? [], id) }));
      const updated = get().reflections.find(r => r.id === id);
      if (updated) adapter.persistChange('reflection', id, updated).catch(console.error);
    },

    deleteReflection(id: string) {
      const state = get();
      const reflection = (state.reflections ?? []).find(r => r.id === id);
      if (reflection) {
        state.addToRecycleBin({ id, entityType: 'reflection', data: reflection });
      }
      set(s => ({ reflections: deleteReflectionFromList(s.reflections ?? [], id) }));
      adapter.markDeleted('reflection', id).catch(console.error);
    },

    updateReflection(id: string, updates: Partial<Pick<MindReflection, 'content' | 'tags' | 'mood' | 'link' | 'colors'>>) {
      set(s => ({ reflections: updateReflectionInList(s.reflections ?? [], id, updates) }));
      const updated = get().reflections.find(r => r.id === id);
      if (updated) adapter.persistChange('reflection', id, updated).catch(console.error);
    },

    unlinkReflectionFromPlanItem(reflectionId: string) {
      set(s => ({ reflections: unlinkReflectionFromPlanItemBiz(s.reflections ?? [], reflectionId) }));
      const updated = get().reflections.find(r => r.id === reflectionId);
      if (updated) adapter.persistChange('reflection', reflectionId, updated).catch(console.error);
    },

    setReflectionFilters(filters: ReflectionFilters) {
      set({ reflectionFilters: filters });
    },
  });
}
