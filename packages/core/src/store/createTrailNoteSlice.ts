import type { TrailNote } from '../types/trail-note';
import type { TrailNoteSlice, StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';
import { uid } from '../utils';
import { createLogger } from '../logger';
const log = createLogger('Store');

export function createTrailNoteSlice(adapter?: StorageAdapter): SliceCreator<TrailNoteSlice> {
  return (set, get) => ({
    trailNotes: [],

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

      // Add note and link to trail atomically
      set(s => ({
        trailNotes: [...(s.trailNotes ?? []), note],
        thoughtTrails: (s.thoughtTrails ?? []).map(t =>
          t.id === trailId
            ? { ...t, noteIds: [...(t.noteIds ?? []), note.id], updatedAt: Date.now() }
            : t
        ),
      }));

      const trail = get().thoughtTrails.find(t => t.id === trailId && !t.deleted);
      if (trail) adapter?.persistChange('thoughtTrail', trailId, trail).catch(e => log.error(e));
      adapter?.persistChange('trailNote', note.id, note).catch(e => log.error(e));

      return note;
    },

    updateTrailNote: (noteId, patch) => {
      set(s => ({
        trailNotes: (s.trailNotes ?? []).map(n =>
          n.id === noteId ? { ...n, ...patch, updatedAt: Date.now() } : n
        ),
      }));
      const note = get().trailNotes.find(n => n.id === noteId && !n.deleted);
      if (note) adapter?.persistChange('trailNote', noteId, note).catch(e => log.error(e));
    },

    deleteTrailNote: (noteId) => {
      const note = (get().trailNotes ?? []).find(n => n.id === noteId && !n.deleted);
      if (!note) return;

      // Unlink from trail and soft-delete atomically
      set(s => ({
        thoughtTrails: (s.thoughtTrails ?? []).map(t =>
          t.id === note.trailId
            ? { ...t, noteIds: (t.noteIds ?? []).filter((nid: string) => nid !== noteId), updatedAt: Date.now() }
            : t
        ),
        trailNotes: (s.trailNotes ?? []).map(n =>
          n.id === noteId ? { ...n, deleted: true, updatedAt: Date.now() } : n
        ),
      }));

      const trail = get().thoughtTrails.find(t => t.id === note.trailId && !t.deleted);
      if (trail) adapter?.persistChange('thoughtTrail', note.trailId, trail).catch(e => log.error(e));
      adapter?.markDeleted('trailNote', noteId).catch(e => log.error(e));
    },

    getNotesByTrail: (trailId) => {
      return (get().trailNotes ?? [])
        .filter(n => n.trailId === trailId && !n.deleted)
        .sort((a, b) => a.createdAt - b.createdAt);
    },
  });
}
