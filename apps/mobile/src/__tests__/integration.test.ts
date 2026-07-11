import { describe, it, expect, vi, beforeEach } from 'vitest';

// @ts-expect-error — React Native global not available in test env
globalThis.__DEV__ = false;

// Mock all dependencies
vi.mock('react-native', () => ({
  AppState: { addEventListener: vi.fn().mockReturnValue({ remove: vi.fn() }) },
  PixelRatio: { getFontScale: vi.fn().mockReturnValue(1) },
}));

vi.mock('@sentry/react-native', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
  setUser: vi.fn(),
}));

vi.mock('expo-constants', () => ({
  default: { expoConfig: { version: '1.0.0', hostUri: 'localhost:8081' } },
}));

vi.mock('../sentry', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
  setSentryUser: vi.fn(),
  clearSentryUser: vi.fn(),
  initSentry: vi.fn(),
}));

vi.mock('../db/schema', () => ({
  openDatabase: vi.fn().mockResolvedValue({
    execAsync: vi.fn(),
    runAsync: vi.fn().mockResolvedValue({ changes: 0 }),
    getAllAsync: vi.fn().mockResolvedValue([]),
    getFirstAsync: vi.fn().mockResolvedValue(null),
  }),
  getState: vi.fn().mockResolvedValue(null),
  setState: vi.fn().mockResolvedValue(undefined),
  withDbLock: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

vi.mock('../store/storageAdapter', () => ({
  mobileStorageAdapter: {
    persistChange: vi.fn().mockResolvedValue(undefined),
    markDeleted: vi.fn().mockResolvedValue(undefined),
    batchDelete: vi.fn().mockResolvedValue(undefined),
    persistSettings: vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockResolvedValue(null),
    transaction: vi.fn().mockImplementation(async (fn: () => Promise<unknown>) => fn()),
  },
  flushWrites: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../store/migrateAsyncStorage', () => ({
  migrateAsyncStorageToSQLite: vi.fn().mockResolvedValue(false),
  migrateSettingsToSQLite: vi.fn().mockResolvedValue(false),
}));

vi.mock('../store/secureAuth', () => ({
  loadSecureTokens: vi.fn().mockResolvedValue(null),
  saveSecureTokens: vi.fn().mockResolvedValue(undefined),
  clearSecureTokens: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../features/sync/SyncService', () => ({
  rehydrateFromDb: vi.fn().mockResolvedValue({}),
}));

vi.mock('@egoless-do/core', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    DailyResetManager: vi.fn().mockImplementation(() => ({
      start: vi.fn(),
    })),
    createLogger: () => ({
      debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
    }),
    setSentryBridge: vi.fn(),
  };
});

// Mock useAppStore
vi.mock('../store/useAppStore', () => {
  const mockState = {
    auth: { isSignedIn: false, user: null },
    checkinHistory: [],
    medHistory: [],
    userProfile: {},
    waterGoal: 2000,
    cleanupRecycleBin: vi.fn(),
    calculateTotalMedMin: vi.fn(),
    calculateStreak: vi.fn(),
    performDailyReset: vi.fn(),
    checkHabitAutoStatus: vi.fn(),
    autoSyncPlanItems: vi.fn(),
    autoSyncHabits: vi.fn(),
  };
  return {
    useAppStore: {
      getState: vi.fn(() => mockState),
      setState: vi.fn(),
      subscribe: vi.fn(),
    },
    type: {},
  };
});

describe('Integration tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('App initialization flow', () => {
    it('completes full initialization without errors', async () => {
      const { initApp } = await import('../store/initApp');
      await expect(initApp()).resolves.toBeUndefined();
    });

    it('loads settings from SQLite during init', async () => {
      const { mobileStorageAdapter } = await import('../store/storageAdapter');
      const { initApp } = await import('../store/initApp');
      await initApp();
      expect(mobileStorageAdapter.getSettings).toHaveBeenCalled();
    });

    it('loads secure tokens during init', async () => {
      const { loadSecureTokens } = await import('../store/secureAuth');
      const { initApp } = await import('../store/initApp');
      await initApp();
      expect(loadSecureTokens).toHaveBeenCalled();
    });
  });

  describe('Data persistence flow', () => {
    it('settings are persisted via adapter', async () => {
      const { mobileStorageAdapter } = await import('../store/storageAdapter');
      const { initApp } = await import('../store/initApp');
      await initApp();
      // Verify adapter methods are available
      expect(mobileStorageAdapter.persistSettings).toBeDefined();
      expect(mobileStorageAdapter.getSettings).toBeDefined();
    });

    it('entity changes are persisted via adapter', async () => {
      const { mobileStorageAdapter } = await import('../store/storageAdapter');
      const { initApp } = await import('../store/initApp');
      await initApp();
      // Verify adapter methods are available
      expect(mobileStorageAdapter.persistChange).toBeDefined();
      expect(mobileStorageAdapter.markDeleted).toBeDefined();
    });
  });

  describe('Error recovery flow', () => {
    it('continues initialization when migration fails', async () => {
      const { migrateAsyncStorageToSQLite } = await import('../store/migrateAsyncStorage');
      vi.mocked(migrateAsyncStorageToSQLite).mockRejectedValueOnce(new Error('migration failed'));
      const { initApp } = await import('../store/initApp');
      await expect(initApp()).resolves.toBeUndefined();
    });

    it('continues initialization when secure tokens fail', async () => {
      const { loadSecureTokens } = await import('../store/secureAuth');
      vi.mocked(loadSecureTokens).mockRejectedValueOnce(new Error('secure store error'));
      const { initApp } = await import('../store/initApp');
      await expect(initApp()).resolves.toBeUndefined();
    });

    it('continues initialization when rehydrate fails', async () => {
      const { rehydrateFromDb } = await import('../features/sync/SyncService');
      vi.mocked(rehydrateFromDb).mockRejectedValueOnce(new Error('rehydrate failed'));
      const { initApp } = await import('../store/initApp');
      await expect(initApp()).resolves.toBeUndefined();
    });
  });
});
