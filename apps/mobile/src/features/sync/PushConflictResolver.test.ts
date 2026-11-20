// ─── PushConflictResolver direct unit tests ───────────────────────
// sync-engine-complexity Phase B3 — the conflict-resolution safety
// semantics extracted from SyncEngine.executePush, now testable without
// the engine (deps fully injected, no RN module chain).
//
// Safety branches under test: resurrection invariant (locally-deleted
// skip), SQL name validation, server-wins UPDATE→INSERT fallback,
// server-deleted soft delete, invalid serverData → conflict UI,
// no-serverData max-retries split, resolve-error fallback.
import type { SyncPushResult, SyncPushResponseItem } from '@egoless-do/core';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAddConflict } = vi.hoisted(() => ({
  mockAddConflict: vi.fn(),
}));

vi.mock('@egoless-do/core', () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

vi.mock('./SyncApplyService', () => ({
  SyncApplyService: class {},
  ENTITY_CONFIG: { habit: { table: 'habits', pk: 'id' } },
}));

// Dynamic import inside reportUnresolvable → conflict UI (optional by design)
vi.mock('../../store/syncStore', () => ({
  useSyncStore: { getState: () => ({ addConflict: mockAddConflict }) },
}));

import type { SyncQueueItem } from '../../db/syncQueue';

import { PushConflictResolver } from './PushConflictResolver';
import type { PushConflictResolverDeps } from './PushConflictResolver';

// ── Fixtures ──────────────────────────────────────────────────────

function makeQueueItem(overrides: Partial<SyncQueueItem> = {}): SyncQueueItem {
  return {
    id: 1,
    entity: 'habit',
    entity_id: 'h1',
    operation: 'upsert',
    payload: '{"name":"Local"}',
    created_at: 1000,
    retry_count: 0,
    last_error: null,
    status: 'pending',
    next_retry_at: 0,
    ...overrides,
  };
}

function makePushResult(rejected: SyncPushResponseItem[]): SyncPushResult {
  return { serverTime: 5000, rejected };
}

/** Minimal injected DB mock. `firstRow` controls the resurrection guard lookup.
 *  getFirstAsync is a plain generic (vi.fn would erase the type parameter) with a
 *  manual call log for assertions. */
function makeDb(opts: { runChanges?: number; firstRow?: unknown } = {}) {
  const getFirstCalls: Array<[string, unknown?]> = [];
  return {
    runAsync: vi.fn<(sql: string, params?: unknown) => Promise<{ changes: number }>>()
      .mockResolvedValue({ changes: opts.runChanges ?? 1 }),
    getFirstAsync: <T,>(sql: string, params?: unknown): Promise<T | null> => {
      getFirstCalls.push([sql, params]);
      return Promise.resolve(opts.firstRow === undefined ? null : (opts.firstRow as T));
    },
    getFirstCalls,
  };
}

function makeResolver(opts: {
  db?: ReturnType<typeof makeDb>;
  withDbLock?: PushConflictResolverDeps['withDbLock'];
} = {}) {
  const db = opts.db ?? makeDb();
  const mockServerPayloadToRow =
    vi.fn<(entity: string, r: Record<string, unknown>) => Record<string, unknown> | null>()
      .mockReturnValue(null);
  const mockMarkConflict = vi.fn<(id: number, reason: string) => Promise<void>>()
    .mockResolvedValue(undefined);
  const mockMarkFailed = vi.fn<(id: number, reason: string) => Promise<void>>()
    .mockResolvedValue(undefined);
  const resolver = new PushConflictResolver({
    applyService: { serverPayloadToRow: mockServerPayloadToRow },
    openDatabase: async () => db,
    withDbLock: opts.withDbLock ?? (<T,>(fn: () => Promise<T>) => fn()),
    markQueueItemConflict: mockMarkConflict,
    markQueueItemFailed: mockMarkFailed,
  });
  return { resolver, db, mockServerPayloadToRow, mockMarkConflict, mockMarkFailed };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────

describe('server-wins resolution', () => {
  it('applies server row via UPDATE and returns the item id', async () => {
    const { resolver, db, mockServerPayloadToRow } = makeResolver();
    mockServerPayloadToRow.mockReturnValue({ name: 'Updated' });

    const ids = await resolver.resolveRejected(
      [makeQueueItem()],
      makePushResult([{ entity: 'habit', entityId: 'h1', serverData: { name: 'Updated' } }]),
    );

    expect(ids).toEqual([1]);
    expect(db.runAsync).toHaveBeenCalledWith(
      'UPDATE habits SET name=?,deleted=0,synced=1 WHERE id=?',
      ['Updated', 'h1'],
    );
  });

  it('falls back to INSERT when the UPDATE matched no local row (changes=0)', async () => {
    const { resolver, db, mockServerPayloadToRow } = makeResolver({ db: makeDb({ runChanges: 0 }) });
    mockServerPayloadToRow.mockReturnValue({ name: 'New' });

    const ids = await resolver.resolveRejected(
      [makeQueueItem()],
      makePushResult([{ entity: 'habit', entityId: 'h1', serverData: { name: 'New' } }]),
    );

    expect(ids).toEqual([1]);
    const sqls = db.runAsync.mock.calls.map(c => c[0]);
    expect(sqls).toEqual([
      'UPDATE habits SET name=?,deleted=0,synced=1 WHERE id=?',
      'INSERT INTO habits (name,synced) VALUES (?,1)',
    ]);
  });
});

describe('server-deleted resolution', () => {
  it('soft-deletes the local row (deleted=1, synced=1)', async () => {
    const { resolver, db, mockMarkConflict } = makeResolver();

    // The deleted branch lives inside the serverData branch — the server
    // returns its (empty) record plus error='deleted'
    const ids = await resolver.resolveRejected(
      [makeQueueItem()],
      makePushResult([{ entity: 'habit', entityId: 'h1', error: 'deleted', serverData: {} }]),
    );

    expect(ids).toEqual([1]);
    expect(db.runAsync).toHaveBeenCalledWith(
      'UPDATE habits SET deleted=1, synced=1 WHERE id=?',
      ['h1'],
    );
    expect(mockMarkConflict).not.toHaveBeenCalled();
  });
});

describe('resurrection invariant', () => {
  it('locally-deleted record: conflict marked, NO UPDATE executed, id not returned', async () => {
    const { resolver, db, mockServerPayloadToRow, mockMarkConflict } =
      makeResolver({ db: makeDb({ firstRow: { deleted: 1 } }) });
    mockServerPayloadToRow.mockReturnValue({ name: 'Updated' });

    const ids = await resolver.resolveRejected(
      [makeQueueItem()],
      makePushResult([{ entity: 'habit', entityId: 'h1', serverData: { name: 'Updated' } }]),
    );

    expect(ids).toEqual([]);
    expect(db.getFirstCalls).toEqual([
      ['SELECT deleted FROM habits WHERE id=?', ['h1']],
    ]);
    expect(mockMarkConflict).toHaveBeenCalledWith(1, 'Locally deleted');
    expect(db.runAsync).not.toHaveBeenCalled();
  });
});

describe('unresolvable rejections', () => {
  it('serverPayloadToRow returns null → conflict + conflict-UI report', async () => {
    const { resolver, mockMarkConflict } = makeResolver();

    const ids = await resolver.resolveRejected(
      [makeQueueItem()],
      makePushResult([{ entity: 'habit', entityId: 'h1', serverData: { bad: 'shape' } }]),
    );

    expect(ids).toEqual([]);
    expect(mockMarkConflict).toHaveBeenCalledWith(1, 'Invalid serverData');
    expect(mockAddConflict).toHaveBeenCalledWith(expect.objectContaining({
      id: '1',
      entity: 'habit',
      entityId: 'h1',
    }));
  });

  it('unknown entity (no ENTITY_CONFIG) → conflict + conflict-UI report', async () => {
    const { resolver, mockMarkConflict } = makeResolver();

    const ids = await resolver.resolveRejected(
      [makeQueueItem({ entity: 'nope' as unknown as SyncQueueItem['entity'], entity_id: 'x1' })],
      makePushResult([{ entity: 'nope' as SyncPushResponseItem['entity'], entityId: 'x1', serverData: { a: 1 } }]),
    );

    expect(ids).toEqual([]);
    expect(mockMarkConflict).toHaveBeenCalledWith(1, 'Invalid serverData');
    expect(mockAddConflict).toHaveBeenCalled();
  });

  it('resolution error → conflict marked as Auto-resolve failed', async () => {
    const { resolver, mockServerPayloadToRow, mockMarkConflict } = makeResolver({
      withDbLock: async () => { throw new Error('db lock poisoned'); },
    });
    mockServerPayloadToRow.mockReturnValue({ name: 'Updated' });

    const ids = await resolver.resolveRejected(
      [makeQueueItem()],
      makePushResult([{ entity: 'habit', entityId: 'h1', serverData: { name: 'Updated' } }]),
    );

    expect(ids).toEqual([]);
    expect(mockMarkConflict).toHaveBeenCalledWith(1, 'Auto-resolve failed');
  });
});

describe('no-serverData rejections', () => {
  it('below max retries → conflict mark with server error', async () => {
    const { resolver, mockMarkConflict, mockMarkFailed } = makeResolver();

    const ids = await resolver.resolveRejected(
      [makeQueueItem({ retry_count: 0 })],
      makePushResult([{ entity: 'habit', entityId: 'h1', error: 'version mismatch' }]),
    );

    expect(ids).toEqual([]);
    expect(mockMarkConflict).toHaveBeenCalledWith(1, 'version mismatch');
    expect(mockMarkFailed).not.toHaveBeenCalled();
  });

  it('at max retries (retry_count+1 >= 5) → permanently failed, not conflict', async () => {
    const { resolver, mockMarkConflict, mockMarkFailed } = makeResolver();

    const ids = await resolver.resolveRejected(
      [makeQueueItem({ retry_count: 4 })],
      makePushResult([{ entity: 'habit', entityId: 'h1', error: 'version mismatch' }]),
    );

    expect(ids).toEqual([]);
    expect(mockMarkFailed).toHaveBeenCalledWith(1, 'version mismatch');
    expect(mockMarkConflict).not.toHaveBeenCalled();
  });

  it('no error field → default reason "Server rejected"', async () => {
    const { resolver, mockMarkConflict } = makeResolver();

    await resolver.resolveRejected(
      [makeQueueItem({ retry_count: 0 })],
      makePushResult([{ entity: 'habit', entityId: 'h1' }]),
    );

    expect(mockMarkConflict).toHaveBeenCalledWith(1, 'Server rejected');
  });
});
