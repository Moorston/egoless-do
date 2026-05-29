import type { StateCreator } from 'zustand';
import type { MindReflection } from '../types';
import {
  addReflectionToList, togglePinInList, deleteReflectionFromList, updateReflectionInList,
  type CreateReflectionParams,
} from '../business/reflections';
import type { StorageAdapter } from './storageAdapter';
import type { ReflectionSlice } from './types';

export function createReflectionSlice<S extends ReflectionSlice>(
  adapter: StorageAdapter,
): StateCreator<S, [], [], ReflectionSlice> {
  return (set, get) => ({
    reflections: [],

    addReflection(params: CreateReflectionParams) {
      set(((s: any) => ({ reflections: addReflectionToList(s.reflections ?? [], params) })) as any);
      const r = (get() as any).reflections[0];
      if (r) adapter.persistChange('reflection', r.id, r).catch(console.error);
    },

    togglePin(id: string) {
      set(((s: any) => ({ reflections: togglePinInList(s.reflections ?? [], id) })) as any);
      const updated = (get() as any).reflections.find((r: MindReflection) => r.id === id);
      if (updated) adapter.persistChange('reflection', id, updated).catch(console.error);
    },

    deleteReflection(id: string) {
      const state = get() as any;
      const reflection = (state.reflections ?? []).find((r: any) => r.id === id);
      if (reflection && state.addToRecycleBin) {
        state.addToRecycleBin({ id, entityType: 'reflection', data: reflection });
      }
      set(((s: any) => ({ reflections: deleteReflectionFromList(s.reflections ?? [], id) })) as any);
      adapter.markDeleted('reflection', id).catch(console.error);
    },

    updateReflection(id: string, updates: Partial<Pick<MindReflection, 'content' | 'tags' | 'mood' | 'link' | 'colors'>>) {
      set(((s: any) => ({ reflections: updateReflectionInList(s.reflections ?? [], id, updates) })) as any);
      const updated = (get() as any).reflections.find((r: MindReflection) => r.id === id);
      if (updated) adapter.persistChange('reflection', id, updated).catch(console.error);
    },
  });
}
