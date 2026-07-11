import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// @ts-expect-error — React Native global not available in test env
globalThis.__DEV__ = false;

const { mockRunAsync, mockWithDbLock, mockOpenDatabase } = vi.hoisted(() => {
  const mockRunAsync = vi.fn().mockResolvedValue({ changes: 0 });
  const mockWithDbLock = vi.fn().mockImplementation(async (fn: () => Promise<void>) => fn());
  const mockOpenDatabase = vi.fn().mockResolvedValue({ runAsync: mockRunAsync });
  return { mockRunAsync, mockWithDbLock, mockOpenDatabase };
});

vi.mock('../db/schema', () => ({
  openDatabase: mockOpenDatabase,
  withDbLock: mockWithDbLock,
}));

vi.mock('../db/sqlHelper', () => ({
  SYNC_QUEUE_UPSERT_SQL: 'INSERT OR REPLACE INTO sync_queue VALUES (?, ?, ?, ?, ?, ?)',
}));

vi.mock('./entityTableMap', () => ({
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
  let onFlushed: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    onFlushed = vi.fn();
    batcher = new WriteBatcher(100, onFlushed);
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it('fallback path retries per-item when batch flush fails', async () => {
    mockRunAsync
      .mockRejectedValueOnce(new Error('transaction failed'))
      .mockResolvedValue({ changes: 1 });

    batcher.write('habit', 'h1', { name: 'test' });
    await batcher.flushNow();

    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE habits SET'),
      expect.arrayContaining(['h1']),
    );
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO sync_queue'),
      expect.arrayContaining(['habit', 'h1', 'upsert']),
    );
    expect(batcher.pendingCount).toBe(0);
    expect(onFlushed).toHaveBeenCalled();
  });

  it('_onPersistError callback fires when fallback write fails', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(42);

    const onPersistError = vi.fn();
    const b = new WriteBatcher(100, onFlushed, onPersistError as unknown as (error: Error, entity: string, id: string) => void);

    mockRunAsync
      .mockRejectedValueOnce(new Error('transaction failed'))
      .mockResolvedValueOnce({ changes: 1 })
      .mockRejectedValueOnce(new Error('disk full'));

    b.write('habit', 'h1', { name: 'test' });
    await b.flushNow();

    expect(onPersistError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'disk full' }),
      'habit',
      'h1',
    );
    // Entry kept for retry since fallback partially failed
    expect(b.pendingCount).toBe(1);
  });

  it('_scheduleFlush triggers flush after configured delay', async () => {
    vi.useFakeTimers();
    const b = new WriteBatcher(200, onFlushed);
    b.write('habit', 'h1', { name: 'timer' });

    expect(b.pendingCount).toBe(1);
    vi.advanceTimersByTime(200);

    // Let the scheduled flush complete
    await vi.advanceTimersByTimeAsync(0);
    expect(b.pendingCount).toBe(0);
    expect(onFlushed).toHaveBeenCalled();
  });

  it('flushNow cancels a pending scheduled flush timer', async () => {
    const b = new WriteBatcher(200, onFlushed);
    b.write('habit', 'h1', { name: 'cancel-me' });

    // Don't wait for the timer — flush immediately instead
    const result = await b.flushNow();
    expect(result).toBe(true);
    expect(b.pendingCount).toBe(0);
    expect(onFlushed).toHaveBeenCalled();
  });

  it('UNIQUE constraint triggers UPDATE retry after failed INSERT', async () => {
    mockRunAsync
      .mockResolvedValueOnce({ changes: 0 })
      .mockRejectedValueOnce(new Error('UNIQUE constraint failed'))
      .mockResolvedValueOnce({ changes: 1 })
      .mockResolvedValue({ changes: 1 });

    batcher.write('habit', 'h1', { name: 'dup' });
    await batcher.flushNow();

    expect(batcher.pendingCount).toBe(0);
  });

  it('DELETE path generates UPDATE SET deleted=1, synced=0 via fallback', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(999);

    mockRunAsync
      .mockRejectedValueOnce(new Error('batch fail'))
      .mockResolvedValue({ changes: 1 });

    batcher.markDeleted('habit', 'h1', 500);
    await batcher.flushNow();

    expect(mockRunAsync).toHaveBeenCalledWith(
      'UPDATE habits SET deleted = 1, synced = 0, updated_at = ? WHERE id = ?',
      [999, 'h1'],
    );
    expect(batcher.pendingCount).toBe(0);
  });

  it('partial fallback failure schedules 5-second retry timer', async () => {
    vi.useFakeTimers();

    mockRunAsync
      .mockRejectedValueOnce(new Error('batch fail'))
      .mockResolvedValueOnce({ changes: 1 })   // h1 fallback UPDATE ok
      .mockResolvedValueOnce({ changes: 1 })   // h1 sync_queue ok
      .mockRejectedValueOnce(new Error('h2 UPSERT fail'));

    batcher.write('habit', 'h1', { name: 'ok' });
    batcher.write('habit', 'h2', { name: 'fail' });
    await batcher.flushNow();

    expect(batcher.pendingCount).toBe(2);
    expect(onFlushed).not.toHaveBeenCalled(); // skip sync when fallback writes fail

    // Advance past the 5-second retry timer
    vi.advanceTimersByTime(5000);
    await vi.advanceTimersByTimeAsync(0);
    expect(batcher.pendingCount).toBe(0);
  });

  it('snapshot merge safety: writes arriving during flush are preserved', async () => {
    vi.useFakeTimers();

    mockRunAsync
      .mockRejectedValueOnce(new Error('batch fail'))
      .mockResolvedValueOnce({ changes: 1 })  // h1 fallback ok
      .mockResolvedValueOnce({ changes: 1 })
      .mockResolvedValue({ changes: 1 });      // retry ok

    batcher.write('habit', 'h1', { name: 'existing' });

    // Schedule the flush at t=100
    vi.advanceTimersByTime(100);
    // Trigger flushNow which clears the timer but flush fails → retry at 5000ms
    const p = batcher.flushNow();

    // Write arrives while flush is in flight
    batcher.write('habit', 'h2', { name: 'during-flush' });

    await p;
    // h1 cleared, h2 retained (snapshot merge safety)
    expect(batcher.pendingCount).toBe(1);

    // Retry flushes the surviving entry
    vi.advanceTimersByTime(5000);
    await vi.advanceTimersByTimeAsync(0);
    expect(batcher.pendingCount).toBe(0);
  });

  it('write() merges data and changedFields across coalesced writes', async () => {
    batcher.write('habit', 'h1', { name: 'Yoga', emoji: '🧘' }, ['name']);
    batcher.write('habit', 'h1', { streak: 7 }, ['streak']);

    expect(batcher.pendingCount).toBe(1);
    await batcher.flushNow();

    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO sync_queue'),
      expect.arrayContaining([
        'habit', 'h1', 'upsert',
        expect.stringContaining('"name":"Yoga"'),
      ]),
    );

    const upsertCall = mockRunAsync.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('INSERT OR REPLACE INTO sync_queue'),
    );
    const payload = JSON.parse(upsertCall![1][3]);
    expect(payload.name).toBe('Yoga');
    expect(payload.streak).toBe(7);
    expect(payload.emoji).toBe('🧘');
    expect(payload._changedFields).toEqual(expect.arrayContaining(['name', 'streak']));
  });
});
