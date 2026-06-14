import type { ThoughtTrail, TrailInsightCache, TrailReviewCache } from '../types/thought-trail';
import type { MindReflection } from '../types/reflection';
import type { PlanItem, PlanItemPriority } from '../types/plan';
import type { ThoughtTrailSlice, StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';
import { uid } from '../utils';

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
        set(s => ({
          reflections: (s.reflections ?? []).map(r => {
            if (reflectionIds.includes(r.id)) {
              const updated = {
                ...r,
                thoughtTrailIds: [...(r.thoughtTrailIds ?? []), id],
                updatedAt: Date.now(),
              };
              adapter?.persistChange('reflection', r.id, updated).catch(console.error);
              return updated;
            }
            return r;
          }),
        }));
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
      const trail = get().thoughtTrails.find(t => t.id === id);
      if (trail) adapter?.persistChange('thoughtTrail', id, trail).catch(console.error);
    },

    deleteThoughtTrail: (id) => {
      const trail = (get().thoughtTrails ?? []).find(t => t.id === id);
      if (!trail) return;

      // Remove trail ID from all reflections and persist
      set(s => ({
        reflections: (s.reflections ?? []).map(r => {
          if (trail.reflectionIds.includes(r.id)) {
            const updated = {
              ...r,
              thoughtTrailIds: (r.thoughtTrailIds ?? []).filter(tid => tid !== id),
              updatedAt: Date.now(),
            };
            adapter?.persistChange('reflection', r.id, updated).catch(console.error);
            return updated;
          }
          return r;
        }),
      }));

      // Cascade delete trail notes
      const notes = (get().trailNotes ?? []).filter(n => n.trailId === id);
      for (const note of notes) {
        adapter?.markDeleted('trailNote', note.id).catch(console.error);
      }
      set(s => ({
        trailNotes: (s.trailNotes ?? []).filter(n => n.trailId !== id),
      }));

      // Delete the trail
      set(s => ({
        thoughtTrails: (s.thoughtTrails ?? []).filter(t => t.id !== id),
      }));

      adapter?.markDeleted('thoughtTrail', id).catch(console.error);
    },

    addReflectionToTrail: (trailId, reflectionId) => {
      const trail = (get().thoughtTrails ?? []).find(t => t.id === trailId);
      if (!trail || trail.reflectionIds.includes(reflectionId)) return;

      // Add reflection to trail
      set(s => ({
        thoughtTrails: (s.thoughtTrails ?? []).map(t =>
          t.id === trailId
            ? { ...t, reflectionIds: [...t.reflectionIds, reflectionId], updatedAt: Date.now() }
            : t
        ),
      }));

      // Add trail ID to reflection and persist
      set(s => ({
        reflections: (s.reflections ?? []).map(r => {
          if (r.id !== reflectionId) return r;
          const updated = { ...r, thoughtTrailIds: [...(r.thoughtTrailIds ?? []), trailId], updatedAt: Date.now() };
          adapter?.persistChange('reflection', r.id, updated).catch(console.error);
          return updated;
        }),
      }));

      const updated = get().thoughtTrails.find(t => t.id === trailId);
      if (updated) adapter?.persistChange('thoughtTrail', trailId, updated).catch(console.error);
    },

    removeReflectionFromTrail: (trailId, reflectionId) => {
      // Remove reflection from trail
      set(s => ({
        thoughtTrails: (s.thoughtTrails ?? []).map(t =>
          t.id === trailId
            ? { ...t, reflectionIds: t.reflectionIds.filter((rid: string) => rid !== reflectionId), updatedAt: Date.now() }
            : t
        ),
      }));

      // Remove trail ID from reflection and persist
      set(s => ({
        reflections: (s.reflections ?? []).map(r => {
          if (r.id !== reflectionId) return r;
          const updated = { ...r, thoughtTrailIds: (r.thoughtTrailIds ?? []).filter(tid => tid !== trailId), updatedAt: Date.now() };
          adapter?.persistChange('reflection', r.id, updated).catch(console.error);
          return updated;
        }),
      }));

      const updated = get().thoughtTrails.find(t => t.id === trailId);
      if (updated) adapter?.persistChange('thoughtTrail', trailId, updated).catch(console.error);
    },

    setInsightSummary: (trailId, summary) => {
      set(s => ({
        thoughtTrails: (s.thoughtTrails ?? []).map(t =>
          t.id === trailId ? { ...t, insightSummary: summary, updatedAt: Date.now() } : t
        ),
      }));
      const trail = get().thoughtTrails.find(t => t.id === trailId);
      if (trail) adapter?.persistChange('thoughtTrail', trailId, trail).catch(console.error);
    },

    setInsightCache: (trailId, cache) => {
      set(s => ({
        thoughtTrails: (s.thoughtTrails ?? []).map(t =>
          t.id === trailId ? { ...t, insightCache: cache, updatedAt: Date.now() } : t
        ),
      }));
      const trail = get().thoughtTrails.find(t => t.id === trailId);
      if (trail) adapter?.persistChange('thoughtTrail', trailId, trail).catch(console.error);
    },

    setReviewCache: (trailId, cache) => {
      set(s => ({
        thoughtTrails: (s.thoughtTrails ?? []).map(t =>
          t.id === trailId ? { ...t, reviewCache: cache, updatedAt: Date.now() } : t
        ),
      }));
      const trail = get().thoughtTrails.find(t => t.id === trailId);
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
      const trail = (get().thoughtTrails ?? []).find(t => t.id === trailId);
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
