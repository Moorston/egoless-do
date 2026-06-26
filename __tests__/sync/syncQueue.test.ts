// ─── syncQueue tests ──────────────────────────────────────────────
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock expo-sqlite — use vi.hoisted so vars are available in mock factory
const { mockRunAsync, mockGetAllAsync, mockGetFirstAsync, mockExecAsync } = vi.hoisted(() => ({
  mockRunAsync: vi.fn().mockResolvedValue({ changes: 0 }),
  mockGetAllAsync: vi.fn().mockResolvedValue([]),
  mockGetFirstAsync: vi.fn().mockResolvedValue(null),
  mockExecAsync: vi.fn(),
}));

vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: vi.fn().mockResolvedValue({
    execAsync: mockExecAsync,
    runAsync: mockRunAsync,
    getAllAsync: mockGetAllAsync,
    getFirstAsync: mockGetFirstAsync,
  }),
}));

import {
  getLastSyncTimestamp,
  setLastSyncTimestamp,
  getQueueCount,
  markQueueItemFailed,
  markQueueItemConflict,
  resetAllPendingForRetry,
} from '../../apps/mobile/src/db/syncQueue';

describe('syncQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLastSyncTimestamp', () => {
    it('returns default epoch when no entry exists', async () => {
      mockGetFirstAsync.mockResolvedValueOnce(null);
      const ts = await getLastSyncTimestamp('habit');
      expect(ts).toBe('1970-01-01T00:00:00.000Z');
    });

    it('returns stored timestamp', async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        last_sync_timestamp: '2026-01-01T00:00:00.000Z',
      });
      const ts = await getLastSyncTimestamp('habit');
      expect(ts).toBe('2026-01-01T00:00:00.000Z');
    });
  });

  describe('setLastSyncTimestamp', () => {
    it('upserts timestamp into sync_metadata', async () => {
      await setLastSyncTimestamp('habit', '2026-01-01T00:00:00.000Z');
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sync_metadata'),
        expect.arrayContaining(['habit', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z']),
      );
    });
  });

  describe('getQueueCount', () => {
    it('returns count of pending items', async () => {
      mockGetFirstAsync.mockResolvedValueOnce({ count: 5 });
      const count = await getQueueCount();
      expect(count).toBe(5);
    });

    it('returns 0 when no items', async () => {
      mockGetFirstAsync.mockResolvedValueOnce(null);
      const count = await getQueueCount();
      expect(count).toBe(0);
    });
  });

  describe('markQueueItemFailed', () => {
    it('marks item as failed and increments retry_count', async () => {
      await markQueueItemFailed(1, 'test error');
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining("status = 'failed'"),
        expect.arrayContaining(['test error', 1]),
      );
    });
  });

  describe('markQueueItemConflict', () => {
    it('marks item as conflict', async () => {
      await markQueueItemConflict(2, 'conflict reason');
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining("status = 'conflict'"),
        expect.arrayContaining(['conflict reason', 2]),
      );
    });
  });

  describe('resetAllPendingForRetry', () => {
    it('resets failed/conflict items back to pending', async () => {
      mockRunAsync.mockResolvedValueOnce({ changes: 3 });
      const count = await resetAllPendingForRetry();
      expect(count).toBe(3);
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining("status = 'pending'"),
      );
    });
  });
});
