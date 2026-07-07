// ─── Migration tests ────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach } from 'vitest';

// @ts-expect-error — React Native global not available in test env
globalThis.__DEV__ = false;

import * as SQLite from 'expo-sqlite';

// In-memory DB store
const memoryDb = new Map<string, string>();
const memoryAsyncStorage = new Map<string, string>();

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn((key: string) => {
      return Promise.resolve(memoryAsyncStorage.get(key) ?? null);
    }),
    setItem: vi.fn((key: string, value: string) => {
      memoryAsyncStorage.set(key, value);
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      memoryAsyncStorage.delete(key);
      return Promise.resolve();
    }),
    clear: vi.fn(() => {
      memoryAsyncStorage.clear();
      return Promise.resolve();
    }),
  },
}));

const mockDb = {
  execAsync: vi.fn(),
  runAsync: vi.fn((sql: string, params: unknown[]) => {
    if (sql.includes('INSERT OR REPLACE INTO app_state')) {
      memoryDb.set(params[0] as string, params[1] as string);
    }
    return { changes: 1 };
  }),
  getFirstAsync: vi.fn((sql: string, params: unknown[]) => {
    if (sql.includes('SELECT value FROM app_state')) {
      const val = memoryDb.get(params[0] as string);
      return val ? { value: val } : null;
    }
    return null;
  }),
  getAllAsync: vi.fn().mockResolvedValue([]),
};

beforeEach(() => {
  memoryDb.clear();
  memoryAsyncStorage.clear();
  vi.clearAllMocks();
  vi.mocked(SQLite.openDatabaseAsync).mockResolvedValue(mockDb as any);
});

import { migrateSettingsToSQLite, migrateAsyncStorageToSQLite } from './migrateAsyncStorage';
import { mobileStorageAdapter } from './storageAdapter';

// Seed AsyncStorage with old partialize-style data
function seedSettings() {
  memoryAsyncStorage.set('egoless-do-mobile', JSON.stringify({
    theme: 'dark',
    language: 'en',
    streak: 5,
    waterMl: 1500,
    waterGoal: 2000,
    calGoal: 1800,
    remindEnabled: true,
    remindTime: '08:00',
    weightUnit: 'kg',
    customTags: ['#meditation', '#gratitude'],
    customMoods: ['calm', 'happy'],
    allTagsOrder: ['#meditation', '#gratitude'],
    allMoodsOrder: ['calm', 'happy'],
    customFoodPresets: [],
    reflectionFilters: { tags: [], moods: [] },
    healthSyncEnabled: true,
    ignoredRecPatterns: [],
    sleepGoal: { hours: 8 },
  }));
}

function seedEntityData() {
  memoryAsyncStorage.set('egoless-do-mobile', JSON.stringify({
    habits: [{ id: 'h1', name: 'Morning meditation', deleted: false }],
    reflections: [{ id: 'r1', content: 'Test reflection', deleted: false }],
    checkinHistory: [{ date: '2026-07-01', note: 'Good day' }],
    userProfile: { nickname: 'TestUser', weightKg: 70 },
  }));
}

describe('migrateSettingsToSQLite', () => {
  it('skips if already migrated', async () => {
    memoryDb.set('settings_migrated_to_sqlite', '1');
    const result = await migrateSettingsToSQLite(mockDb as any, mobileStorageAdapter);
    expect(result).toBe(false);
  });

  it('migrates settings from AsyncStorage to SQLite', async () => {
    seedSettings();
    const result = await migrateSettingsToSQLite(mockDb as any, mobileStorageAdapter);
    expect(result).toBe(true);

    // Verify in SQLite
    const theme = await mobileStorageAdapter.getSettings('theme');
    expect(theme).toBe('dark');
    const language = await mobileStorageAdapter.getSettings('language');
    expect(language).toBe('en');
    const streak = await mobileStorageAdapter.getSettings('streak');
    expect(streak).toBe(5);
    const waterMl = await mobileStorageAdapter.getSettings('waterMl');
    expect(waterMl).toBe(1500);
  });

  it('is idempotent on second call', async () => {
    seedSettings();
    await migrateSettingsToSQLite(mockDb as any, mobileStorageAdapter);
    const result = await migrateSettingsToSQLite(mockDb as any, mobileStorageAdapter);
    expect(result).toBe(false);
  });

  it('handles empty AsyncStorage gracefully', async () => {
    const result = await migrateSettingsToSQLite(mockDb as any, mobileStorageAdapter);
    expect(result).toBe(false);
  });
});

describe('migrateAsyncStorageToSQLite', () => {
  it('skips if already migrated', async () => {
    memoryDb.set('async_storage_migrated', '1');
    const result = await migrateAsyncStorageToSQLite(mockDb as any, mobileStorageAdapter);
    expect(result).toBe(false);
  });

  it('migrates entity data from AsyncStorage to SQLite', async () => {
    seedEntityData();
    const result = await migrateAsyncStorageToSQLite(mockDb as any, mobileStorageAdapter);
    expect(result).toBe(true);

    // Verify migration flag set
    const flag = memoryDb.get('async_storage_migrated');
    expect(flag).toBe('1');
  });

  it('handles empty AsyncStorage gracefully', async () => {
    const result = await migrateAsyncStorageToSQLite(mockDb as any, mobileStorageAdapter);
    expect(result).toBe(false);
    const flag = memoryDb.get('async_storage_migrated');
    expect(flag).toBe('1');
  });
});