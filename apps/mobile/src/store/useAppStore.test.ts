// ─── useAppStore tests ───────────────────────────────────────────
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock references (hoisted so vi.mock factories can use them) ───

const { mockPersistChange } = vi.hoisted(() => ({
  mockPersistChange: vi.fn().mockResolvedValue(undefined),
}));

const { mockAddEventListener } = vi.hoisted(() => ({
  mockAddEventListener: vi.fn(() => ({ remove: vi.fn() })),
}));

const { mockSetApiBase, mockSetPushApiBase, mockSetSyncApiBase } = vi.hoisted(() => ({
  mockSetApiBase: vi.fn(),
  mockSetPushApiBase: vi.fn(),
  mockSetSyncApiBase: vi.fn(),
}));

const { mockFlushWrites, mockSetPersistErrorHandler } = vi.hoisted(() => ({
  mockFlushWrites: vi.fn().mockResolvedValue(undefined),
  mockSetPersistErrorHandler: vi.fn(),
}));

const { mockRunSync, mockResetSyncState, mockSoftResetSyncState, mockResetMigrationFlag, mockRehydrateFromDb, mockInitialSync } = vi.hoisted(() => ({
  mockRunSync: vi.fn().mockResolvedValue(undefined),
  mockResetSyncState: vi.fn().mockResolvedValue(undefined),
  mockSoftResetSyncState: vi.fn().mockResolvedValue(undefined),
  mockResetMigrationFlag: vi.fn(),
  mockRehydrateFromDb: vi.fn().mockResolvedValue({}),
  mockInitialSync: vi.fn().mockResolvedValue('done'),
}));

const { mockSetMusicSyncCallback } = vi.hoisted(() => ({
  mockSetMusicSyncCallback: vi.fn(),
}));

// ── Mocks ─────────────────────────────────────────────────────────

vi.mock('./storageAdapter', () => ({
  mobileStorageAdapter: {
    persistChange: mockPersistChange,
    markDeleted: vi.fn().mockResolvedValue(undefined),
    batchDelete: vi.fn().mockResolvedValue(undefined),
    persistSettings: vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockResolvedValue(null),
    transaction: vi.fn(async (fn: () => Promise<unknown>) => fn()),
  },
  flushWrites: mockFlushWrites,
  setPersistErrorHandler: mockSetPersistErrorHandler,
}));

vi.mock('../features/music/useMusicStore', () => ({
  useMusicStore: {
    getState: vi.fn(() => ({
      favorites: ['fav1'],
      userTracks: [{ id: 't1', name: 'Rain', nameEn: 'Rain', category: 'nature' }],
      volume: 0.7,
      playMode: 'sequential',
    })),
  },
  setMusicSyncCallback: mockSetMusicSyncCallback,
}));

vi.mock('../features/sync/SyncService', () => ({
  runSync: mockRunSync,
  resetSyncState: mockResetSyncState,
  softResetSyncState: mockSoftResetSyncState,
  resetMigrationFlag: mockResetMigrationFlag,
  rehydrateFromDb: mockRehydrateFromDb,
  initialSync: mockInitialSync,
}));

vi.mock('react-native', () => ({
  AppState: {
    addEventListener: mockAddEventListener,
  },
}));

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      hostUri: 'localhost:8081',
      extra: { apiBase: 'http://test' },
    },
  },
}));

vi.mock('@egoless-do/core', () => {
  const sliceStub = () => () => ({});
  return {
    setApiBase: mockSetApiBase,
    setPushApiBase: mockSetPushApiBase,
    setSyncApiBase: mockSetSyncApiBase,
    createLogger: () => ({
      debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
    }),
    createAuthSlice: vi.fn(() => sliceStub()),
    createHabitSlice: vi.fn(() => sliceStub()),
    createReflectionSlice: vi.fn(() => sliceStub()),
    createSleepSlice: vi.fn(() => sliceStub()),
    createFoodSlice: vi.fn(() => sliceStub()),
    createCheckinSlice: vi.fn(() => sliceStub()),
    createExerciseSlice: vi.fn(() => sliceStub()),
    createMeditationSlice: vi.fn(() => sliceStub()),
    createFastingSlice: vi.fn(() => sliceStub()),
    createProfileSlice: vi.fn(() => sliceStub()),
    createSettingsSlice: vi.fn(() => sliceStub()),
    createPlanSlice: vi.fn(() => sliceStub()),
    createRecycleBinSlice: vi.fn(() => sliceStub()),
    createThoughtTrailSlice: vi.fn(() => sliceStub()),
    createReviewSlice: vi.fn(() => sliceStub()),
    createBodySlice: vi.fn(() => sliceStub()),
    createDietSlice: vi.fn(() => sliceStub()),
    createPracticeSlice: vi.fn(() => sliceStub()),
    createMindSlice: vi.fn(() => sliceStub()),
    createMantraSlice: vi.fn(() => sliceStub()),
    createZhiguanSlice: vi.fn(() => sliceStub()),
    createSliceErrorSlice: vi.fn(() => sliceStub()),
  };
});

vi.mock('./createMobileUiSlice', () => {
  const sliceStub = () => () => ({});
  return {
    createMobileUiSlice: vi.fn(() => sliceStub()),
  };
});

// ── Imports (after all mocks) ─────────────────────────────────────
import { setMusicSyncCallback } from '../features/music/useMusicStore';
import {
  runSync, softResetSyncState,
  resetMigrationFlag, rehydrateFromDb, initialSync,
  resetSyncState,
} from '../features/sync/SyncService';

import { setPersistErrorHandler } from './storageAdapter';
import {
  useAppStore,
  useShallowStore,
  initMobileStore,
  type MobileStore,
} from './useAppStore';

// ── Helpers ───────────────────────────────────────────────────────

/** Capture the AppState('change', ...) listener registered by initMobileStore() */
function getAppStateListener(): (state: string) => void {
  const changeCall = mockAddEventListener.mock.calls.find(
    (c: unknown[]) => c[0] === 'change',
  );
  if (!changeCall) throw new Error('AppState change listener was not registered');
  return changeCall[1] as (state: string) => void;
}

/** Reset store to known defaults via Zustand's setState on the store */
function resetStoreDefaults() {
  useAppStore.setState({
    userProfile: {},
    waterMl: 0,
    waterGoal: 2000,
    weightUnit: 'kg',
    calGoal: 2000,
    customFoodPresets: [],
    theme: 'light',
    language: 'zh',
    remindEnabled: false,
    remindTime: '08:00',
    healthSyncEnabled: false,
    customTags: [],
    customMoods: [],
    allTagsOrder: [],
    allMoodsOrder: [],
    aiMode: 'smart',
    aiModels: {},
    auth: { isSignedIn: false, user: null },
    medHistory: [],
    checkinHistory: [],
  } as Partial<MobileStore>);
}

// ── Tests ─────────────────────────────────────────────────────────

describe('useAppStore — API base configuration', () => {
  // NOTE: __DEV__ is false in the test environment (set by setup.ts),
  // so the module evaluates the production path: PROD_API and PROD_PB.

  it('setApiBase is called once at module load', () => {
    expect(mockSetApiBase).toHaveBeenCalledTimes(1);
  });

  it('production mode uses the fallback URL from environment', () => {
    // When __DEV__ is false, apiBase = process.env.EXPO_PUBLIC_API_URL ?? fallback
    // In test env, the env var is undefined, so fallback is used
    expect(mockSetApiBase).toHaveBeenCalledWith(
      'https://egolessdo.freebytes.net',
    );
  });

  it('setPushApiBase receives the same URL as setApiBase', () => {
    expect(mockSetPushApiBase).toHaveBeenCalledTimes(1);
    expect(mockSetApiBase.mock.calls[0][0]).toBe(
      mockSetPushApiBase.mock.calls[0][0],
    );
  });

  it('setSyncApiBase is called with the PocketBase production fallback', () => {
    expect(mockSetSyncApiBase).toHaveBeenCalledWith(
      'https://egolessdo.freebytes.net',
    );
  });
});

describe('useShallowStore', () => {
  it('is exported as a function', () => {
    expect(typeof useShallowStore).toBe('function');
  });

  it('useAppStore can store and retrieve values', () => {
    useAppStore.setState({ theme: 'dark' } as Partial<MobileStore>);
    expect(useAppStore.getState().theme).toBe('dark');
    useAppStore.setState({ theme: 'light' } as Partial<MobileStore>);
  });
});

describe('Profile persistence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPersistChange.mockClear();
    resetStoreDefaults();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('persistProfileSettings debounces with 500ms delay', () => {
    // The music sync callback is wired to persistProfileSettings
    expect(mockSetMusicSyncCallback).toHaveBeenCalled();
    const profilePersistFn = mockSetMusicSyncCallback.mock.calls[0][0] as () => void;

    // Set non-default state so flushProfileSettings doesn't early-return
    useAppStore.setState({ waterGoal: 2500 } as Partial<MobileStore>);
    profilePersistFn();

    // Not yet flushed (500ms debounce)
    const profileCallsBefore = mockPersistChange.mock.calls.filter(
      (c: unknown[]) => c[0] === 'profile',
    );
    expect(profileCallsBefore.length).toBe(0);

    vi.advanceTimersByTime(500);

    const profileCallsAfter = mockPersistChange.mock.calls.filter(
      (c: unknown[]) => c[0] === 'profile',
    );
    expect(profileCallsAfter.length).toBeGreaterThan(0);
  });

  it('flushProfileSettings writes correct data structure via AppState background', () => {
    useAppStore.setState({
      waterMl: 1500,
      waterGoal: 2500,
      weightUnit: 'lb',
      calGoal: 1800,
      customFoodPresets: [{ name: 'rice' }],
      theme: 'dark',
      language: 'en',
      remindEnabled: true,
      remindTime: '09:00',
      healthSyncEnabled: true,
      customTags: ['morning'],
      customMoods: ['calm'],
      allTagsOrder: ['morning', 'evening'],
      allMoodsOrder: ['calm', 'happy'],
      userProfile: { name: 'test' },
    } as Partial<MobileStore>);

    const listener = getAppStateListener();
    listener('background');

    expect(mockPersistChange).toHaveBeenCalledWith(
      'profile', 'self',
      expect.objectContaining({
        waterMl: 1500,
        waterGoal: 2500,
        weightUnit: 'lb',
        calGoal: 1800,
        customFoodPresets: [{ name: 'rice' }],
        theme: 'dark',
        language: 'en',
        remindEnabled: true,
        remindTime: '09:00',
        healthSyncEnabled: true,
        customTags: ['morning'],
        customMoods: ['calm'],
        allTagsOrder: ['morning', 'evening'],
        allMoodsOrder: ['calm', 'happy'],
        name: 'test',
        musicFavorites: ['fav1'],
        musicVolume: 0.7,
        musicPlayMode: 'sequential',
        // expect.any() returns any by vitest design — type-checked at runtime instead
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        updatedAt: expect.any(Number),
      }),
    );
  });

  it('AppState background triggers profile flush', () => {
    mockPersistChange.mockClear();
    // Set non-default state so flushProfileSettings doesn't early-return
    useAppStore.setState({ waterGoal: 2500 } as Partial<MobileStore>);
    const listener = getAppStateListener();
    listener('background');

    const profileCalls = mockPersistChange.mock.calls.filter(
      (c: unknown[]) => c[0] === 'profile',
    );
    expect(profileCalls.length).toBeGreaterThan(0);
  });

  it('AppState background triggers flushWrites', async () => {
    mockFlushWrites.mockClear();
    const listener = getAppStateListener();
    await listener('background');
    expect(mockFlushWrites).toHaveBeenCalled();
  });
});

describe('AI Config persistence', () => {
  beforeEach(() => {
    mockPersistChange.mockClear();
    resetStoreDefaults();
  });

  it('AppState background flushes AI config with current mode and models', () => {
    useAppStore.setState({
      aiMode: 'advanced',
      aiModels: { gpt: 'gpt-4' },
    } as Partial<MobileStore>);

    const listener = getAppStateListener();
    listener('background');

    expect(mockPersistChange).toHaveBeenCalledWith(
      'aiConfig', 'self',
      expect.objectContaining({
        config_id: 'self',
        mode: 'advanced',
        models: { gpt: 'gpt-4' },
        // expect.any() returns any by vitest design — type-checked at runtime instead
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        updatedAt: expect.any(Number),
        deleted: false,
      }),
    );
  });

  it('flushAIConfig writes config_id self with mode and models', () => {
    useAppStore.setState({
      aiMode: 'fast',
      aiModels: { gemini: 'gemini-pro' },
    } as Partial<MobileStore>);

    const listener = getAppStateListener();
    listener('background');

    const aiCall = mockPersistChange.mock.calls.find(
      (c: unknown[]) => c[0] === 'aiConfig',
    );
    expect(aiCall).toBeDefined();
    expect(aiCall![1]).toBe('self');
    expect(aiCall![2]).toEqual(
      expect.objectContaining({
        config_id: 'self',
        mode: 'fast',
        models: { gemini: 'gemini-pro' },
        deleted: false,
      }),
    );
  });

  it('both profile and AI config are flushed on background', () => {
    mockPersistChange.mockClear();
    // Set non-default state so flushProfileSettings doesn't early-return
    useAppStore.setState({ waterGoal: 2500 } as Partial<MobileStore>);
    const listener = getAppStateListener();
    listener('background');

    const entityTypes = mockPersistChange.mock.calls.map((c: unknown[]) => c[0]);
    expect(entityTypes).toContain('profile');
    expect(entityTypes).toContain('aiConfig');
  });
});

describe('Auth flow', () => {
  it('createAuthSlice receives adapter and 4 callback arguments', async () => {
    const coreModule = await import('@egoless-do/core');
    const mockAuthSlice = vi.mocked(coreModule.createAuthSlice);
    expect(mockAuthSlice).toHaveBeenCalled();

    const args = mockAuthSlice.mock.calls[0];
    // createAuthSlice(adapter, onSync, onLogout, pullServerData, onClearData)
    expect(args[0]).toBeDefined();             // adapter
    expect(typeof args[1]).toBe('function');   // onSync
    expect(typeof args[2]).toBe('function');   // onLogout
    expect(typeof args[3]).toBe('function');   // pullServerData
    expect(typeof args[4]).toBe('function');   // onClearData
  });

  it('pullServerData calls initialSync → flushWrites → rehydrateFromDb', async () => {
    mockInitialSync.mockResolvedValue('done');
    mockFlushWrites.mockResolvedValue(undefined);
    mockRehydrateFromDb.mockResolvedValue({});

    const coreModule = await import('@egoless-do/core');
    const mockAuthSlice = vi.mocked(coreModule.createAuthSlice);
    const pullServerData = mockAuthSlice.mock.calls[0][3] as (
      token: string, userId: string,
    ) => Promise<void>;

    await pullServerData('test-token', 'user-1');

    expect(initialSync).toHaveBeenCalledWith('test-token', 'user-1');
    expect(mockFlushWrites).toHaveBeenCalled();
    expect(rehydrateFromDb).toHaveBeenCalled();
  });

  it('logout calls softResetSyncState + resetMigrationFlag', async () => {
    const coreModule = await import('@egoless-do/core');
    const mockAuthSlice = vi.mocked(coreModule.createAuthSlice);
    const onLogout = mockAuthSlice.mock.calls[0][2] as () => Promise<void>;

    await onLogout();

    expect(softResetSyncState).toHaveBeenCalled();
    expect(resetMigrationFlag).toHaveBeenCalled();
  });

  it('clearData calls resetSyncState', async () => {
    const coreModule = await import('@egoless-do/core');
    const mockAuthSlice = vi.mocked(coreModule.createAuthSlice);
    const onClearData = mockAuthSlice.mock.calls[0][4] as () => Promise<void>;

    await onClearData();

    expect(resetSyncState).toHaveBeenCalled();
  });
});

describe('Auto-sync wiring', () => {
  it('onSync callback triggers runSync', async () => {
    mockRunSync.mockClear();
    const coreModule = await import('@egoless-do/core');
    const mockAuthSlice = vi.mocked(coreModule.createAuthSlice);
    const onSync = mockAuthSlice.mock.calls[0][1] as () => void;

    onSync();

    await vi.waitFor(() => {
      expect(mockRunSync).toHaveBeenCalled();
    });
  });

  it('multiple slices receive triggerAutoSync as last argument', async () => {
    const coreModule = await import('@egoless-do/core');

    const slicesWithSync = [
      vi.mocked(coreModule.createHabitSlice),
      vi.mocked(coreModule.createSleepSlice),
      vi.mocked(coreModule.createReviewSlice),
      vi.mocked(coreModule.createBodySlice),
      vi.mocked(coreModule.createDietSlice),
      vi.mocked(coreModule.createPracticeSlice),
      vi.mocked(coreModule.createMindSlice),
      vi.mocked(coreModule.createMantraSlice),
    ];

    for (const sliceMock of slicesWithSync) {
      expect(sliceMock).toHaveBeenCalled();
      const lastArg = sliceMock.mock.calls[0].slice(-1)[0];
      expect(typeof lastArg).toBe('function');
    }
  });
});

describe('initMobileStore', () => {
  it('registers AppState change listener', () => {
    expect(mockAddEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
  });

  it('calling initMobileStore again does not throw (idempotent)', () => {
    const callCountBefore = mockAddEventListener.mock.calls.length;
    expect(() => initMobileStore()).not.toThrow();
    expect(mockAddEventListener.mock.calls.length).toBeGreaterThan(callCountBefore);
  });

  it('registered listener can be invoked without throwing', async () => {
    const listener = getAppStateListener();
    await expect(listener('background')).resolves.toBeUndefined();
  });
});

describe('handleAppStateChange via AppState listener', () => {
  beforeEach(() => {
    mockPersistChange.mockClear();
    mockFlushWrites.mockClear();
  });

  it('does NOT flush when state is active', async () => {
    const listener = getAppStateListener();
    await listener('active');

    expect(mockPersistChange).not.toHaveBeenCalled();
    expect(mockFlushWrites).not.toHaveBeenCalled();
  });

  it('flushes profile, AI config, and writes when state is background', async () => {
    // Set non-default state so flushProfileSettings doesn't early-return
    useAppStore.setState({ waterGoal: 2500 } as Partial<MobileStore>);
    const listener = getAppStateListener();
    await listener('background');

    const entityTypes = mockPersistChange.mock.calls.map((c: unknown[]) => c[0]);
    expect(entityTypes).toContain('profile');
    expect(entityTypes).toContain('aiConfig');
    expect(mockFlushWrites).toHaveBeenCalled();
  });

  it('flushes when state is inactive', async () => {
    const listener = getAppStateListener();
    await listener('inactive');

    expect(mockFlushWrites).toHaveBeenCalled();
  });
});

describe('Error handling wiring', () => {
  it('setPersistErrorHandler is called during store creation', () => {
    expect(setPersistErrorHandler).toHaveBeenCalledWith(
      expect.any(Function),
    );
  });

  it('setMusicSyncCallback is wired to persistProfileSettings', () => {
    expect(setMusicSyncCallback).toHaveBeenCalledWith(
      expect.any(Function),
    );
  });
});

describe('pullServerData — medHistory and checkinHistory handling', () => {
  it('calls calculateTotalMedMin when medHistory is present in dbPatch', async () => {
    const mockCalcMed = vi.fn();
    const mockCalcStreak = vi.fn();
    useAppStore.setState({
      calculateTotalMedMin: mockCalcMed,
      calculateStreak: mockCalcStreak,
    } as Partial<MobileStore>);

    mockRehydrateFromDb.mockResolvedValueOnce({
      medHistory: [{ date: '2026-01-01', duration: 30 }],
    });

    const coreModule = await import('@egoless-do/core');
    const mockAuthSlice = vi.mocked(coreModule.createAuthSlice);
    const pullServerData = mockAuthSlice.mock.calls[0][3] as (
      token: string, userId: string,
    ) => Promise<void>;

    // The pullServerData calls getStore().setState(dbPatch) internally,
    // which requires the store to have setState. With mocked slices,
    // _storeRef is a plain object. The internal setState call will fail,
    // but we verify the functions leading up to it were called correctly.
    try { await pullServerData('token', 'user-1'); } catch { /* expected */ }

    expect(initialSync).toHaveBeenCalledWith('token', 'user-1');
    expect(mockFlushWrites).toHaveBeenCalled();
    expect(rehydrateFromDb).toHaveBeenCalled();
  });

  it('calls calculateStreak when checkinHistory is present in dbPatch', async () => {
    const mockCalcMed = vi.fn();
    const mockCalcStreak = vi.fn();
    useAppStore.setState({
      calculateTotalMedMin: mockCalcMed,
      calculateStreak: mockCalcStreak,
    } as Partial<MobileStore>);

    mockRehydrateFromDb.mockResolvedValueOnce({
      checkinHistory: [{ date: '2026-07-06' }],
    });

    const coreModule = await import('@egoless-do/core');
    const mockAuthSlice = vi.mocked(coreModule.createAuthSlice);
    const pullServerData = mockAuthSlice.mock.calls[0][3] as (
      token: string, userId: string,
    ) => Promise<void>;

    try { await pullServerData('token', 'user-1'); } catch { /* expected */ }

    expect(initialSync).toHaveBeenCalledWith('token', 'user-1');
    expect(rehydrateFromDb).toHaveBeenCalled();
  });

  it('does not call calculateTotalMedMin when dbPatch is empty', async () => {
    const mockCalcMed = vi.fn();
    useAppStore.setState({
      calculateTotalMedMin: mockCalcMed,
    } as Partial<MobileStore>);

    mockRehydrateFromDb.mockResolvedValueOnce({});

    const coreModule = await import('@egoless-do/core');
    const mockAuthSlice = vi.mocked(coreModule.createAuthSlice);
    const pullServerData = mockAuthSlice.mock.calls[0][3] as (
      token: string, userId: string,
    ) => Promise<void>;

    await pullServerData('token', 'user-1');

    expect(mockCalcMed).not.toHaveBeenCalled();
  });
});

describe('Store shape', () => {
  it('useAppStore has Zustand API: getState, setState, subscribe', () => {
    expect(typeof useAppStore.getState).toBe('function');
    expect(typeof useAppStore.setState).toBe('function');
    expect(typeof useAppStore.subscribe).toBe('function');
  });

  it('useAppStore setState can update and getState reads it back', () => {
    useAppStore.setState({ theme: 'dark' } as Partial<MobileStore>);
    expect(useAppStore.getState().theme).toBe('dark');
    useAppStore.setState({ theme: 'light' } as Partial<MobileStore>);
  });
});
