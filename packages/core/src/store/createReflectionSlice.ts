import { activeOnly } from '../utils';
import type { MindReflection, ReflectionFilters } from '../types';
import { DEFAULT_REFLECTION_FILTERS } from '../types';
import {
  addReflectionToList, togglePinInList, deleteReflectionFromList, updateReflectionInList,
  unlinkReflectionFromPlanItem as unlinkReflectionFromPlanItemBiz,
  type CreateReflectionParams,
} from '../business/reflections';
import { createReflection } from '../defaults';
import type { StorageAdapter, ReflectionSlice, RecycleBinSlice } from './types';
import type { SliceCreator } from './sliceHelper';
import { createLogger } from '../logger';
const log = createLogger('Store');

export function createReflectionSlice(
  adapter: StorageAdapter,
): SliceCreator<ReflectionSlice> {
  return (set, get) => ({
    reflections: [],
    reflectionFilters: { ...DEFAULT_REFLECTION_FILTERS },

    addReflection(params: CreateReflectionParams): MindReflection | undefined {
      const newReflection = createReflection(params);
      set(s => ({ reflections: [newReflection, ...(s.reflections ?? [])] }));
      adapter.persistChange('reflection', newReflection.id, newReflection).catch(e => log.error(e));
      return newReflection;
    },

    togglePin(id: string) {
      set(s => ({ reflections: togglePinInList(s.reflections ?? [], id) }));
      const updated = get().reflections.find(r => r.id === id && !r.deleted);
      if (updated) adapter.persistChange('reflection', id, updated).catch(e => log.error(e));
    },

    deleteReflection(id: string) {
      const state = get();
      const reflection = (state.reflections ?? []).find(r => r.id === id && !r.deleted);
      if (!reflection) return;

      // Remove all reflection links involving this reflection
      state.deleteLinksByReflection(id);

      // Capture affected plan items before set
      const affectedPlanItemIds = (state.planItems ?? [])
        .filter(i => !i.deleted && i.reflectionId === id)
        .map(i => i.id);

      // Atomic: recycle bin + soft-delete + trail cleanup + plan item cleanup in one set()
      // Avoids async race between removeReflectionFromTrail.persistChange and markDeleted
      set(s => ({
        reflections: deleteReflectionFromList(s.reflections ?? [], id),
        thoughtTrails: (s.thoughtTrails ?? []).map(t =>
          t.reflectionIds.includes(id) && !t.deleted
            ? { ...t, reflectionIds: t.reflectionIds.filter((rid: string) => rid !== id), updatedAt: Date.now() }
            : t
        ),
        planItems: (s.planItems ?? []).map(i =>
          affectedPlanItemIds.includes(i.id)
            ? { ...i, reflectionId: undefined, updatedAt: Date.now() }
            : i
        ),
        recycleBin: [...(s.recycleBin ?? []), { id, entityType: 'reflection' as const, data: reflection, deletedAt: Date.now() }],
      }));
      adapter.markDeleted('reflection', id).catch(e => log.error(e));

      // Persist affected thought trails
      (get().thoughtTrails ?? [])
        .filter(t => !t.deleted && t.reflectionIds !== undefined)
        .forEach(t => adapter.persistChange('thoughtTrail', t.id, t).catch(e => log.error(e)));

      // Persist affected plan items
      const planItemIdSet = new Set(affectedPlanItemIds);
      (get().planItems ?? [])
        .filter(i => planItemIdSet.has(i.id))
        .forEach(i => adapter.persistChange('planItem', i.id, i).catch(e => log.error(e)));
    },

    updateReflection(id: string, updates: Partial<Pick<MindReflection, 'content' | 'tags' | 'mood' | 'link' | 'colors'>>) {
      set(s => ({ reflections: updateReflectionInList(s.reflections ?? [], id, updates) }));
      const updated = get().reflections.find(r => r.id === id && !r.deleted);
      if (updated) adapter.persistChange('reflection', id, updated).catch(e => log.error(e));
    },

    unlinkReflectionFromPlanItem(reflectionId: string) {
      const reflection = get().reflections.find(r => r.id === reflectionId && !r.deleted);
      const planItemId = reflection?.linkedPlanItemId;

      // Atomic: clear both reflection and planItem sides in one set()
      set(s => ({
        reflections: unlinkReflectionFromPlanItemBiz(s.reflections ?? [], reflectionId),
        ...(planItemId ? {
          planItems: (s.planItems ?? []).map(i =>
            i.id === planItemId ? { ...i, reflectionId: undefined, updatedAt: Date.now() } : i
          ),
        } : {}),
      }));
      const updated = get().reflections.find(r => r.id === reflectionId && !r.deleted);
      if (updated) adapter.persistChange('reflection', reflectionId, updated).catch(e => log.error(e));

      // Persist planItem side
      if (planItemId) {
        const updatedItem = get().planItems.find(i => i.id === planItemId && !i.deleted);
        if (updatedItem) adapter.persistChange('planItem', updatedItem.id, updatedItem).catch(e => log.error(e));
      }
    },

    setReflectionFilters(filters) {
      if (typeof filters === 'function') {
        set(s => ({ reflectionFilters: filters(s.reflectionFilters) }));
      } else {
        set({ reflectionFilters: filters });
      }
    },
  });
}
