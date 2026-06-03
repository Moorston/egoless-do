import type { MindReflection } from '../types';
import {
  addReflectionToList, togglePinInList, deleteReflectionFromList, updateReflectionInList,
  type CreateReflectionParams,
} from '../business/reflections';
import type { StorageAdapter, ReflectionSlice, RecycleBinSlice } from './types';
import type { SliceCreator } from './sliceHelper';

export function createReflectionSlice(
  adapter: StorageAdapter,
): SliceCreator<ReflectionSlice> {
  return (set, get) => ({
    reflections: [],

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
      const deleted = get().reflections.find(r => r.id === id);
      if (deleted) adapter.persistChange('reflection', id, deleted).catch(console.error);
    },

    updateReflection(id: string, updates: Partial<Pick<MindReflection, 'content' | 'tags' | 'mood' | 'link' | 'colors'>>) {
      set(s => ({ reflections: updateReflectionInList(s.reflections ?? [], id, updates) }));
      const updated = get().reflections.find(r => r.id === id);
      if (updated) adapter.persistChange('reflection', id, updated).catch(console.error);
    },
  });
}
