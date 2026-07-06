// ─── StorageAdapter unit tests ──────────────────────────────────
import { describe, it, expect, vi, beforeEach } from 'vitest';

// @ts-expect-error — React Native global not available in test env
globalThis.__DEV__ = false;

import * as SQLite from 'expo-sqlite';

// In-memory store shared across mock DB calls for a single test
let memoryStore = new Map<string, string>();

const mockDb = {
  execAsync: vi.fn(),
  runAsync: vi.fn((sql: string, params: unknown[]) => {
    if (sql.includes('INSERT OR REPLACE INTO app_state')) {
      memoryStore.set(params[0] as string, params[1] as string);
    }
    return { changes: 1 };
  }),
  getFirstAsync: vi.fn((sql: string, params: unknown[]) => {
    if (sql.includes('SELECT value FROM app_state')) {
      const val = memoryStore.get(params[0] as string);
      return val ? { value: val } : null;
    }
    return null;
  }),
  getAllAsync: vi.fn().mockResolvedValue([]),
};

beforeEach(() => {
  memoryStore = new Map();
  vi.clearAllMocks();
  vi.mocked(SQLite.openDatabaseAsync).mockResolvedValue(mockDb as any);
});

import { mobileStorageAdapter } from './storageAdapter';

describe('StorageAdapter', () => {
  describe('persistSettings / getSettings', () => {
    it('writes and reads a string value', async () => {
      await mobileStorageAdapter.persistSettings('theme', 'dark');
      const val = await mobileStorageAdapter.getSettings('theme');
      expect(val).toBe('dark');
    });

    it('writes and reads a number value', async () => {
      await mobileStorageAdapter.persistSettings('waterGoal', 2500);
      const val = await mobileStorageAdapter.getSettings('waterGoal');
      expect(val).toBe(2500);
    });

    it('writes and reads an object value', async () => {
      const obj = { name: 'test', enabled: true, count: 42 };
      await mobileStorageAdapter.persistSettings('userPrefs', obj);
      const val = await mobileStorageAdapter.getSettings('userPrefs');
      expect(val).toEqual(obj);
    });

    it('writes and reads a boolean value', async () => {
      await mobileStorageAdapter.persistSettings('remindEnabled', true);
      const val = await mobileStorageAdapter.getSettings('remindEnabled');
      expect(val).toBe(true);
    });

    it('writes and reads an array', async () => {
      const arr = ['tag1', 'tag2', 'tag3'];
      await mobileStorageAdapter.persistSettings('customTags', arr);
      const val = await mobileStorageAdapter.getSettings('customTags');
      expect(val).toEqual(arr);
    });

    it('returns null for non-existent key', async () => {
      const val = await mobileStorageAdapter.getSettings('non_existent');
      expect(val).toBeNull();
    });

    it('overwrites existing value on same key', async () => {
      await mobileStorageAdapter.persistSettings('language', 'zh');
      await mobileStorageAdapter.persistSettings('language', 'en');
      const val = await mobileStorageAdapter.getSettings('language');
      expect(val).toBe('en');
    });
  });

  describe('transaction', () => {
    it('commits successfully', async () => {
      let committed = false;
      const result = await mobileStorageAdapter.transaction(async () => {
        committed = true;
        return 'done';
      });
      expect(result).toBe('done');
      expect(committed).toBe(true);
    });

    it('rolls back on error', async () => {
      const err = new Error('test error');
      let rollbackCalled = false;
      mockDb.execAsync.mockImplementation((sql: string) => {
        if (sql === 'ROLLBACK') rollbackCalled = true;
      });

      await expect(
        mobileStorageAdapter.transaction(async () => {
          throw err;
        })
      ).rejects.toThrow('test error');
      expect(rollbackCalled).toBe(true);
    });
  });
});