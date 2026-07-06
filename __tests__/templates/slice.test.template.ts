/**
 * Store Slice 测试模板
 * 使用方法: 复制此文件，替换 XxxSlice 和相关类型
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
// import { createXxxSlice } from './createXxxSlice';
// import type { XxxEntry } from '../types';

// ── 测试工具 ──────────────────────────────────────────────────────

/** 模拟 Zustand store 的 set/get/api */
function makeTestStore(initialState: Record<string, unknown> = {}) {
  let state: Record<string, unknown> = {
    // 在此添加 slice 需要的初始状态
    // xxxList: [],
    ...initialState,
  };
  const set = (fn: unknown) => {
    const patch = typeof fn === 'function' ? (fn as (s: typeof state) => typeof state)(state) : fn;
    state = { ...state, ...(patch as Record<string, unknown>) };
  };
  const get = () => state;
  const api = {
    setState: set,
    getState: get,
    getInitialState: () => state,
    subscribe: () => () => {},
    destroy: () => {},
  } as any;
  return { state: () => state, set, get: get as any, api };
}

/** 模拟 StorageAdapter（所有 slice 都需要） */
const mockAdapter = {
  persistChange: vi.fn().mockResolvedValue(undefined),
  markDeleted: vi.fn().mockResolvedValue(undefined),
  batchDelete: vi.fn().mockResolvedValue(undefined),
};

/** 模拟同步触发函数 */
const mockSync = vi.fn();

// ── 工厂函数 ──────────────────────────────────────────────────────

// const makeXxxEntry = (overrides: Partial<XxxEntry> = {}): XxxEntry => ({
//   id: 'test-1',
//   name: 'Test',
//   updatedAt: Date.now(),
//   deleted: false,
//   ...overrides,
// });

// ── 测试套件 ──────────────────────────────────────────────────────

describe('createXxxSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // describe('addXxx', () => {
  //   it('adds a new entry', () => {
  //     const store = makeTestStore();
  //     const slice = createXxxSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);
  //     // Attach slice to store so get().sliceMethod works
  //     Object.assign(store.api.getState(), slice);
  //
  //     slice.addXxx({ name: 'Test' });
  //
  //     expect(store.state().xxxList).toHaveLength(1);
  //     expect(store.state().xxxList[0].name).toBe('Test');
  //     expect(mockAdapter.persistChange).toHaveBeenCalled();
  //   });
  // });

  // describe('deleteXxx', () => {
  //   it('soft-deletes an entry', () => {
  //     const store = makeTestStore({ xxxList: [makeXxxEntry()] });
  //     const slice = createXxxSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);
  //
  //     slice.deleteXxx('test-1');
  //
  //     expect(store.state().xxxList[0].deleted).toBe(true);
  //     expect(mockAdapter.markDeleted).toHaveBeenCalledWith('xxx', 'test-1');
  //   });
  // });

  // describe('edge cases', () => {
  //   it('handles empty list', () => {
  //     const store = makeTestStore();
  //     const slice = createXxxSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);
  //
  //     expect(() => slice.deleteXxx('nonexistent')).not.toThrow();
  //   });
  // });
});
