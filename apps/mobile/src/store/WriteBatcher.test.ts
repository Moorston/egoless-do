// ─── WriteBatcher NOT NULL retry — integration ─────────────────
// Mocks SQLite so we can run the REAL flushNow() path and assert that a
// NOT NULL-failing record is (a) kept in the pending queue on the first
// failure (surfaced via onPersistError, never silently dropped), (b) retried
// on subsequent flushes, and (c) dropped only after NOT_NULL_MAX_ATTEMPTS.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SyncEntity } from '@egoless-do/core';

const { mockRunAsync, mockExecAsync } = vi.hoisted(() => ({
  mockRunAsync: vi.fn(),
  mockExecAsync: vi.fn(),
}));

vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: vi.fn().mockResolvedValue({
    runAsync: mockRunAsync,
    execAsync: mockExecAsync,
    getAllAsync: vi.fn().mockResolvedValue([]),
  }),
}));

// Replace the real schema openDatabase / withDbLock with a controlled mock.
vi.mock('../db/schema', () => ({
  openDatabase: vi.fn().mockResolvedValue({
    runAsync: mockRunAsync,
    execAsync: mockExecAsync,
    getAllAsync: vi.fn().mockResolvedValue([]),
  }),
  withDbLock: async (fn: () => Promise<unknown>) => { await fn(); }, // awaits the callback so rejections propagate to the awaiter (mimics real withDbLock)
  getState: vi.fn(),
  setState: vi.fn(),
}));

vi.mock('../db/sqlHelper', () => ({
  SYNC_QUEUE_UPSERT_SQL: 'INSERT INTO sync_queue (entity, entity_id, operation, payload, created_at, status) VALUES (?,?,?,?,?,?)',
}));

// Deterministic entity config so we control the toRow() output.
vi.mock('./entityTableMap', () => ({
  ENTITY_TABLE_MAP: {
    reflection: {
      table: 'mind_reflections',
      pk: 'id',
      toRow: (data: Record<string, unknown>) => ({ id: data.id, content: data.content }),
    },
  },
}));

import { WriteBatcher } from './WriteBatcher';
import { NOT_NULL_MAX_ATTEMPTS } from './flushPolicy';

const ENTITY = 'reflection' as SyncEntity;

/** Configure the mock DB to throw a NOT NULL error on the data write, but let
 *  BEGIN / COMMIT / ROLLBACK / wal_checkpoint succeed — otherwise the ROLLBACK
 *  inside the catch handler would itself throw and escape the per-record catch,
 *  wrongly triggering the outer fallback path (which re-calls onPersistError). */
function simulateNotNull() {
  mockRunAsync.mockImplementation(async (sql: string) => {
    if (
      sql.includes('BEGIN TRANSACTION')
      || sql.includes('COMMIT')
      || sql.includes('ROLLBACK')
    ) return { changes: 1 };
    if (sql.includes('wal_checkpoint')) return undefined;
    throw new Error('NOT NULL constraint failed: mind_reflections.content');
  });
}

/** Configure the mock DB so the data write succeeds (UPDATE hits changes > 0). */
function simulateSuccess() {
  mockRunAsync.mockImplementation(async (sql: string) => {
    if (sql.includes('BEGIN TRANSACTION') || sql.includes('COMMIT')) return { changes: 1 };
    if (sql.includes('wal_checkpoint')) return undefined;
    if (sql.includes('UPDATE')) return { changes: 1 };
    if (sql.includes('INSERT')) return { changes: 1 };
    return { changes: 1 };
  });
}

describe('WriteBatcher NOT NULL retry', () => {
  beforeEach(() => {
    mockRunAsync.mockReset();
    mockExecAsync.mockReset();
  });

  it('keeps a NOT NULL-failing record pending and reports it (no silent drop)', async () => {
    simulateNotNull();
    const onPersistError = vi.fn();
    const wb = new WriteBatcher(0, undefined, onPersistError);

    wb.write(ENTITY, 'rec-1', { id: 'rec-1', content: 'hello' });
    await wb.flushNow();

    // 1st failure → surfaced exactly once via onPersistError.
    expect(onPersistError).toHaveBeenCalledTimes(1);
    expect(onPersistError.mock.calls[0][1]).toBe('reflection');
    expect(onPersistError.mock.calls[0][2]).toBe('rec-1');

    // Record is still in the pending queue (not dropped).
    expect(wb.pendingCount).toBe(1);
  });

  it('retries the kept record on later flushes without re-reporting', async () => {
    simulateNotNull();
    const onPersistError = vi.fn();
    const wb = new WriteBatcher(0, undefined, onPersistError);

    wb.write(ENTITY, 'rec-1', { id: 'rec-1', content: 'hello' });
    await wb.flushNow(); // 1st: report
    await wb.flushNow(); // 2nd: keep, no report

    // Throttled: only the first failure is reported.
    expect(onPersistError).toHaveBeenCalledTimes(1);
    // Still pending after the second flush.
    expect(wb.pendingCount).toBe(1);
  });

  it('drops the record only after NOT_NULL_MAX_ATTEMPTS', async () => {
    simulateNotNull();
    const onPersistError = vi.fn();
    const wb = new WriteBatcher(0, undefined, onPersistError);

    wb.write(ENTITY, 'rec-1', { id: 'rec-1', content: 'hello' });

    // Flush up to the max attempts.
    for (let i = 0; i < NOT_NULL_MAX_ATTEMPTS; i++) {
      // eslint-disable-next-line no-await-in-loop
      await wb.flushNow();
    }

    // Reported only on the very first attempt, never on giveup.
    expect(onPersistError).toHaveBeenCalledTimes(1);

    // After the giveup flush the record has been removed from the queue.
    expect(wb.pendingCount).toBe(0);

    // One more flush must NOT attempt the write again (no data write call).
    const writesBefore = mockRunAsync.mock.calls.filter(
      (c) => typeof c[0] === 'string' && !/BEGIN TRANSACTION|COMMIT|wal_checkpoint/.test(c[0]),
    ).length;
    await wb.flushNow();
    const writesAfter = mockRunAsync.mock.calls.filter(
      (c) => typeof c[0] === 'string' && !/BEGIN TRANSACTION|COMMIT|wal_checkpoint/.test(c[0]),
    ).length;
    expect(writesAfter).toBe(writesBefore);
  });

  it('a successful write clears the record from the pending queue', async () => {
    simulateSuccess();
    const onPersistError = vi.fn();
    const wb = new WriteBatcher(0, undefined, onPersistError);

    wb.write(ENTITY, 'rec-2', { id: 'rec-2', content: 'ok' });
    await wb.flushNow();

    expect(onPersistError).not.toHaveBeenCalled();
    expect(wb.pendingCount).toBe(0);
  });
});
