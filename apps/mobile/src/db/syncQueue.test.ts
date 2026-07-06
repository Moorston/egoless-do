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
} from './syncQueue';

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
      mockGetFirstAsync.mockResolvedValueOnce({ value: '2024-01-15T10:00:00.000Z' });
      const ts = await getLastSyncTimestamp('habit');
      expect(ts).toBe('2024-01-15T10:00:00.000Z');
    });
  });

  describe('setLastSyncTimestamp', () => {
    it('stores timestamp as ISO string', async () => {
      await setLastSyncTimestamp('habit', '2024-01-15T10:00:00.000Z');
      expect(mockRunAsync).toHaveBeenCalled();
    });
  });

  describe('getQueueCount', () => {
    it('returns 0 when queue is empty', async () => {
      mockGetFirstAsync.mockResolvedValueOnce({ count: 0 });
      const count = await getQueueCount();
      expect(count).toBe(0);
    });

    it('returns correct count', async () => {
      mockGetFirstAsync.mockResolvedValueOnce({ count: 5 });
      const count = await getQueueCount();
      expect(count).toBe(5);
    });
  });

  describe('markQueueItemFailed', () => {
    it('increments retry count and sets failed status', async () => {
      await markQueueItemFailed(1, 'test error');
      expect(mockRunAsync).toHaveBeenCalled();
    });
  });

  describe('markQueueItemConflict', () => {
    it('stores conflict data', async () => {
      await markQueueItemConflict(1, 'conflict data');
      expect(mockRunAsync).toHaveBeenCalled();
    });
  });

  describe('resetAllPendingForRetry', () => {
    it('resets pending items to retry status', async () => {
      mockRunAsync.mockResolvedValueOnce({ changes: 3 });
      const result = await resetAllPendingForRetry();
      expect(result).toBe(3);
    });

    it('returns 0 when no pending items', async () => {
      mockRunAsync.mockResolvedValueOnce({ changes: 0 });
      const result = await resetAllPendingForRetry();
      expect(result).toBe(0);
    });
  });
});
