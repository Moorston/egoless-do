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

    addReflection(params: CreateReflectionParams): MindReflection | undefined {
      set(s => ({ reflections: addReflectionToList(s.reflections ?? [], params) }));
      const r = get().reflections[0];
      if (r) adapter.persistChange('reflection', r.id, r).catch(console.error);
      return r;
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

      // Remove reflection from all thought trails
      const thoughtTrails = state.thoughtTrails ?? [];
      for (const trail of thoughtTrails) {
        if (trail.reflectionIds.includes(id)) {
          state.removeReflectionFromTrail(trail.id, id);
        }
      }

      // Remove all reflection links involving this reflection
      state.deleteLinksByReflection(id);

      // Capture affected plan items before set
      const affectedPlanItemIds = (state.planItems ?? [])
        .filter(i => !i.deleted && i.reflectionId === id)
        .map(i => i.id);

      set(s => ({
        reflections: deleteReflectionFromList(s.reflections ?? [], id),
        planItems: (s.planItems ?? []).map(i =>
          affectedPlanItemIds.includes(i.id)
            ? { ...i, reflectionId: undefined, updatedAt: Date.now() }
            : i
        ),
      }));
      adapter.markDeleted('reflection', id).catch(console.error);

      // Persist affected plan items
      const planItemIdSet = new Set(affectedPlanItemIds);
      (get().planItems ?? [])
        .filter(i => planItemIdSet.has(i.id))
        .forEach(i => adapter.persistChange('planItem', i.id, i).catch(console.error));
    },

    updateReflection(id: string, updates: Partial<Pick<MindReflection, 'content' | 'tags' | 'mood' | 'link' | 'colors'>>) {
      set(s => ({ reflections: updateReflectionInList(s.reflections ?? [], id, updates) }));
      const updated = get().reflections.find(r => r.id === id);
      if (updated) adapter.persistChange('reflection', id, updated).catch(console.error);
    },

    unlinkReflectionFromPlanItem(reflectionId: string) {
      const reflection = get().reflections.find(r => r.id === reflectionId);
      const planItemId = reflection?.linkedPlanItemId;

      // Clear reflection side
      set(s => ({ reflections: unlinkReflectionFromPlanItemBiz(s.reflections ?? [], reflectionId) }));
      const updated = get().reflections.find(r => r.id === reflectionId);
      if (updated) adapter.persistChange('reflection', reflectionId, updated).catch(console.error);

      // Clear planItem side
      if (planItemId) {
        set(s => ({
          planItems: (s.planItems ?? []).map(i =>
            i.id === planItemId ? { ...i, reflectionId: undefined, updatedAt: Date.now() } : i
          ),
        }));
        const updatedItem = get().planItems.find(i => i.id === planItemId);
        if (updatedItem) adapter.persistChange('planItem', updatedItem.id, updatedItem).catch(console.error);
      }
    },

    setReflectionFilters(filters: ReflectionFilters) {
      set({ reflectionFilters: filters });
    },
  });
}
