import { addCustomItem, removeCustomItem, updateCustomItem, reorderItem } from '../business';
import {
  togglePinInList, deleteReflectionFromList, updateReflectionInList,
  unlinkReflectionFromPlanItem as unlinkReflectionFromPlanItemBiz,
  type CreateReflectionParams,
} from '../business/reflections';
import { TAGS_PRESET, MOODS } from '../constants';
import { createReflection } from '../defaults';
import { createLogger } from '../logger';
import { DEFAULT_REFLECTION_FILTERS } from '../types';
import type { MindReflection, ThoughtTrail, PlanItem, ReflectionLink, LinkType } from '../types';
import { uid } from '../utils';

import type { SliceCreator } from './sliceHelper';
import type { StorageAdapter, ReflectionSlice } from './types';

const log = createLogger('Store');

export { type ReflectionSlice } from './types';

export function createReflectionSlice(
  adapter: StorageAdapter,
  onSync?: () => void,
  onSettingsPersist?: () => void,
): SliceCreator<ReflectionSlice> {
  return (set, get) => ({
    // ── Reflection ─────────────────────────────────────────────────────
    reflections: [],
    reflectionFilters: { ...DEFAULT_REFLECTION_FILTERS },

    addReflection(params: CreateReflectionParams): MindReflection | undefined {
      const newReflection = createReflection(params);
      set(s => ({ reflections: [newReflection, ...(s.reflections ?? [])] }));
      adapter.persistChange('reflection', newReflection.id, newReflection).catch(e => log.error(e));
      return newReflection;
    },

    togglePin(id: string) {
      let updated: MindReflection | undefined;
      set(s => {
        const newList = togglePinInList(s.reflections ?? [], id);
        updated = newList.find(r => r.id === id && !r.deleted);
        return { reflections: newList };
      });
      if (updated) adapter.persistChange('reflection', id, updated).catch(e => log.error(e));
    },

    deleteReflection(id: string) {
      const state = get();
      const reflection = (state.reflections ?? []).find(r => r.id === id && !r.deleted);
      if (!reflection) return;

      // Find links to delete (inline to avoid calling deleteLinksByReflection which does its own set())
      const linkIdsToDelete = (state.reflectionLinks ?? []).filter(l =>
        !l.deleted && (l.fromId === id || l.toId === id)
      ).map(l => l.id);
      const linksToDelete = (state.reflectionLinks ?? []).filter(l => linkIdsToDelete.includes(l.id));

      const affectedPlanItemIds = (state.planItems ?? [])
        .filter(i => !i.deleted && i.reflectionId === id)
        .map(i => i.id);

      const updatedTrails: ThoughtTrail[] = [];
      const updatedPlanItems: PlanItem[] = [];

      set(s => {
        const newTrails = (s.thoughtTrails ?? []).map(t => {
          if ((t.reflectionIds ?? []).includes(id) && !t.deleted) {
            const updated = { ...t, reflectionIds: (t.reflectionIds ?? []).filter((rid: string) => rid !== id), updatedAt: Date.now() };
            updatedTrails.push(updated);
            return updated;
          }
          return t;
        });
        const planItemIdSet = new Set(affectedPlanItemIds);
        const newPlanItems = (s.planItems ?? []).map(i => {
          if (planItemIdSet.has(i.id)) {
            const updated = { ...i, reflectionId: undefined, updatedAt: Date.now() };
            updatedPlanItems.push(updated);
            return updated;
          }
          return i;
        });
        return {
          reflections: deleteReflectionFromList(s.reflections ?? [], id),
          thoughtTrails: newTrails,
          planItems: newPlanItems,
          reflectionLinks: (s.reflectionLinks ?? []).map(l =>
            linkIdsToDelete.includes(l.id) ? { ...l, deleted: true, updatedAt: Date.now() } : l
          ),
          recycleBin: [...(s.recycleBin ?? []), { id, entityType: 'reflection' as const, data: reflection, deletedAt: Date.now() }],
        };
      });

      adapter.markDeleted('reflection', id).catch(e => log.error(e));
      for (const t of updatedTrails) {
        adapter.persistChange('thoughtTrail', t.id, t).catch(e => log.error(e));
      }
      for (const item of updatedPlanItems) {
        adapter.persistChange('planItem', item.id, item).catch(e => log.error(e));
      }
      if (linksToDelete.length > 0) {
        adapter.batchDelete(linksToDelete.map(l => ({ entity: 'reflectionLink' as const, id: l.id }))).catch(e => log.error(e));
      }
    },

    updateReflection(id: string, updates: Partial<Pick<MindReflection, 'content' | 'tags' | 'mood' | 'link' | 'colors'>>) {
      let updated: MindReflection | undefined;
      set(s => {
        const newList = updateReflectionInList(s.reflections ?? [], id, updates);
        updated = newList.find(r => r.id === id && !r.deleted);
        return { reflections: newList };
      });
      if (updated) adapter.persistChange('reflection', id, updated).catch(e => log.error(e));
    },

    unlinkReflectionFromPlanItem(reflectionId: string) {
      const reflection = get().reflections.find(r => r.id === reflectionId && !r.deleted);
      const planItemId = reflection?.linkedPlanItemId;

      let updated: MindReflection | undefined;
      let updatedItem: PlanItem | undefined;

      set(s => {
        const newReflections = unlinkReflectionFromPlanItemBiz(s.reflections ?? [], reflectionId);
        updated = newReflections.find(r => r.id === reflectionId && !r.deleted);
        if (planItemId) {
          const newPlanItems = (s.planItems ?? []).map(i =>
            i.id === planItemId ? { ...i, reflectionId: undefined, updatedAt: Date.now() } : i
          );
          updatedItem = newPlanItems.find(i => i.id === planItemId && !i.deleted);
          return { reflections: newReflections, planItems: newPlanItems };
        }
        return { reflections: newReflections };
      });
      if (updated) adapter.persistChange('reflection', reflectionId, updated).catch(e => log.error(e));
      if (updatedItem) {
        adapter.persistChange('planItem', updatedItem.id, updatedItem).catch(e => log.error(e));
      }
    },

    setReflectionFilters(filters) {
      if (typeof filters === 'function') {
        set(s => ({ reflectionFilters: filters(s.reflectionFilters) }));
      } else {
        set({ reflectionFilters: filters });
      }
      onSettingsPersist?.();
    },

    // ── Tags & Moods ───────────────────────────────────────────────────
    customTags: [],
    customMoods: [],
    allTagsOrder: [],
    allMoodsOrder: [],

    addCustomTag(tag: string) {
      if (!tag.trim()) return;
      set(s => ({
        customTags: addCustomItem(s.customTags ?? [], tag),
        allTagsOrder: (s.allTagsOrder ?? []).includes(tag) ? s.allTagsOrder : [...(s.allTagsOrder ?? []), tag],
      }));
      onSettingsPersist?.();
    },
    removeCustomTag(tag: string) {
      set(s => ({
        customTags: removeCustomItem(s.customTags ?? [], tag),
        allTagsOrder: (s.allTagsOrder ?? []).filter(t => t !== tag),
      }));
      onSettingsPersist?.();
    },
    updateCustomTag(oldTag: string, newTag: string) {
      set(s => {
        const updated = updateCustomItem(s.customTags ?? [], oldTag, newTag);
        return {
          customTags: updated,
          allTagsOrder: updated !== (s.customTags ?? [])
            ? (s.allTagsOrder ?? []).map(t => t === oldTag ? newTag : t)
            : s.allTagsOrder,
        };
      });
      onSettingsPersist?.();
    },
    addCustomMood(mood: string) {
      if (!mood.trim()) return;
      set(s => ({
        customMoods: addCustomItem(s.customMoods ?? [], mood),
        allMoodsOrder: (s.allMoodsOrder ?? []).includes(mood) ? s.allMoodsOrder : [...(s.allMoodsOrder ?? []), mood],
      }));
      onSettingsPersist?.();
    },
    removeCustomMood(mood: string) {
      set(s => ({
        customMoods: removeCustomItem(s.customMoods ?? [], mood),
        allMoodsOrder: (s.allMoodsOrder ?? []).filter(m => m !== mood),
      }));
      onSettingsPersist?.();
    },
    updateCustomMood(oldMood: string, newMood: string) {
      set(s => {
        const updated = updateCustomItem(s.customMoods ?? [], oldMood, newMood);
        return {
          customMoods: updated,
          allMoodsOrder: updated !== (s.customMoods ?? [])
            ? (s.allMoodsOrder ?? []).map(m => m === oldMood ? newMood : m)
            : s.allMoodsOrder,
        };
      });
      onSync?.();
    },
    reorderCustomTag(fromIndex: number, toIndex: number) { set(s => ({ customTags: reorderItem(s.customTags ?? [], fromIndex, toIndex) })); onSettingsPersist?.(); },
    reorderCustomMood(fromIndex: number, toIndex: number) { set(s => ({ customMoods: reorderItem(s.customMoods ?? [], fromIndex, toIndex) })); onSettingsPersist?.(); },
    reorderAllTag(fromIndex: number, toIndex: number) {
      set(s => {
        const currentOrder = s.allTagsOrder ?? [];
        const order = currentOrder.length > 0
          ? currentOrder
          : [...TAGS_PRESET, ...(s.customTags ?? [])];
        return { allTagsOrder: reorderItem(order, fromIndex, toIndex) };
      });
      onSync?.();
    },
    reorderAllMood(fromIndex: number, toIndex: number) {
      set(s => {
        const currentOrder = s.allMoodsOrder ?? [];
        const order = currentOrder.length > 0
          ? currentOrder
          : [...MOODS, ...(s.customMoods ?? [])];
        return { allMoodsOrder: reorderItem(order, fromIndex, toIndex) };
      });
      onSync?.();
    },

    // ── Reflection Links ───────────────────────────────────────────────
    reflectionLinks: [],

    createReflectionLink: (fromId: string, toId: string, type: LinkType, note?: string) => {
      const id = uid();
      const now = Date.now();
      const link: ReflectionLink = {
        id, fromId, toId, type, note,
        createdAt: now, updatedAt: now, deleted: false,
      };
      set(s => ({ reflectionLinks: [...(s.reflectionLinks ?? []), link] }));
      adapter.persistChange('reflectionLink', id, link).catch(e => log.error(e));
      return id;
    },

    updateReflectionLink: (id: string, patch: Partial<ReflectionLink>) => {
      const existing = get().reflectionLinks?.find(l => l.id === id && !l.deleted);
      if (!existing) return;
      let link: ReflectionLink | undefined;
      set(s => {
        const newList = (s.reflectionLinks ?? []).map(l =>
          l.id === id && !l.deleted ? { ...l, ...patch, updatedAt: Date.now() } : l
        );
        link = newList.find(l => l.id === id && !l.deleted);
        return { reflectionLinks: newList };
      });
      if (link) adapter.persistChange('reflectionLink', id, link).catch(e => log.error(e));
    },

    getLinksByReflection: (reflectionId: string) => {
      return (get().reflectionLinks ?? []).filter(l =>
        !l.deleted && (l.fromId === reflectionId || l.toId === reflectionId)
      );
    },

    getLinksFromReflection: (reflectionId: string) => {
      return (get().reflectionLinks ?? []).filter(l =>
        !l.deleted && l.fromId === reflectionId
      );
    },

    getLinksToReflection: (reflectionId: string) => {
      return (get().reflectionLinks ?? []).filter(l =>
        !l.deleted && l.toId === reflectionId
      );
    },

    deleteLinksByReflection: (reflectionId: string) => {
      const linksToDelete = (get().reflectionLinks ?? []).filter(l =>
        !l.deleted && (l.fromId === reflectionId || l.toId === reflectionId)
      );

      set(s => ({
        reflectionLinks: (s.reflectionLinks ?? []).map(l =>
          (l.fromId === reflectionId || l.toId === reflectionId) && !l.deleted
            ? { ...l, deleted: true, updatedAt: Date.now() } : l
        ),
      }));

      if (linksToDelete.length > 0) {
        adapter.batchDelete(linksToDelete.map(l => ({ entity: 'reflectionLink' as const, id: l.id }))).catch(e => log.error(e));
      }
    },
  });
}
