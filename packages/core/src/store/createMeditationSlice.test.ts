import { describe, it, expect, vi, beforeEach } from 'vitest';

// __DEV__ is globally declared via src/logger.ts; ensure test env has it set.
globalThis.__DEV__ = false;

vi.mock('../logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { createMeditationSlice } from './createMeditationSlice';
import type { MeditationSlice } from './createMeditationSlice';
import { createTestStore, createMockStorageAdapter, bindSlice } from './test-utils/storeHarness';

// createMeditationSlice reads only its own fields (medHistory, totalMedMinutes)
// via get()/set() — no cross-slice state. So the isolated store is typed
// MeditationSlice and bindSlice narrows the factory's FullStore binding.
function makeTestStore(overrides: Partial<MeditationSlice> = {}) {
  return createTestStore<MeditationSlice>({ totalMedMinutes: 0, medHistory: [], ...overrides });
}

const adapter = createMockStorageAdapter();

const mockSync = vi.fn();

describe('createMeditationSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateMeditationNote', () => {
    it('updates the note of an existing entry and persists it', () => {
      // meditation id is the date string
      const existing = { date: '2026-08-01', durMin: 20, note: 'old', updatedAt: 1, deleted: false };
      const store = makeTestStore({ medHistory: [existing] });
      const slice = bindSlice(createMeditationSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.updateMeditationNote('2026-08-01', 'new insight');

      const updated = store.state().medHistory.find(e => e.date === '2026-08-01');
      expect(updated?.note).toBe('new insight');
      expect(updated?.updatedAt).toBeGreaterThan(1);
      expect(adapter.persistChange).toHaveBeenCalledWith(
        'meditation',
        '2026-08-01',
        expect.objectContaining({ date: '2026-08-01', note: 'new insight' }),
      );
    });

    it('does not persist when the entry does not exist', () => {
      const store = makeTestStore({ medHistory: [{ date: '2026-08-01', durMin: 20, updatedAt: 1, deleted: false }] });
      const slice = bindSlice(createMeditationSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.updateMeditationNote('nonexistent', 'note');

      expect(adapter.persistChange).not.toHaveBeenCalled();
    });
  });

  describe('deleteMeditationEntry', () => {
    it('removes the entry from medHistory', () => {
      const existing = { date: '2026-08-01', durMin: 20, updatedAt: 1, deleted: false };
      const store = makeTestStore({ medHistory: [existing], totalMedMinutes: 20 });
      const slice = bindSlice(createMeditationSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.deleteMeditationEntry('2026-08-01');

      expect(store.state().medHistory).toHaveLength(0);
    });

    it('reconciles totalMedMinutes after delete', () => {
      const entries = [
        { date: '2026-08-01', durMin: 20, updatedAt: 1, deleted: false },
        { date: '2026-08-02', durMin: 15, updatedAt: 1, deleted: false },
      ];
      const store = makeTestStore({ medHistory: entries, totalMedMinutes: 35 });
      const slice = bindSlice(createMeditationSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.deleteMeditationEntry('2026-08-01');

      expect(store.state().totalMedMinutes).toBe(15);
    });

    it('marks the entry as deleted via the adapter', () => {
      const store = makeTestStore({ medHistory: [{ date: '2026-08-01', durMin: 20, updatedAt: 1, deleted: false }] });
      const slice = bindSlice(createMeditationSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.deleteMeditationEntry('2026-08-01');

      expect(adapter.markDeleted).toHaveBeenCalledWith('meditation', '2026-08-01');
    });

    it('calls onSync after deleting', () => {
      const store = makeTestStore({ medHistory: [{ date: '2026-08-01', durMin: 20, updatedAt: 1, deleted: false }] });
      const slice = bindSlice(createMeditationSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.deleteMeditationEntry('2026-08-01');

      expect(mockSync).toHaveBeenCalled();
    });
  });
});
