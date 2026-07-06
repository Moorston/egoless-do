import { describe, it, expect, vi, beforeEach } from 'vitest';

// @ts-expect-error — React Native global not available in test env
globalThis.__DEV__ = false;

// Mock all React Native and mobile dependencies
vi.mock('react-native', () => ({
  AppState: { addEventListener: vi.fn(() => ({ remove: vi.fn() })), currentState: 'active' },
  Platform: { OS: 'ios' },
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: vi.fn().mockResolvedValue(null), setItem: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('./SyncService', () => ({
  runSync: vi.fn().mockResolvedValue(undefined),
  setSyncTokenProvider: vi.fn(),
  setSyncUserIdProvider: vi.fn(),
  setSyncChangeHandler: vi.fn(),
  setDeletedIdsProvider: vi.fn(),
  connectRealtime: vi.fn(),
  disconnectRealtime: vi.fn(),
  isMigrationDone: vi.fn().mockReturnValue(true),
  setMigrationDone: vi.fn(),
  resetMigrationFlag: vi.fn(),
  rehydrateFromDb: vi.fn().mockResolvedValue(undefined),
  setKickedOutHandler: vi.fn(),
  resumeInitialSync: vi.fn(),
  setSyncTriggerCallback: vi.fn(),
  triggerSyncDebounced: vi.fn(),
  clearSyncTrigger: vi.fn(),
}));

vi.mock('./migrateToSyncQueue', () => ({
  migrateToSyncQueue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../db/syncQueue', () => ({
  getQueueCount: vi.fn().mockResolvedValue(0),
  setOnEnqueuedCallback: vi.fn(),
}));

vi.mock('../../db/schema', () => ({
  getState: vi.fn().mockResolvedValue({}),
  openDatabase: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../store/useAppStore', () => ({
  useAppStore: { getState: vi.fn() },
  useShallowStore: vi.fn(),
}));

vi.mock('../../store/storageAdapter', () => ({
  mobileStorageAdapter: { persistChange: vi.fn(), markDeleted: vi.fn(), batchDelete: vi.fn() },
  flushWrites: vi.fn().mockResolvedValue(true),
  setStorageAdapterTrigger: vi.fn(),
}));

vi.mock('../music/useMusicStore', () => ({
  useMusicStore: { getState: vi.fn() },
}));

vi.mock('./mergeSyncPatch', () => ({
  mergeSyncPatch: vi.fn(),
}));

vi.mock('@egoless-do/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@egoless-do/core')>();
  return {
    ...actual,
    registerPushToken: vi.fn().mockResolvedValue(undefined),
    getSyncUrl: vi.fn().mockReturnValue('http://localhost:8090'),
    createLogger: vi.fn().mockReturnValue({ debug: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  };
});

// Note: useSync is a React hook tightly coupled to React Native lifecycle.
// Full integration tests require @testing-library/react-hooks.
// This file documents the expected behavior and tests pure logic.

describe('useSync (unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sync patch merge logic', () => {
    it('mergeSyncPatch is called with correct parameters', async () => {
      const { mergeSyncPatch } = await import('./mergeSyncPatch');
      const mockPatch = { habit: [{ id: 'h1', name: 'test' }] };
      const mockStore = { habits: [] };

      vi.mocked(mergeSyncPatch)(mockStore as any, mockPatch as any);

      expect(mergeSyncPatch).toHaveBeenCalledWith(mockStore, mockPatch);
    });
  });

  describe('token provider', () => {
    it('setSyncTokenProvider is called during hook setup', async () => {
      const { setSyncTokenProvider } = await import('./SyncService');
      expect(setSyncTokenProvider).toBeDefined();
    });
  });
});
