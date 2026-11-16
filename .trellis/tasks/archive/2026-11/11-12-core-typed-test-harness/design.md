# Design — core 测试 store harness

> 详细 Why/Capabilities 见 `openspec/changes/core-typed-test-harness/proposal.md`。本文件聚焦 harness API 设计与 FullStore 摩擦化解。

## 核心摩擦

```
SliceCreator<Slice> = StateCreator<FullStore, [], [], Slice>
                                  └──────┘
                                  全部 slice 并集，测试不想构造它
```

slice 工厂类型绑定 `FullStore`，但测试隔离测单 slice。`as any` 是绕过手段。

## harness API 设计

```ts
// packages/core/src/store/test-utils/storeHarness.ts
import type { StateCreator, StoreApi } from 'zustand';
import { vi } from 'vitest';
import type { StorageAdapter } from '../types';
import type { FullStore } from '../types';

/** 构造隔离测试 store，类型对 Slice 泛型化，不要求构造整个 FullStore */
export function createTestStore<Slice extends Record<string, unknown>>(
  initial: Slice,
): {
  state: () => Slice;
  set: (partial: Partial<Slice> | ((s: Slice) => Partial<Slice>)) => void;
  get: () => Slice;
  api: StoreApi<Slice>;
} {
  let state: Slice = { ...initial };
  const set: typeof implSet = (partial) => {
    const patch = typeof partial === 'function' ? partial(state) : partial;
    state = { ...state, ...patch };
  };
  const get = () => state;
  const api: StoreApi<Slice> = {
    setState: set as StoreApi<Slice>['setState'],
    getState: get,
    getInitialState: () => state,
    subscribe: () => () => {},
    destroy: () => {},
  };
  return { state: () => state, set, get, api };
}

/** 完整 StorageAdapter mock，9 方法全覆盖，正确类型 */
export function createMockStorageAdapter(): StorageAdapter {
  return {
    persistChange: vi.fn().mockResolvedValue(undefined),
    markDeleted: vi.fn().mockResolvedValue(undefined),
    batchDelete: vi.fn().mockResolvedValue(undefined),
    hardDelete: vi.fn().mockResolvedValue(undefined),
    flushNow: vi.fn().mockResolvedValue(undefined),
    persistSettings: vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockResolvedValue(null),
    transaction: vi.fn().mockImplementation(async <T>(fn: () => Promise<T>): Promise<T> => fn()),
    onPersistError: undefined,
  };
}

/**
 * 工厂边界 cast：把 SliceCreator<Slice>（绑定 FullStore）窄化为可在隔离 store 上调用。
 * 整仓库唯一的类型妥协点。调用方不再需要任何 as any。
 */
export function bindSlice<Slice extends Record<string, unknown>>(
  factory: (...) => StateCreator<FullStore, [], [], Slice>,
): (...) => StateCreator<Slice, [], [], Slice> {
  return factory as unknown as (...) => StateCreator<Slice, [], [], Slice>;
}
```

## 调用方对比

```ts
// ❌ 迁移前（每文件 3 处 as any）
const api = { setState: set, getState: get, ... } as any;
const slice = createAuthSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);
const active = store.state().activeFasting as any;

// ✅ 迁移后（0 as any）
const store = createTestStore({ activeFasting: null, fastingHistory: [] });
const adapter = createMockStorageAdapter();
const slice = bindSlice(createFastingSlice)(adapter, vi.fn())(store.set, store.get, store.api);
const active = store.state().activeFasting;  // 已有类型
```

## per-slice 适配

每个 slice 的 dep tuple 不同（createAuthSlice 7 deps、createFastingSlice 2 deps）。harness 只标准化 store 基建 + adapter，slice-specific callbacks 留 per-test：

```ts
// createAuthSlice.test.ts 迁移后
const adapter = createMockStorageAdapter();
const onLogout = vi.fn();
const onPullServerData = vi.fn().mockResolvedValue(undefined);
// ... 其他 callbacks
const store = createTestStore({ auth: defaultAuthState, habits: [], /* all slices */ });
const slice = bindSlice(createAuthSlice)(adapter, vi.fn(), onLogout, onPullServerData, ...)(store.set, store.get, store.api);
```

## Spike 验证维度

迁移 createAuthSlice.test.ts 后测：
1. 该文件 warning 数：前 23 根 any + N 级联 → 后 应 ≤ 5 根 any + ≤ 5 级联
2. `slice` 调用方法（`slice.login(...)` 等）是否有类型推断（不退化 any）
3. 测试是否全绿（行为不变）

若 `bindSlice` cast 后 slice 退化为 any → 方案失败，需 replan（可能需直接构造 StoreApi<FullStore> 或改 SliceCreator 泛型默认）。

## 回滚

- harness 文件独立，删之即回滚
- 16 文件迁移可逐个 revert（每个文件独立 commit 更佳）
- ratchet 阈值改回 530
