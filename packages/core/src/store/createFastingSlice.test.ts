import { describe, it, expect, vi, beforeEach } from 'vitest';

// @ts-expect-error — React Native global not available in test env
globalThis.__DEV__ = false;

vi.mock('../logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { createFastingSlice } from './createFastingSlice';

function makeTestStore(initialState: Record<string, unknown> = {}) {
  let state: Record<string, unknown> = {
    activeFasting: null,
    fastingHistory: [],
    ...initialState,
  };
  const set = (fn: unknown) => {
    const patch = typeof fn === 'function' ? (fn as (s: typeof state) => typeof state)(state) : fn;
    state = { ...state, ...(patch as Record<string, unknown>) };
  };
  const get = () => state;
  const api = { setState: set, getState: get, getInitialState: () => state, subscribe: () => () => {}, destroy: () => {} } as any;
  return { state: () => state, set, get: get as any, api };
}

const mockAdapter = {
  persistChange: vi.fn().mockResolvedValue(undefined),
  markDeleted: vi.fn().mockResolvedValue(undefined),
  batchDelete: vi.fn().mockResolvedValue(undefined),
  persistSettings: vi.fn().mockResolvedValue(undefined),
  getSettings: vi.fn().mockResolvedValue(null),
  transaction: vi.fn().mockResolvedValue(undefined),
};

const mockSync = vi.fn();

describe('createFastingSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('startFasting', () => {
    it('creates a new fasting session and sets activeFasting', () => {
      const store = makeTestStore();
      const slice = createFastingSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.startFasting(16);

      const active = store.state().activeFasting as any;
      expect(active).not.toBeNull();
      expect(active.targetHours).toBe(16);
      expect(active.startedAt).toBeGreaterThan(0);
      expect(active.id).toBeDefined();
    });

    it('persists the new fasting session via adapter', () => {
      const store = makeTestStore();
      const slice = createFastingSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.startFasting(16);

      expect(mockAdapter.persistChange).toHaveBeenCalledWith(
        'fasting',
        expect.any(String),
        expect.objectContaining({ targetHours: 16 }),
      );
    });

    it('does not start a new session if one is already active', () => {
      const existingSession = { id: 'existing', startedAt: Date.now(), targetHours: 12 };
      const store = makeTestStore({ activeFasting: existingSession });
      const slice = createFastingSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.startFasting(16);

      expect((store.state().activeFasting as any).id).toBe('existing');
      expect(mockAdapter.persistChange).not.toHaveBeenCalled();
    });

    it('sets activeFasting to non-null after starting', () => {
      const store = makeTestStore();
      const slice = createFastingSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      expect(store.state().activeFasting).toBeNull();
      slice.startFasting(24);
      expect(store.state().activeFasting).not.toBeNull();
    });
  });

  describe('stopFasting', () => {
    it('clears activeFasting after stopping', () => {
      const store = makeTestStore({
        activeFasting: { id: 'fast-1', startedAt: Date.now() - 3600000, targetHours: 16 },
      });
      const slice = createFastingSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.stopFasting();

      expect(store.state().activeFasting).toBeNull();
    });

    it('adds the completed session to fastingHistory', () => {
      const store = makeTestStore({
        activeFasting: { id: 'fast-1', startedAt: Date.now() - 3600000, targetHours: 16 },
      });
      const slice = createFastingSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.stopFasting();

      expect(store.state().fastingHistory).toHaveLength(1);
      expect((store.state().fastingHistory as any[])[0].id).toBe('fast-1');
      expect((store.state().fastingHistory as any[])[0].endedAt).toBeGreaterThan(0);
    });

    it('persists the completed session via adapter', () => {
      const store = makeTestStore({
        activeFasting: { id: 'fast-1', startedAt: Date.now() - 3600000, targetHours: 16 },
      });
      const slice = createFastingSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.stopFasting();

      expect(mockAdapter.persistChange).toHaveBeenCalledWith(
        'fasting',
        'fast-1',
        expect.objectContaining({ id: 'fast-1', endedAt: expect.any(Number) }),
      );
    });

    it('calls onSync after stopping', () => {
      const store = makeTestStore({
        activeFasting: { id: 'fast-1', startedAt: Date.now() - 3600000, targetHours: 16 },
      });
      const slice = createFastingSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.stopFasting();

      expect(mockSync).toHaveBeenCalled();
    });

    it('does nothing if no active fasting session', () => {
      const store = makeTestStore();
      const slice = createFastingSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.stopFasting();

      expect(store.state().activeFasting).toBeNull();
      expect(store.state().fastingHistory).toHaveLength(0);
      expect(mockAdapter.persistChange).not.toHaveBeenCalled();
      expect(mockSync).not.toHaveBeenCalled();
    });

    it('prepends the new record to the front of fastingHistory', () => {
      const store = makeTestStore({
        activeFasting: { id: 'fast-2', startedAt: Date.now() - 3600000, targetHours: 16 },
        fastingHistory: [{ id: 'fast-old', startedAt: 1000, endedAt: 2000, targetHours: 12 }],
      });
      const slice = createFastingSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.stopFasting();

      const history = store.state().fastingHistory as any[];
      expect(history).toHaveLength(2);
      expect(history[0].id).toBe('fast-2');
      expect(history[1].id).toBe('fast-old');
    });
  });

  describe('deleteFastingRecord', () => {
    it('is not implemented as a separate method on the fasting slice', () => {
      const store = makeTestStore();
      const slice = createFastingSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      // deleteFastingRecord does not exist — the CheckinSlice
      // only exposes startFasting and stopFasting for the fasting feature.
      expect((slice as any).deleteFastingRecord).toBeUndefined();
    });
  });

  describe('state keys', () => {
    it('has activeFasting initialized to null', () => {
      const store = makeTestStore();
      const slice = createFastingSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      expect(store.state()).toHaveProperty('activeFasting');
      expect(store.state().activeFasting).toBeNull();
    });

    it('has fastingHistory initialized to empty array', () => {
      const store = makeTestStore();
      const slice = createFastingSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      expect(store.state()).toHaveProperty('fastingHistory');
      expect(store.state().fastingHistory).toEqual([]);
    });
  });
});
