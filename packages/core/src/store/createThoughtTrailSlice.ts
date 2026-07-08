import type { ThoughtTrail, TrailInsightCache, TrailReviewCache } from '../types/thought-trail';
import type { MindReflection } from '../types/reflection';
import type { PlanItem, PlanItemPriority } from '../types/plan';
import type { TrailNote } from '../types/trail-note';
import type { ThoughtTrailSlice, StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';
import { uid, activeOnly } from '../utils';
import { createLogger } from '../logger';
const log = createLogger('Store');

export function createThoughtTrailSlice(adapter: StorageAdapter, onSettingsPersist?: () => void): SliceCreator<ThoughtTrailSlice> {
  return (set, get) => ({
    thoughtTrails: [],
    trailNotes: [],

    // ── Thought Trail CRUD ─────────────────────────────────────────────

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

      // Atomic: add trail + update reflection thoughtTrailIds in one set()
      const capturedReflections: MindReflection[] = [];
      set(s => {
        const newReflections = (s.reflections ?? []).map(r => {
          if (reflectionIds.includes(r.id) && !r.deleted) {
            const updated = { ...r, thoughtTrailIds: [...(r.thoughtTrailIds ?? []), id], updatedAt: Date.now() };
            capturedReflections.push(updated);
            return updated;
          }
          return r;
        });
        return {
          thoughtTrails: [...(s.thoughtTrails ?? []), trail],
          reflections: newReflections,
        };
      });

      for (const r of capturedReflections) {
        adapter.persistChange('reflection', r.id, r).catch(e => log.error(e));
      }

      adapter.persistChange('thoughtTrail', id, trail).catch(e => log.error(e));
      return id;
    },

    updateThoughtTrail: (id, patch) => {
      let updated: ThoughtTrail | undefined;
      set(s => ({
        thoughtTrails: (s.thoughtTrails ?? []).map(t => {
          if (t.id === id) { updated = { ...t, ...patch, updatedAt: Date.now() } as ThoughtTrail; return updated; }
          return t;
        }),
      }));
      if (updated) adapter.persistChange('thoughtTrail', id, updated).catch(e => log.error(e));
    },

    deleteThoughtTrail: (id) => {
      const now = Date.now();
      const trail = (get().thoughtTrails ?? []).find(t => t.id === id && !t.deleted);
      if (!trail) return;

      // Capture affected IDs and notes BEFORE set()
      const affectedReflectionIds = trail.reflectionIds ?? [];
      const notesToDelete = (get().trailNotes ?? []).filter(n => n.trailId === id && !n.deleted);
      const affectedPlanItemIds = (get().planItems ?? [])
        .filter(i => !i.deleted && i.trailId === id)
        .map(i => i.id);

      // Capture updated entities INSIDE set() for reliable persist
      const updatedReflections: MindReflection[] = [];
      const updatedPlanItems: PlanItem[] = [];

      // Atomic: unlink reflections + cascade delete notes + unlink planItems + delete trail
      set(s => {
        const newReflections = (s.reflections ?? []).map(r => {
          if (affectedReflectionIds.includes(r.id) && !r.deleted) {
            const updated = { ...r, thoughtTrailIds: (r.thoughtTrailIds ?? []).filter(tid => tid !== id), updatedAt: now };
            updatedReflections.push(updated);
            return updated;
          }
          return r;
        });
        const newPlanItems = (s.planItems ?? []).map(i => {
          if (i.trailId === id && !i.deleted) {
            const updated = { ...i, trailId: undefined, updatedAt: now };
            updatedPlanItems.push(updated);
            return updated;
          }
          return i;
        });
        return {
          reflections: newReflections,
          trailNotes: (s.trailNotes ?? []).map(n => n.trailId === id && !n.deleted ? { ...n, deleted: true, updatedAt: now } : n),
          thoughtTrails: (s.thoughtTrails ?? []).map(t => t.id === id ? { ...t, deleted: true, updatedAt: now } : t),
          planItems: newPlanItems,
        };
      });

      for (const r of updatedReflections) {
        adapter.persistChange('reflection', r.id, r).catch(e => log.error(e));
      }
      adapter.batchDelete([
        ...notesToDelete.map(n => ({ entity: 'trailNote' as const, id: n.id })),
        { entity: 'thoughtTrail', id },
      ]).catch(e => log.error(e));
      for (const item of updatedPlanItems) {
        adapter.persistChange('planItem', item.id, item).catch(e => log.error(e));
      }
    },

    addReflectionToTrail: (trailId, reflectionId) => {
      const trail = (get().thoughtTrails ?? []).find(t => t.id === trailId && !t.deleted);
      if (!trail || (trail.reflectionIds ?? []).includes(reflectionId)) return;

      let updatedReflection: MindReflection | undefined;
      let updatedTrail: ThoughtTrail | undefined;
      // Atomic: add reflection to trail + add trail ID to reflection
      set(s => ({
        thoughtTrails: (s.thoughtTrails ?? []).map(t => {
          if (t.id === trailId) {
            updatedTrail = { ...t, reflectionIds: [...(t.reflectionIds ?? []), reflectionId], updatedAt: Date.now() };
            return updatedTrail;
          }
          return t;
        }),
        reflections: (s.reflections ?? []).map(r => {
          if (r.id !== reflectionId || r.deleted) return r;
          updatedReflection = { ...r, thoughtTrailIds: [...(r.thoughtTrailIds ?? []), trailId], updatedAt: Date.now() };
          return updatedReflection;
        }),
      }));
      if (updatedReflection) adapter.persistChange('reflection', reflectionId, updatedReflection).catch(e => log.error(e));
      if (updatedTrail) adapter.persistChange('thoughtTrail', trailId, updatedTrail).catch(e => log.error(e));
    },

    removeReflectionFromTrail: (trailId, reflectionId) => {
      let updatedReflection: MindReflection | undefined;
      let updatedTrail: ThoughtTrail | undefined;
      // Atomic: remove reflection from trail + remove trail ID from reflection
      set(s => ({
        thoughtTrails: (s.thoughtTrails ?? []).map(t => {
          if (t.id === trailId && !t.deleted) {
            updatedTrail = { ...t, reflectionIds: (t.reflectionIds ?? []).filter((rid: string) => rid !== reflectionId), updatedAt: Date.now() };
            return updatedTrail;
          }
          return t;
        }),
        reflections: (s.reflections ?? []).map(r => {
          if (r.id !== reflectionId || r.deleted) return r;
          updatedReflection = { ...r, thoughtTrailIds: (r.thoughtTrailIds ?? []).filter(tid => tid !== trailId), updatedAt: Date.now() };
          return updatedReflection;
        }),
      }));
      if (updatedReflection) adapter.persistChange('reflection', reflectionId, updatedReflection).catch(e => log.error(e));
      if (updatedTrail) adapter.persistChange('thoughtTrail', trailId, updatedTrail).catch(e => log.error(e));
    },

    setInsightSummary: (trailId, summary) => {
      let trail: ThoughtTrail | undefined;
      set(s => {
        const newList = (s.thoughtTrails ?? []).map(t =>
          t.id === trailId && !t.deleted ? { ...t, insightSummary: summary, updatedAt: Date.now() } : t
        );
        trail = newList.find(t => t.id === trailId && !t.deleted);
        return { thoughtTrails: newList };
      });
      if (trail) adapter.persistChange('thoughtTrail', trailId, trail).catch(e => log.error(e));
    },

    setInsightCache: (trailId, cache) => {
      let trail: ThoughtTrail | undefined;
      set(s => {
        const newList = (s.thoughtTrails ?? []).map(t =>
          t.id === trailId && !t.deleted ? { ...t, insightCache: cache, updatedAt: Date.now() } : t
        );
        trail = newList.find(t => t.id === trailId && !t.deleted);
        return { thoughtTrails: newList };
      });
      if (trail) adapter.persistChange('thoughtTrail', trailId, trail).catch(e => log.error(e));
    },

    setReviewCache: (trailId, cache) => {
      let trail: ThoughtTrail | undefined;
      set(s => {
        const newList = (s.thoughtTrails ?? []).map(t =>
          t.id === trailId && !t.deleted ? { ...t, reviewCache: cache, updatedAt: Date.now() } : t
        );
        trail = newList.find(t => t.id === trailId && !t.deleted);
        return { thoughtTrails: newList };
      });
      if (trail) adapter.persistChange('thoughtTrail', trailId, trail).catch(e => log.error(e));
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
      onSettingsPersist?.();
    },

    // ── Trail Note CRUD ────────────────────────────────────────────────

    addTrailNote: (trailId, form) => {
      const id = uid();
      const now = Date.now();
      const existingNotes = (get().trailNotes ?? []).filter(n => n.trailId === trailId && !n.deleted);
      const note: TrailNote = {
        id,
        trailId,
        content: form.content,
        tags: form.tags ?? [],
        mood: form.mood,
        source: form.source,
        guidedQuestion: form.guidedQuestion,
        order: existingNotes.length,
        createdAt: now,
        updatedAt: now,
        deleted: false,
      };

      let updatedTrail: ThoughtTrail | undefined;
      set(s => {
        const newTrails = (s.thoughtTrails ?? []).map(t =>
          t.id === trailId
            ? { ...t, noteIds: [...(t.noteIds ?? []), note.id], updatedAt: Date.now() }
            : t
        );
        updatedTrail = newTrails.find(t => t.id === trailId && !t.deleted);
        return { trailNotes: [...(s.trailNotes ?? []), note], thoughtTrails: newTrails };
      });

      if (updatedTrail) adapter.persistChange('thoughtTrail', trailId, updatedTrail).catch(e => log.error(e));
      adapter.persistChange('trailNote', note.id, note).catch(e => log.error(e));
      return note;
    },

    updateTrailNote: (noteId, patch) => {
      let updatedNote: TrailNote | undefined;
      set(s => {
        const newList = (s.trailNotes ?? []).map(n =>
          n.id === noteId ? { ...n, ...patch, updatedAt: Date.now() } : n
        );
        updatedNote = newList.find(n => n.id === noteId && !n.deleted);
        return { trailNotes: newList };
      });
      if (updatedNote) adapter.persistChange('trailNote', noteId, updatedNote).catch(e => log.error(e));
    },

    deleteTrailNote: (noteId) => {
      const note = (get().trailNotes ?? []).find(n => n.id === noteId && !n.deleted);
      if (!note) return;

      let updatedTrail: ThoughtTrail | undefined;
      set(s => {
        const newTrails = (s.thoughtTrails ?? []).map(t =>
          t.id === note.trailId
            ? { ...t, noteIds: (t.noteIds ?? []).filter((nid: string) => nid !== noteId), updatedAt: Date.now() }
            : t
        );
        updatedTrail = newTrails.find(t => t.id === note.trailId && !t.deleted);
        return {
          thoughtTrails: newTrails,
          trailNotes: (s.trailNotes ?? []).map(n =>
            n.id === noteId ? { ...n, deleted: true, updatedAt: Date.now() } : n
          ),
        };
      });

      if (updatedTrail) adapter.persistChange('thoughtTrail', note.trailId, updatedTrail).catch(e => log.error(e));
      adapter.markDeleted('trailNote', noteId).catch(e => log.error(e));
    },

    getNotesByTrail: (trailId) => {
      return (get().trailNotes ?? [])
        .filter(n => n.trailId === trailId && !n.deleted)
        .sort((a, b) => a.createdAt - b.createdAt);
    },
  });
}
