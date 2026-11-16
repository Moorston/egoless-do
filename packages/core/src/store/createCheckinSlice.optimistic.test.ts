import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createCheckinSlice } from './createCheckinSlice';
import { createTestStore, createMockStorageAdapter, bindSlice } from './test-utils/storeHarness';
import type { CheckinSlice } from './types';

// ── Mocks ──
const mockSync = vi.fn();

// createCheckinSlice reads only its own fields (checkinHistory, graceHistory)
// via get()/set() — no cross-slice state. So the isolated store is typed
// CheckinSlice and bindSlice narrows the factory's FullStore binding.
function makeTestStore(overrides: Partial<CheckinSlice> = {}) {
  return createTestStore<CheckinSlice>({ checkinHistory: [], graceHistory: [], ...overrides });
}

describe('createCheckinSlice - 乐观更新', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('submitCheckin', () => {
    it('应乐观更新 UI', () => {
      const adapter = createMockStorageAdapter();
      const store = makeTestStore();
      const slice = bindSlice(createCheckinSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.submitCheckin(true, 'test', '2026-07-29');

      // 立即更新 UI（乐观）
      const history = store.state().checkinHistory;
      expect(history).toHaveLength(1);
      expect(history[0].done).toBe(true);
    });

    it('持久化失败时应回滚', async () => {
      const adapter = createMockStorageAdapter();
      // 模拟失败
      vi.mocked(adapter.persistChange).mockRejectedValue(new Error('DB error'));
      const store = makeTestStore();
      const slice = bindSlice(createCheckinSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.submitCheckin(true, 'test', '2026-07-29');

      // 等待异步回滚
      await new Promise(resolve => setTimeout(resolve, 10));

      // 应回滚：checkinHistory 为空
      const history = store.state().checkinHistory;
      expect(history).toHaveLength(0);
    });
  });

  describe('calculateStreak', () => {
    it('应保留为向后兼容方法', () => {
      const adapter = createMockStorageAdapter();
      const store = makeTestStore({
        checkinHistory: [
          { date: '2026-07-29', done: true, updatedAt: Date.now(), deleted: false },
        ],
      });
      const slice = bindSlice(createCheckinSlice)(adapter, mockSync)(store.set, store.get, store.api);

      // calculateStreak 不应抛出
      expect(() => slice.calculateStreak()).not.toThrow();
    });
  });
});
