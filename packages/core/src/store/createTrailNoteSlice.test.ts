import { describe, it, expect } from 'vitest';

import type { ThoughtTrail } from '../types/thought-trail';

import { createThoughtTrailSlice } from './createThoughtTrailSlice';
import { createTestStore, createMockStorageAdapter, bindSlice } from './test-utils/storeHarness';
import type { ThoughtTrailSlice } from './types';

// The trail-note methods under test (addTrailNote/updateTrailNote/deleteTrailNote/
// getNotesByTrail) access only own ThoughtTrailSlice fields (trailNotes,
// thoughtTrails) via get()/set() — no cross-slice state on these paths. So the
// isolated store is typed ThoughtTrailSlice and bindSlice narrows the factory's
// FullStore binding.
function makeTestStore(overrides: Partial<ThoughtTrailSlice> = {}) {
  return createTestStore<ThoughtTrailSlice>({ trailNotes: [], thoughtTrails: [], ...overrides });
}

const adapter = createMockStorageAdapter();

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

describe('createThoughtTrailSlice', () => {
  describe('addTrailNote', () => {
    it('creates a note and adds to trail noteIds', () => {
      const store = makeTestStore({
        thoughtTrails: [makeTrail()],
      });
      const slice = bindSlice(createThoughtTrailSlice)(adapter)(store.set, store.get, store.api);

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

      const state = store.get();
      expect(state.trailNotes).toHaveLength(1);
      expect(state.thoughtTrails[0].noteIds).toContain(note.id);
    });

    it('sets correct order for multiple notes', () => {
      const store = makeTestStore({
        thoughtTrails: [makeTrail({ noteIds: ['existing'] })],
        trailNotes: [
          { id: 'existing', trailId: 't1', content: 'old', tags: [], source: 'free', order: 0, createdAt: 1000, updatedAt: 1000, deleted: false },
        ],
      });
      const slice = bindSlice(createThoughtTrailSlice)(adapter)(store.set, store.get, store.api);

      const note = slice.addTrailNote('t1', { content: 'new', source: 'guided', guidedQuestion: 'why?' });
      expect(note.order).toBe(1);
      expect(note.guidedQuestion).toBe('why?');
    });
  });

  describe('updateTrailNote', () => {
    it('updates note content and tags', () => {
      const store = makeTestStore({
        trailNotes: [
          { id: 'n1', trailId: 't1', content: 'old', tags: [], source: 'free', order: 0, createdAt: 1000, updatedAt: 1000, deleted: false },
        ],
      });
      const slice = bindSlice(createThoughtTrailSlice)(adapter)(store.set, store.get, store.api);

      slice.updateTrailNote('n1', { content: 'updated', tags: ['#new'] });

      const note = store.get().trailNotes.find(n => n.id === 'n1');
      expect(note?.content).toBe('updated');
      expect(note?.tags).toEqual(['#new']);
    });
  });

  describe('deleteTrailNote', () => {
    it('removes note and updates trail noteIds', () => {
      const store = makeTestStore({
        thoughtTrails: [makeTrail({ noteIds: ['n1', 'n2'] })],
        trailNotes: [
          { id: 'n1', trailId: 't1', content: 'a', tags: [], source: 'free', order: 0, createdAt: 1000, updatedAt: 1000, deleted: false },
          { id: 'n2', trailId: 't1', content: 'b', tags: [], source: 'free', order: 1, createdAt: 2000, updatedAt: 2000, deleted: false },
        ],
      });
      const slice = bindSlice(createThoughtTrailSlice)(adapter)(store.set, store.get, store.api);

      slice.deleteTrailNote('n1');

      const state = store.get();
      expect(state.trailNotes).toHaveLength(2);
      expect(state.trailNotes.find(n => n.id === 'n1')?.deleted).toBe(true);
      expect(state.trailNotes.find(n => !n.deleted)?.id).toBe('n2');
      expect(state.thoughtTrails[0].noteIds).not.toContain('n1');
      expect(state.thoughtTrails[0].noteIds).toContain('n2');
    });
  });

  describe('getNotesByTrail', () => {
    it('returns non-deleted notes for a trail sorted by createdAt', () => {
      const store = makeTestStore({
        trailNotes: [
          { id: 'n2', trailId: 't1', content: 'b', tags: [], source: 'free', order: 1, createdAt: 3000, updatedAt: 3000, deleted: false },
          { id: 'n1', trailId: 't1', content: 'a', tags: [], source: 'free', order: 0, createdAt: 1000, updatedAt: 1000, deleted: false },
          { id: 'n3', trailId: 't1', content: 'c', tags: [], source: 'free', order: 2, createdAt: 2000, updatedAt: 2000, deleted: true },
          { id: 'n4', trailId: 't2', content: 'd', tags: [], source: 'free', order: 0, createdAt: 1000, updatedAt: 1000, deleted: false },
        ],
      });
      const slice = bindSlice(createThoughtTrailSlice)(adapter)(store.set, store.get, store.api);

      const notes = slice.getNotesByTrail('t1');
      expect(notes).toHaveLength(2);
      expect(notes[0].id).toBe('n1');
      expect(notes[1].id).toBe('n2');
    });
  });
});
