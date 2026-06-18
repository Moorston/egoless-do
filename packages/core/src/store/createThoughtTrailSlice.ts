import type { ThoughtTrail, TrailInsightCache, TrailReviewCache } from '../types/thought-trail';
import type { MindReflection } from '../types/reflection';
import type { PlanItem, PlanItemPriority } from '../types/plan';
import type { ThoughtTrailSlice, StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';
import { uid } from '../utils';

export function createThoughtTrailSlice(adapter?: StorageAdapter): SliceCreator<ThoughtTrailSlice> {
  return (set: any, get: any) => ({
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
          if (r) adapter?.persistChange('reflection', rid, r).catch(console.error);
        }
      }

      adapter?.persistChange('thoughtTrail', id, trail).catch(console.error);
      return id;
    },

    updateThoughtTrail: (id, patch) => {
      set(s => ({
        thoughtTrails: (s.thoughtTrails ?? []).map(t =>
          t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t
        ),
      }));
      const trail = get().thoughtTrails.find(t => t.id === id && !t.deleted);
      if (trail) adapter?.persistChange('thoughtTrail', id, trail).catch(console.error);
    },

    deleteThoughtTrail: (id) => {
      const now = Date.now();
      const trail = (get().thoughtTrails ?? []).find(t => t.id === id && !t.deleted);
      if (!trail) return;

      // Capture affected IDs BEFORE set() to keep updater pure
      const affectedReflectionIds = trail.reflectionIds;
      const notesToDelete = (get().trailNotes ?? []).filter(n => n.trailId === id && !n.deleted);

      // Atomic: unlink reflections + cascade delete notes + delete trail in one set()
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
      }));

      for (const rid of affectedReflectionIds) {
        const r = get().reflections.find(x => x.id === rid && !x.deleted);
        if (r) adapter?.persistChange('reflection', rid, r).catch(console.error);
      }
      for (const note of notesToDelete) {
        adapter?.markDeleted('trailNote', note.id).catch(console.error);
      }
      adapter?.markDeleted('thoughtTrail', id).catch(console.error);
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
      if (updatedReflection) adapter?.persistChange('reflection', reflectionId, updatedReflection).catch(console.error);

      const updated = get().thoughtTrails.find(t => t.id === trailId && !t.deleted);
      if (updated) adapter?.persistChange('thoughtTrail', trailId, updated).catch(console.error);
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
      if (updatedReflection) adapter?.persistChange('reflection', reflectionId, updatedReflection).catch(console.error);

      const updated = get().thoughtTrails.find(t => t.id === trailId && !t.deleted);
      if (updated) adapter?.persistChange('thoughtTrail', trailId, updated).catch(console.error);
    },

    setInsightSummary: (trailId, summary) => {
      set(s => ({
        thoughtTrails: (s.thoughtTrails ?? []).map(t =>
          t.id === trailId && !t.deleted ? { ...t, insightSummary: summary, updatedAt: Date.now() } : t
        ),
      }));
      const trail = get().thoughtTrails.find(t => t.id === trailId && !t.deleted);
      if (trail) adapter?.persistChange('thoughtTrail', trailId, trail).catch(console.error);
    },

    setInsightCache: (trailId, cache) => {
      set(s => ({
        thoughtTrails: (s.thoughtTrails ?? []).map(t =>
          t.id === trailId ? { ...t, insightCache: cache, updatedAt: Date.now() } : t
        ),
      }));
      const trail = get().thoughtTrails.find(t => t.id === trailId && !t.deleted);
      if (trail) adapter?.persistChange('thoughtTrail', trailId, trail).catch(console.error);
    },

    setReviewCache: (trailId, cache) => {
      set(s => ({
        thoughtTrails: (s.thoughtTrails ?? []).map(t =>
          t.id === trailId ? { ...t, reviewCache: cache, updatedAt: Date.now() } : t
        ),
      }));
      const trail = get().thoughtTrails.find(t => t.id === trailId && !t.deleted);
      if (trail) adapter?.persistChange('thoughtTrail', trailId, trail).catch(console.error);
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
