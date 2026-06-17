import type { TrailNote } from '../types/trail-note';
import type { TrailNoteSlice, StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';
import { uid } from '../utils';

export function createTrailNoteSlice(adapter?: StorageAdapter): SliceCreator<TrailNoteSlice> {
  return (set: any, get: any) => ({
    trailNotes: [],

    addTrailNote: (trailId, form) => {
      const id = uid();
      const now = Date.now();
      const existingNotes = (get().trailNotes ?? []).filter(n => n.trailId === trailId);
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

      set(s => ({ trailNotes: [...(s.trailNotes ?? []), note] }));

      // Add note ID to trail's noteIds
      set(s => ({
        thoughtTrails: (s.thoughtTrails ?? []).map(t =>
          t.id === trailId
            ? { ...t, noteIds: [...(t.noteIds ?? []), note.id], updatedAt: Date.now() }
            : t
        ),
      }));

      const trail = get().thoughtTrails.find(t => t.id === trailId);
      if (trail) adapter?.persistChange('thoughtTrail', trailId, trail).catch(console.error);
      adapter?.persistChange('trailNote', note.id, note).catch(console.error);

      return note;
    },

    updateTrailNote: (noteId, patch) => {
      set(s => ({
        trailNotes: (s.trailNotes ?? []).map(n =>
          n.id === noteId ? { ...n, ...patch, updatedAt: Date.now() } : n
        ),
      }));
      const note = get().trailNotes.find(n => n.id === noteId);
      if (note) adapter?.persistChange('trailNote', noteId, note).catch(console.error);
    },

    deleteTrailNote: (noteId) => {
      const note = (get().trailNotes ?? []).find(n => n.id === noteId);
      if (!note) return;

      // Remove note ID from trail's noteIds
      set(s => ({
        thoughtTrails: (s.thoughtTrails ?? []).map(t =>
          t.id === note.trailId
            ? { ...t, noteIds: (t.noteIds ?? []).filter((nid: string) => nid !== noteId), updatedAt: Date.now() }
            : t
        ),
      }));

      // Delete the note
      set(s => ({
        trailNotes: (s.trailNotes ?? []).filter(n => n.id !== noteId),
      }));

      const trail = get().thoughtTrails.find(t => t.id === note.trailId);
      if (trail) adapter?.persistChange('thoughtTrail', note.trailId, trail).catch(console.error);
      adapter?.markDeleted('trailNote', noteId).catch(console.error);
    },

    getNotesByTrail: (trailId) => {
      return (get().trailNotes ?? [])
        .filter(n => n.trailId === trailId && !n.deleted)
        .sort((a, b) => a.createdAt - b.createdAt);
    },
  });
}
