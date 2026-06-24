import { describe, it, expect, vi } from 'vitest';
import { createTrailNoteSlice } from './createTrailNoteSlice';
import type { ThoughtTrail } from '../types/thought-trail';

// Minimal mock set/get for testing slices
function makeTestStore(initialState: any = {}) {
  let state: any = {
    trailNotes: [],
    thoughtTrails: [],
    ...initialState,
  };
  const set = (fn: any) => {
    const patch = typeof fn === 'function' ? fn(state) : fn;
    state = { ...state, ...patch };
  };
  const get = () => state;
  const api = { setState: set, getState: get, getInitialState: () => state, subscribe: () => () => {}, destroy: () => {} };
  return { state, set, get: get as any, api };
}

const makeTrail = (overrides: Partial<ThoughtTrail> = {}): ThoughtTrail => ({
  id: 't1',
  name: 'Test Trail',
  reflectionIds: [],
  noteIds: [],
  source: 'manual',
  createdAt: 1000,
  updatedAt: 1000,
  deleted: false,
  ...overrides,
});

describe('createTrailNoteSlice', () => {
  describe('addTrailNote', () => {
    it('creates a note and adds to trail noteIds', () => {
      const { set, get, api } = makeTestStore({
        thoughtTrails: [makeTrail()],
      });
      const slice = createTrailNoteSlice()(set, get, api);

      const note = slice.addTrailNote('t1', {
        content: 'test note',
        tags: ['#tag1'],
        source: 'free',
      });

      expect(note.content).toBe('test note');
      expect(note.trailId).toBe('t1');
      expect(note.source).toBe('free');
      expect(note.order).toBe(0);
      expect(note.deleted).toBe(false);

      const state = get();
      expect(state.trailNotes).toHaveLength(1);
      expect(state.thoughtTrails[0].noteIds).toContain(note.id);
    });

    it('sets correct order for multiple notes', () => {
      const { set, get, api } = makeTestStore({
        thoughtTrails: [makeTrail({ noteIds: ['existing'] })],
        trailNotes: [
          { id: 'existing', trailId: 't1', content: 'old', tags: [], source: 'free', order: 0, createdAt: 1000, updatedAt: 1000, deleted: false },
        ],
      });
      const slice = createTrailNoteSlice()(set, get, api);

      const note = slice.addTrailNote('t1', { content: 'new', source: 'guided', guidedQuestion: 'why?' });
      expect(note.order).toBe(1);
      expect(note.guidedQuestion).toBe('why?');
    });
  });

  describe('updateTrailNote', () => {
    it('updates note content and tags', () => {
      const { set, get, api } = makeTestStore({
        trailNotes: [
          { id: 'n1', trailId: 't1', content: 'old', tags: [], source: 'free', order: 0, createdAt: 1000, updatedAt: 1000, deleted: false },
        ],
      });
      const slice = createTrailNoteSlice()(set, get, api);

      slice.updateTrailNote('n1', { content: 'updated', tags: ['#new'] });

      const note = get().trailNotes.find((n: any) => n.id === 'n1');
      expect(note.content).toBe('updated');
      expect(note.tags).toEqual(['#new']);
    });
  });

  describe('deleteTrailNote', () => {
    it('removes note and updates trail noteIds', () => {
      const { set, get, api } = makeTestStore({
        thoughtTrails: [makeTrail({ noteIds: ['n1', 'n2'] })],
        trailNotes: [
          { id: 'n1', trailId: 't1', content: 'a', tags: [], source: 'free', order: 0, createdAt: 1000, updatedAt: 1000, deleted: false },
          { id: 'n2', trailId: 't1', content: 'b', tags: [], source: 'free', order: 1, createdAt: 2000, updatedAt: 2000, deleted: false },
        ],
      });
      const slice = createTrailNoteSlice()(set, get, api);

      slice.deleteTrailNote('n1');

      const state = get();
      expect(state.trailNotes).toHaveLength(1);
      expect(state.trailNotes[0].id).toBe('n2');
      expect(state.thoughtTrails[0].noteIds).not.toContain('n1');
      expect(state.thoughtTrails[0].noteIds).toContain('n2');
    });
  });

  describe('getNotesByTrail', () => {
    it('returns non-deleted notes for a trail sorted by createdAt', () => {
      const { set, get, api } = makeTestStore({
        trailNotes: [
          { id: 'n2', trailId: 't1', content: 'b', tags: [], source: 'free', order: 1, createdAt: 3000, updatedAt: 3000, deleted: false },
          { id: 'n1', trailId: 't1', content: 'a', tags: [], source: 'free', order: 0, createdAt: 1000, updatedAt: 1000, deleted: false },
          { id: 'n3', trailId: 't1', content: 'c', tags: [], source: 'free', order: 2, createdAt: 2000, updatedAt: 2000, deleted: true },
          { id: 'n4', trailId: 't2', content: 'd', tags: [], source: 'free', order: 0, createdAt: 1000, updatedAt: 1000, deleted: false },
        ],
      });
      const slice = createTrailNoteSlice()(set, get, api);

      const notes = slice.getNotesByTrail('t1');
      expect(notes).toHaveLength(2);
      expect(notes[0].id).toBe('n1');
      expect(notes[1].id).toBe('n2');
    });
  });
});
