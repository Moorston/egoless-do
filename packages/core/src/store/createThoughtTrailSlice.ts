import type { ThoughtTrail } from '../types/thought-trail';
import type { MindReflection } from '../types/reflection';
import type { ThoughtTrailSlice } from './types';
import type { SliceCreator } from './sliceHelper';

export function createThoughtTrailSlice(): SliceCreator<ThoughtTrailSlice> {
  return (set, get) => ({
    thoughtTrails: [],

    createThoughtTrail: (name, description, reflectionIds = []) => {
      const id = `trail_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const now = Date.now();
      const trail: ThoughtTrail = {
        id,
        name,
        description,
        reflectionIds,
        createdAt: now,
        updatedAt: now,
        deleted: false,
      };

      set(s => ({ thoughtTrails: [...(s.thoughtTrails ?? []), trail] }));

      // Update reflection thoughtTrailIds
      if (reflectionIds.length > 0) {
        set(s => ({
          reflections: (s.reflections ?? []).map(r => {
            if (reflectionIds.includes(r.id)) {
              return {
                ...r,
                thoughtTrailIds: [...(r.thoughtTrailIds ?? []), id],
                updatedAt: Date.now(),
              };
            }
            return r;
          }),
        }));
      }

      return id;
    },

    updateThoughtTrail: (id, patch) => {
      set(s => ({
        thoughtTrails: (s.thoughtTrails ?? []).map(t =>
          t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t
        ),
      }));
    },

    deleteThoughtTrail: (id) => {
      const trail = (get().thoughtTrails ?? []).find(t => t.id === id);
      if (!trail) return;

      // Remove trail ID from all reflections
      set(s => ({
        reflections: (s.reflections ?? []).map(r => {
          if (trail.reflectionIds.includes(r.id)) {
            return {
              ...r,
              thoughtTrailIds: (r.thoughtTrailIds ?? []).filter(tid => tid !== id),
              updatedAt: Date.now(),
            };
          }
          return r;
        }),
      }));

      // Delete the trail
      set(s => ({
        thoughtTrails: (s.thoughtTrails ?? []).filter(t => t.id !== id),
      }));
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

      // Add trail ID to reflection
      set(s => ({
        reflections: (s.reflections ?? []).map(r =>
          r.id === reflectionId
            ? { ...r, thoughtTrailIds: [...(r.thoughtTrailIds ?? []), trailId], updatedAt: Date.now() }
            : r
        ),
      }));
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

      // Remove trail ID from reflection
      set(s => ({
        reflections: (s.reflections ?? []).map(r =>
          r.id === reflectionId
            ? { ...r, thoughtTrailIds: (r.thoughtTrailIds ?? []).filter(tid => tid !== trailId), updatedAt: Date.now() }
            : r
        ),
      }));
    },

    reorderTrailReflections: (trailId, fromIndex, toIndex) => {
      set(s => ({
        thoughtTrails: (s.thoughtTrails ?? []).map(t => {
          if (t.id !== trailId) return t;
          const ids = [...t.reflectionIds];
          const [removed] = ids.splice(fromIndex, 1);
          ids.splice(toIndex, 0, removed);
          return { ...t, reflectionIds: ids, updatedAt: Date.now() };
        }),
      }));
    },
  });
}
