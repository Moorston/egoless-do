import type { ThoughtTrail, TrailInsightCache, TrailReviewCache } from '../types/thought-trail';
import type { MindReflection } from '../types/reflection';
import type { PlanItem, PlanItemPriority } from '../types/plan';
import type { ThoughtTrailSlice, StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';
import { uid } from '../utils';
import { createLogger } from '../logger';
const log = createLogger('Store');

export function createThoughtTrailSlice(adapter?: StorageAdapter): SliceCreator<ThoughtTrailSlice> {
  return (set, get) => ({
    thoughtTrails: [],

    createThoughtTrail: (name, description, reflectionIds = [], source = 'manual') => {
      const id = uid();
      const now = Date.now();
      const trail: ThoughtTrail = {
        id,
        name,
        description,
        reflectionIds,
        noteIds: [],
        source,
        createdAt: now,
        updatedAt: now,
        deleted: false,
      };

      set(s => ({ thoughtTrails: [...(s.thoughtTrails ?? []), trail] }));

      // Update reflection thoughtTrailIds and persist
      if (reflectionIds.length > 0) {
        // Capture affected IDs BEFORE set() to keep updater pure
        const affectedIds = (get().reflections ?? [])
          .filter(r => reflectionIds.includes(r.id) && !r.deleted)
          .map(r => r.id);
        set(s => ({
          reflections: (s.reflections ?? []).map(r => {
            if (reflectionIds.includes(r.id) && !r.deleted) {
              return {
                ...r,
                thoughtTrailIds: [...(r.thoughtTrailIds ?? []), id],
                updatedAt: Date.now(),
              };
            }
            return r;
          }),
        }));
        for (const rid of affectedIds) {
          const r = get().reflections.find(x => x.id === rid && !x.deleted);
          if (r) adapter?.persistChange('reflection', rid, r).catch(e => log.error(e));
        }
      }

      adapter?.persistChange('thoughtTrail', id, trail).catch(e => log.error(e));
      return id;
    },

    updateThoughtTrail: (id, patch) => {
      set(s => ({
        thoughtTrails: (s.thoughtTrails ?? []).map(t =>
          t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t
        ),
      }));
      const trail = get().thoughtTrails.find(t => t.id === id && !t.deleted);
      if (trail) adapter?.persistChange('thoughtTrail', id, trail).catch(e => log.error(e));
    },

    deleteThoughtTrail: (id) => {
      const now = Date.now();
      const trail = (get().thoughtTrails ?? []).find(t => t.id === id && !t.deleted);
      if (!trail) return;

      // Capture affected IDs BEFORE set() to keep updater pure
      const affectedReflectionIds = trail.reflectionIds;
      const notesToDelete = (get().trailNotes ?? []).filter(n => n.trailId === id && !n.deleted);
      const affectedPlanItemIds = (get().planItems ?? [])
        .filter(i => !i.deleted && i.trailId === id)
        .map(i => i.id);

      // Atomic: unlink reflections + cascade delete notes + unlink planItems + delete trail in one set()
      set(s => ({
        reflections: (s.reflections ?? []).map(r => {
          if (affectedReflectionIds.includes(r.id) && !r.deleted) {
            return {
              ...r,
              thoughtTrailIds: (r.thoughtTrailIds ?? []).filter(tid => tid !== id),
              updatedAt: Date.now(),
            };
          }
          return r;
        }),
        trailNotes: (s.trailNotes ?? []).map(n => n.trailId === id && !n.deleted ? { ...n, deleted: true, updatedAt: now } : n),
        thoughtTrails: (s.thoughtTrails ?? []).map(t => t.id === id ? { ...t, deleted: true, updatedAt: now } : t),
        planItems: (s.planItems ?? []).map(i =>
          i.trailId === id && !i.deleted ? { ...i, trailId: undefined, updatedAt: now } : i,
        ),
      }));

      for (const rid of affectedReflectionIds) {
        const r = get().reflections.find(x => x.id === rid && !x.deleted);
        if (r) adapter?.persistChange('reflection', rid, r).catch(e => log.error(e));
      }
      // Atomic batch delete: trail notes + trail in one transaction
      adapter?.batchDelete([
        ...notesToDelete.map(n => ({ entity: 'trailNote' as const, id: n.id })),
        { entity: 'thoughtTrail', id },
      ]).catch(e => log.error(e));
      for (const itemId of affectedPlanItemIds) {
        const item = get().planItems.find(x => x.id === itemId && !x.deleted);
        if (item) adapter?.persistChange('planItem', itemId, item).catch(e => log.error(e));
      }
    },

    addReflectionToTrail: (trailId, reflectionId) => {
      const trail = (get().thoughtTrails ?? []).find(t => t.id === trailId && !t.deleted);
      if (!trail || trail.reflectionIds.includes(reflectionId)) return;

      // Atomic: add reflection to trail + add trail ID to reflection
      set(s => ({
        thoughtTrails: (s.thoughtTrails ?? []).map(t =>
          t.id === trailId
            ? { ...t, reflectionIds: [...t.reflectionIds, reflectionId], updatedAt: Date.now() }
            : t
        ),
        reflections: (s.reflections ?? []).map(r => {
          if (r.id !== reflectionId || r.deleted) return r;
          return { ...r, thoughtTrailIds: [...(r.thoughtTrailIds ?? []), trailId], updatedAt: Date.now() };
        }),
      }));
      const updatedReflection = get().reflections.find(r => r.id === reflectionId && !r.deleted);
      if (updatedReflection) adapter?.persistChange('reflection', reflectionId, updatedReflection).catch(e => log.error(e));

      const updated = get().thoughtTrails.find(t => t.id === trailId && !t.deleted);
      if (updated) adapter?.persistChange('thoughtTrail', trailId, updated).catch(e => log.error(e));
    },

    removeReflectionFromTrail: (trailId, reflectionId) => {
      // Atomic: remove reflection from trail + remove trail ID from reflection
      set(s => ({
        thoughtTrails: (s.thoughtTrails ?? []).map(t =>
          t.id === trailId && !t.deleted
            ? { ...t, reflectionIds: t.reflectionIds.filter((rid: string) => rid !== reflectionId), updatedAt: Date.now() }
            : t
        ),
        reflections: (s.reflections ?? []).map(r => {
          if (r.id !== reflectionId || r.deleted) return r;
          return { ...r, thoughtTrailIds: (r.thoughtTrailIds ?? []).filter(tid => tid !== trailId), updatedAt: Date.now() };
        }),
      }));
      const updatedReflection = get().reflections.find(r => r.id === reflectionId && !r.deleted);
      if (updatedReflection) adapter?.persistChange('reflection', reflectionId, updatedReflection).catch(e => log.error(e));

      const updated = get().thoughtTrails.find(t => t.id === trailId && !t.deleted);
      if (updated) adapter?.persistChange('thoughtTrail', trailId, updated).catch(e => log.error(e));
    },

    setInsightSummary: (trailId, summary) => {
      set(s => ({
        thoughtTrails: (s.thoughtTrails ?? []).map(t =>
          t.id === trailId && !t.deleted ? { ...t, insightSummary: summary, updatedAt: Date.now() } : t
        ),
      }));
      const trail = get().thoughtTrails.find(t => t.id === trailId && !t.deleted);
      if (trail) adapter?.persistChange('thoughtTrail', trailId, trail).catch(e => log.error(e));
    },

    setInsightCache: (trailId, cache) => {
      set(s => ({
        thoughtTrails: (s.thoughtTrails ?? []).map(t =>
          t.id === trailId ? { ...t, insightCache: cache, updatedAt: Date.now() } : t
        ),
      }));
      const trail = get().thoughtTrails.find(t => t.id === trailId && !t.deleted);
      if (trail) adapter?.persistChange('thoughtTrail', trailId, trail).catch(e => log.error(e));
    },

    setReviewCache: (trailId, cache) => {
      set(s => ({
        thoughtTrails: (s.thoughtTrails ?? []).map(t =>
          t.id === trailId ? { ...t, reviewCache: cache, updatedAt: Date.now() } : t
        ),
      }));
      const trail = get().thoughtTrails.find(t => t.id === trailId && !t.deleted);
      if (trail) adapter?.persistChange('thoughtTrail', trailId, trail).catch(e => log.error(e));
    },

    /** @deprecated Use get().createPlanItem({ type: 'trail', id }, form) instead */
    createPlanItemFromTrail: (trailId, form) => {
      return get().createPlanItem?.(
        { type: 'trail', id: trailId },
        form,
      ) ?? false;
    },

    getTrailPlanItems: (trailId) => {
      const trail = (get().thoughtTrails ?? []).find(t => !t.deleted && t.id === trailId);
      const linkedIds = new Set(trail?.linkedPlanItemIds ?? []);
      return (get().planItems ?? []).filter(
        (item: PlanItem) => !item.deleted && (
          item.trailId === trailId || linkedIds.has(item.id)
        )
      );
    },

    // ─── User preferences for recommendations ───────────────────────
    ignoredRecPatterns: [],

    addIgnoredRecPattern: (pattern) => {
      set(s => ({
        ignoredRecPatterns: [...new Set([...(s.ignoredRecPatterns ?? []), pattern])],
      }));
    },

    clearIgnoredRecPatterns: () => {
      set({ ignoredRecPatterns: [] });
    },
  });
}
