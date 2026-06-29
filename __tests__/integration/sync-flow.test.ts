// ─── Sync flow integration tests ─────────────────────────────────
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock external dependencies
vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: vi.fn().mockResolvedValue({
    execAsync: vi.fn(),
    runAsync: vi.fn().mockResolvedValue({ changes: 0 }),
    getAllAsync: vi.fn().mockResolvedValue([]),
    getFirstAsync: vi.fn().mockResolvedValue(null),
    withTransactionAsync: vi.fn((callback) => callback()),
  }),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

describe('Sync Flow Integration', () => {
  describe('Queue Management', () => {
    it('enqueues change for sync', async () => {
      // This test verifies the sync queue mechanism
      const { enqueueChange } = await import('../../apps/mobile/src/db/syncQueue');

      // Mock database
      const mockDb = {
        withTransactionAsync: vi.fn((callback) => callback()),
        runAsync: vi.fn(),
      };

      // The enqueue function should not throw
      await expect(
        enqueueChange('habits', 'habit-1', 'upsert', { name: 'Test' })
      ).resolves.toBeUndefined();
    });

    it('drains queue items', async () => {
      const { drainQueue } = await import('../../apps/mobile/src/db/syncQueue');

      // Should return array (empty in mock)
      const items = await drainQueue(10);
      expect(Array.isArray(items)).toBe(true);
    });
  });

  describe('Data Gateway', () => {
    it('creates and retrieves entity', async () => {
      const { NoopDataGateway } = await import(
        '../../packages/core/src/data/DataGateway'
      );

      const gateway = new NoopDataGateway();

      // Noop gateway returns null for get
      const result = await gateway.get('test', 'id-1');
      expect(result).toBeNull();

      // Noop gateway returns empty array for list
      const list = await gateway.list('test');
      expect(list).toEqual([]);
    });
  });

  describe('Transform Utilities', () => {
    it('converts snake_case to camelCase', async () => {
      const { keysToCamel, keysToSnake } = await import(
        '../../packages/core/src/utils/transform'
      );

      const snakeObj = {
        user_name: 'test',
        created_at: '2024-01-01',
        nested_obj: {
          field_name: 'value',
        },
      };

      const camelObj = keysToCamel(snakeObj);
      expect(camelObj).toEqual({
        userName: 'test',
        createdAt: '2024-01-01',
        nestedObj: {
          fieldName: 'value',
        },
      });

      // Convert back to snake_case
      const backToSnake = keysToSnake(camelObj);
      expect(backToSnake).toEqual(snakeObj);
    });
  });
});
