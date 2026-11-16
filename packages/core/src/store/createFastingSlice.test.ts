import { describe, it, expect, vi, beforeEach } from 'vitest';

// __DEV__ is globally declared via src/logger.ts (mocked below); set for test env.
globalThis.__DEV__ = false;

vi.mock('../logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import type { FastingSession } from '../types';

import { createFastingSlice } from './createFastingSlice';
import type { FastingSlice } from './createFastingSlice';
import { createTestStore, createMockStorageAdapter, bindSlice } from './test-utils/storeHarness';

function makeTestStore(overrides: Partial<FastingSlice> = {}) {
  return createTestStore<FastingSlice>({ activeFasting: null, fastingHistory: [], ...overrides });
}

const adapter = createMockStorageAdapter();
const mockSync = vi.fn();

describe('createFastingSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('startFasting', () => {
    it('creates a new fasting session and sets activeFasting', () => {
      const store = makeTestStore();
      const slice = bindSlice(createFastingSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.startFasting(16);

      const active = store.state().activeFasting;
      expect(active).not.toBeNull();
      expect(active?.targetHours).toBe(16);
      expect(active?.startedAt).toBeGreaterThan(0);
      expect(active?.id).toBeDefined();
    });

    it('persists the new fasting session via adapter', () => {
      const store = makeTestStore();
      const slice = bindSlice(createFastingSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.startFasting(16);

      expect(adapter.persistChange).toHaveBeenCalledWith(
        'fasting',
        expect.any(String),
        expect.objectContaining({ targetHours: 16 }),
      );
    });

    it('does not start a new session if one is already active', () => {
      const existingSession = { id: 'existing', startedAt: Date.now(), targetHours: 12 } as FastingSession;
      const store = makeTestStore({ activeFasting: existingSession });
      const slice = bindSlice(createFastingSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.startFasting(16);

      expect(store.state().activeFasting?.id).toBe('existing');
      expect(adapter.persistChange).not.toHaveBeenCalled();
    });

    it('sets activeFasting to non-null after starting', () => {
      const store = makeTestStore();
      const slice = bindSlice(createFastingSlice)(adapter, mockSync)(store.set, store.get, store.api);

      expect(store.state().activeFasting).toBeNull();
      slice.startFasting(24);
      expect(store.state().activeFasting).not.toBeNull();
    });
  });

  describe('stopFasting', () => {
    it('clears activeFasting after stopping', () => {
      const store = makeTestStore({
        activeFasting: { id: 'fast-1', startedAt: Date.now() - 3600000, targetHours: 16 } as FastingSession,
      });
      const slice = bindSlice(createFastingSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.stopFasting();

      expect(store.state().activeFasting).toBeNull();
    });

    it('adds the completed session to fastingHistory', () => {
      const store = makeTestStore({
        activeFasting: { id: 'fast-1', startedAt: Date.now() - 3600000, targetHours: 16 } as FastingSession,
      });
      const slice = bindSlice(createFastingSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.stopFasting();

      expect(store.state().fastingHistory).toHaveLength(1);
      expect(store.state().fastingHistory[0].id).toBe('fast-1');
      expect(store.state().fastingHistory[0].endedAt).toBeGreaterThan(0);
    });

    it('persists the completed session via adapter', () => {
      const store = makeTestStore({
        activeFasting: { id: 'fast-1', startedAt: Date.now() - 3600000, targetHours: 16 } as FastingSession,
      });
      const slice = bindSlice(createFastingSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.stopFasting();

      expect(adapter.persistChange).toHaveBeenCalledWith(
        'fasting',
        'fast-1',
        expect.objectContaining({ id: 'fast-1', endedAt: expect.any(Number) }),
      );
    });

    it('calls onSync after stopping', () => {
      const store = makeTestStore({
        activeFasting: { id: 'fast-1', startedAt: Date.now() - 3600000, targetHours: 16 } as FastingSession,
      });
      const slice = bindSlice(createFastingSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.stopFasting();

      expect(mockSync).toHaveBeenCalled();
    });

    it('does nothing if no active fasting session', () => {
      const store = makeTestStore();
      const slice = bindSlice(createFastingSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.stopFasting();

      expect(store.state().activeFasting).toBeNull();
      expect(store.state().fastingHistory).toHaveLength(0);
      expect(adapter.persistChange).not.toHaveBeenCalled();
      expect(mockSync).not.toHaveBeenCalled();
    });

    it('prepends the new record to the front of fastingHistory', () => {
      const store = makeTestStore({
        activeFasting: { id: 'fast-2', startedAt: Date.now() - 3600000, targetHours: 16 } as FastingSession,
        fastingHistory: [{ id: 'fast-old', startedAt: 1000, endedAt: 2000, targetHours: 12 } as FastingSession],
      });
      const slice = bindSlice(createFastingSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.stopFasting();

      const history = store.state().fastingHistory;
      expect(history).toHaveLength(2);
      expect(history[0].id).toBe('fast-2');
      expect(history[1].id).toBe('fast-old');
    });
  });

  describe('updateFastingNote', () => {
    it('updates the note of an existing entry and persists it', () => {
      const existing = { id: 'fast-1', startedAt: 1000, targetHours: 16, note: 'old', updatedAt: 1, deleted: false };
      const store = makeTestStore({ fastingHistory: [existing] });
      const slice = bindSlice(createFastingSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.updateFastingNote('fast-1', 'new insight');

      const updated = store.state().fastingHistory.find(e => e.id === 'fast-1');
      expect(updated?.note).toBe('new insight');
      expect(updated?.updatedAt).toBeGreaterThan(1);
      expect(adapter.persistChange).toHaveBeenCalledWith(
        'fasting',
        'fast-1',
        expect.objectContaining({ id: 'fast-1', note: 'new insight' }),
      );
    });

    it('does not persist when the entry does not exist', () => {
      const store = makeTestStore({ fastingHistory: [{ id: 'fast-1', startedAt: 1000, targetHours: 16, updatedAt: 1, deleted: false }] });
      const slice = bindSlice(createFastingSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.updateFastingNote('nonexistent', 'note');

      expect(adapter.persistChange).not.toHaveBeenCalled();
    });
  });

  describe('deleteFastingEntry', () => {
    it('removes the entry from fastingHistory', () => {
      const existing = { id: 'fast-1', startedAt: 1000, targetHours: 16, updatedAt: 1, deleted: false };
      const store = makeTestStore({ fastingHistory: [existing] });
      const slice = bindSlice(createFastingSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.deleteFastingEntry('fast-1');

      expect(store.state().fastingHistory).toHaveLength(0);
    });

    it('marks the entry as deleted via the adapter', () => {
      const store = makeTestStore({ fastingHistory: [{ id: 'fast-1', startedAt: 1000, targetHours: 16, updatedAt: 1, deleted: false }] });
      const slice = bindSlice(createFastingSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.deleteFastingEntry('fast-1');

      expect(adapter.markDeleted).toHaveBeenCalledWith('fasting', 'fast-1');
    });

    it('calls onSync after deleting', () => {
      const store = makeTestStore({ fastingHistory: [{ id: 'fast-1', startedAt: 1000, targetHours: 16, updatedAt: 1, deleted: false }] });
      const slice = bindSlice(createFastingSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.deleteFastingEntry('fast-1');

      expect(mockSync).toHaveBeenCalled();
    });
  });

  describe('state keys', () => {
    it('has activeFasting initialized to null', () => {
      const store = makeTestStore();
      bindSlice(createFastingSlice)(adapter, mockSync)(store.set, store.get, store.api);

      expect(store.state()).toHaveProperty('activeFasting');
      expect(store.state().activeFasting).toBeNull();
    });

    it('has fastingHistory initialized to empty array', () => {
      const store = makeTestStore();
      bindSlice(createFastingSlice)(adapter, mockSync)(store.set, store.get, store.api);

      expect(store.state()).toHaveProperty('fastingHistory');
      expect(store.state().fastingHistory).toEqual([]);
    });
  });
});
