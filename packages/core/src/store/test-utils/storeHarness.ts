// ─── Typed test harness for slice unit tests ───────────────────
// Eliminates the copied `makeTestStore` + `mockAdapter as any` pattern across
// store/*.test.ts. The FullStore friction (SliceCreator<Slice> binds FullStore)
// is sealed inside this file — callers never write `as any`.
//
// See openspec/changes/core-typed-test-harness/proposal.md for the disease this treats.

import { vi } from 'vitest';
import type { StateCreator, StoreApi } from 'zustand';

import type { FullStore, StorageAdapter } from '../types';

/**
 * Build an isolated test store, generically typed over `Slice` — does NOT require
 * constructing the entire FullStore. The returned `{ set, get, api }` match the
 * trailing `(set, get, api)` triple every slice factory expects.
 *
 * `state()` returns the live state (mutated in place when the slice writes via set,
 * and when callers Object.assign slice methods onto `api.getState()` for cross-slice
 * `get()` calls — the standard test pattern).
 */
export function createTestStore<Slice extends object>(
  initial: Partial<Slice>,
): {
  state: () => Slice;
  set: StoreApi<Slice>['setState'];
  get: () => Slice;
  api: StoreApi<Slice>;
} {
  // Partial seed cast to Slice — tests only read fields they seed; unseeded slice
  // methods arrive later via Object.assign(api.getState(), slice). This cast is the
  // internal boundary; callers never see `as any`.
  let state = { ...initial } as Slice;

  const set: StoreApi<Slice>['setState'] = (partial, replace) => {
    const next =
      typeof partial === 'function'
        ? (partial as (s: Slice) => Slice | Partial<Slice>)(state)
        : partial;
    state = replace
      ? ({ ...state, ...(next as Partial<Slice>) } as Slice)
      : ({ ...state, ...(next as Partial<Slice>) } as Slice);
  };

  const get = (): Slice => state;

  const api: StoreApi<Slice> = {
    setState: set,
    getState: get,
    getInitialState: () => state,
    subscribe: () => () => {},
  };

  return { state: () => state, set, get, api };
}

/**
 * Full StorageAdapter mock — all 9 methods covered with correctly-typed vi.fn().
 * Callers `.mockResolvedValue(...)` / `.mockImplementation(...)` per test as needed.
 */
export function createMockStorageAdapter(): StorageAdapter {
  return {
    persistChange: vi.fn().mockResolvedValue(undefined),
    markDeleted: vi.fn().mockResolvedValue(undefined),
    batchDelete: vi.fn().mockResolvedValue(undefined),
    hardDelete: vi.fn().mockResolvedValue(undefined),
    flushNow: vi.fn().mockResolvedValue(undefined),
    persistSettings: vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockResolvedValue(null),
    transaction: vi
      .fn()
      .mockImplementation(async <T>(fn: () => Promise<T>): Promise<T> => fn()),
    onPersistError: undefined,
  };
}

/**
 * Rebind a slice factory's `StateCreator` store type from `FullStore` down to the
 * isolated `Slice`, while preserving the factory's parameter tuple (so each slice's
 * specific deps — createAuthSlice has 7, createFastingSlice has 2 — stay type-checked
 * at the call site). Inferred via conditional type from the factory's return.
 */
type RebindToSlice<F> = F extends (
  ...args: infer A
) => StateCreator<FullStore, [], [], infer Slice>
  ? (...args: A) => StateCreator<Slice, [], [], Slice>
  : never;

/**
 * Boundary cast: narrow a slice factory from `SliceCreator<Slice>` (which binds
 * FullStore) down to `StateCreator<Slice, [], [], Slice>` so it can be invoked on
 * an isolated test store.
 *
 * This `as unknown as` is the SINGLE type compromise in the harness. After it,
 * callers write zero `as any`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- boundary: captures any slice factory signature; the FullStore→Slice rebind is sealed behind RebindToSlice<F>
export function bindSlice<F extends (...args: any[]) => unknown>(
  factory: F,
): RebindToSlice<F> {
  return factory as unknown as RebindToSlice<F>;
}

// Re-export so test files can import FullStore from the harness if desired.
export type { FullStore };
