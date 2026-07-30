import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCheckinSlice } from './createCheckinSlice';

// ── Mocks ──
const mockSync = vi.fn();

function createMockAdapter(shouldFail = false) {
  return {
    persistChange: vi.fn().mockImplementation(() =>
      shouldFail ? Promise.reject(new Error('DB error')) : Promise.resolve()
    ),
    markDeleted: vi.fn().mockResolvedValue(undefined),
    batchDelete: vi.fn().mockResolvedValue(undefined),
  };
}

function makeTestStore(initialState: Record<string, unknown> = {}) {
  let state: Record<string, unknown> = {
    checkinHistory: [],
    graceHistory: [],
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

describe('createCheckinSlice - 乐观更新', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('submitCheckin', () => {
    it('应乐观更新 UI', () => {
      const adapter = createMockAdapter(false);
      const store = makeTestStore();
      const slice = createCheckinSlice(adapter as any, mockSync)(store.set, store.get, store.api);

      slice.submitCheckin(true, 'test', '2026-07-29');

      // 立即更新 UI（乐观）
      const history = store.state().checkinHistory as any[];
      expect(history).toHaveLength(1);
      expect(history[0].done).toBe(true);
    });

    it('持久化失败时应回滚', async () => {
      const adapter = createMockAdapter(true); // 模拟失败
      const store = makeTestStore();
      const slice = createCheckinSlice(adapter as any, mockSync)(store.set, store.get, store.api);

      slice.submitCheckin(true, 'test', '2026-07-29');

      // 等待异步回滚
      await new Promise(resolve => setTimeout(resolve, 10));

      // 应回滚：checkinHistory 为空
      const history = store.state().checkinHistory as any[];
      expect(history).toHaveLength(0);
    });
  });

  describe('calculateStreak', () => {
    it('应保留为向后兼容方法', () => {
      const adapter = createMockAdapter(false);
      const store = makeTestStore({
        checkinHistory: [
          { date: '2026-07-29', done: true, updatedAt: Date.now(), deleted: false },
        ],
      });
      const slice = createCheckinSlice(adapter as any, mockSync)(store.set, store.get, store.api);

      // calculateStreak 不应抛出
      expect(() => slice.calculateStreak()).not.toThrow();
    });
  });
});
