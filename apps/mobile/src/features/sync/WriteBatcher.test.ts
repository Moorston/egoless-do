import { describe, it, expect, vi, beforeEach } from 'vitest';

// @ts-expect-error — React Native global not available in test env
globalThis.__DEV__ = false;

const { mockRunAsync, mockWithDbLock, mockOpenDatabase } = vi.hoisted(() => {
  const mockRunAsync = vi.fn().mockResolvedValue({ changes: 0 });
  const mockWithDbLock = vi.fn().mockImplementation(async (fn: () => Promise<void>) => fn());
  const mockOpenDatabase = vi.fn().mockResolvedValue({ runAsync: mockRunAsync });
  return { mockRunAsync, mockWithDbLock, mockOpenDatabase };
});

vi.mock('../../db/schema', () => ({
  openDatabase: mockOpenDatabase,
  withDbLock: mockWithDbLock,
}));

vi.mock('../../db/sqlHelper', () => ({
  SYNC_QUEUE_UPSERT_SQL: 'INSERT OR REPLACE INTO sync_queue VALUES (?, ?, ?, ?, ?, ?)',
}));

vi.mock('../../store/entityTableMap', () => ({
  ENTITY_TABLE_MAP: {
    habit: { table: 'habits', pk: 'id', toRow: (data: Record<string, unknown>) => ({ ...data, synced: 0 }) },
    reflection: { table: 'mind_reflections', pk: 'id', toRow: (data: Record<string, unknown>) => ({ ...data, synced: 0 }) },
  },
}));

vi.mock('@egoless-do/core', () => ({
  createLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}));

import { WriteBatcher } from './WriteBatcher';

describe('WriteBatcher', () => {
  let batcher: WriteBatcher;
  let onFlushed: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onFlushed = vi.fn();
    batcher = new WriteBatcher(100, onFlushed);
  });

  it('starts with zero pending writes', () => {
    expect(batcher.pendingCount).toBe(0);
  });

  it('write() adds to pending count', () => {
    batcher.write('habit', 'h1', { name: 'test' });
    expect(batcher.pendingCount).toBe(1);
  });

  it('write() coalesces writes for same entity:id', () => {
    batcher.write('habit', 'h1', { name: 'test' });
    batcher.write('habit', 'h1', { streak: 5 });
    expect(batcher.pendingCount).toBe(1);
  });

  it('write() merges data for same entity:id', async () => {
    batcher.write('habit', 'h1', { name: 'test' });
    batcher.write('habit', 'h1', { streak: 5 });
    await batcher.flushNow();
    expect(mockRunAsync).toHaveBeenCalled();
  });

  it('markDeleted() sets operation to delete', () => {
    batcher.markDeleted('habit', 'h1', 1000);
    expect(batcher.pendingCount).toBe(1);
  });

  it('markDeleted() does not resurrect a delete with write', () => {
    batcher.markDeleted('habit', 'h1');
    batcher.write('habit', 'h1', { name: 'new' });
    expect(batcher.pendingCount).toBe(1);
  });

  it('separate entity:id keys are not coalesced', () => {
    batcher.write('habit', 'h1', { name: 'a' });
    batcher.write('habit', 'h2', { name: 'b' });
    batcher.write('reflection', 'r1', { content: 'c' });
    expect(batcher.pendingCount).toBe(3);
  });

  it('flushNow() clears pending writes on success', async () => {
    batcher.write('habit', 'h1', { name: 'test' });
    await batcher.flushNow();
    expect(batcher.pendingCount).toBe(0);
  });

  it('flushNow() calls onFlushed callback', async () => {
    batcher.write('habit', 'h1', { name: 'test' });
    await batcher.flushNow();
    expect(onFlushed).toHaveBeenCalledTimes(1);
  });

  it('flushNow() returns false when nothing pending', async () => {
    const result = await batcher.flushNow();
    expect(result).toBe(false);
  });

  it('flushNow() returns true when writes were flushed', async () => {
    batcher.write('habit', 'h1', { name: 'test' });
    const result = await batcher.flushNow();
    expect(result).toBe(true);
  });

  it('write() merges changedFields arrays', async () => {
    batcher.write('habit', 'h1', { name: 'test' }, ['name']);
    batcher.write('habit', 'h1', { streak: 5 }, ['streak']);
    await batcher.flushNow();
    expect(mockRunAsync).toHaveBeenCalled();
  });

  it('handles unknown entity gracefully (skips)', async () => {
    batcher.write('unknown_entity' as any, 'x1', { data: 1 });
    await batcher.flushNow();
    // Should not crash, unknown entity is skipped
    expect(batcher.pendingCount).toBe(0);
  });
});
