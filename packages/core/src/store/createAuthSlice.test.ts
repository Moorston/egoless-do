import { describe, it, expect, vi, beforeEach } from 'vitest';

// @ts-expect-error — React Native global not available in test env
globalThis.__DEV__ = false;

import { createAuthSlice } from './createAuthSlice';
import { defaultAuthState } from '../types';

function makeTestStore(initialState: Record<string, unknown> = {}) {
  let state: Record<string, unknown> = {
    auth: defaultAuthState,
    habits: [],
    reflections: [],
    fastingHistory: [],
    foodLog: [],
    checkinHistory: [],
    exerciseLog: [],
    medHistory: [],
    plans: [],
    planItems: [],
    planItemCheckins: [],
    dailyCustomTodos: [],
    dailyTodoHistory: [],
    graceHistory: [],
    thoughtTrails: [],
    trailNotes: [],
    reflectionLinks: [],
    checkinReviews: [],
    userProfile: {},
    ...initialState,
  };
  const set = (fn: unknown) => {
    const patch = typeof fn === 'function' ? (fn as (s: typeof state) => typeof state)(state) : fn;
    state = { ...state, ...(patch as Record<string, unknown>) };
  };
  const get = () => state;
  const api = { setState: set, getState: get, getInitialState: () => state, subscribe: () => () => {}, destroy: () => {} } as any;
  return { state: () => state, set, get: get as any, api };
}

const mockAdapter = {
  persistChange: vi.fn().mockResolvedValue(undefined),
  markDeleted: vi.fn().mockResolvedValue(undefined),
  batchDelete: vi.fn().mockResolvedValue(undefined),
  persistSettings: vi.fn().mockResolvedValue(undefined),
  getSettings: vi.fn().mockResolvedValue(null),
  transaction: vi.fn().mockImplementation(async (fn: () => Promise<unknown>) => fn()),
};

const mockOnSync = vi.fn();
const mockOnLogout = vi.fn();
const mockOnPullServerData = vi.fn().mockResolvedValue(undefined);
const mockOnClearData = vi.fn().mockResolvedValue(undefined);

// Mock auth API
vi.mock('../auth', () => ({
  apiLogin: vi.fn(),
  apiRegister: vi.fn(),
  apiLogout: vi.fn().mockResolvedValue(undefined),
  apiRefreshToken: vi.fn(),
  apiSyncPull: vi.fn(),
}));

vi.mock('../ai/ai-service', () => ({
  resetAIService: vi.fn(),
}));

vi.mock('../ai/trail-recommender', () => ({
  clearAICaches: vi.fn(),
}));

import { apiLogin, apiRegister, apiLogout, apiRefreshToken } from '../auth';

describe('createAuthSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('sets auth state on successful login', async () => {
      const mockUser = { id: 'u1', email: 'test@test.com', name: 'Test' };
      vi.mocked(apiLogin).mockResolvedValue({
        user: mockUser,
        token: 'token123',
        refreshToken: 'refresh123',
        expiresAt: Date.now() + 3600000,
      } as any);

      const store = makeTestStore();
      const slice = createAuthSlice(
        mockAdapter as any, mockOnSync, mockOnLogout, mockOnPullServerData, mockOnClearData,
      )(store.set, store.get, store.api);
      Object.assign(store.api.getState(), slice);

      await slice.login('test@test.com', 'password');

      expect(store.state().auth.isSignedIn).toBe(true);
      expect(store.state().auth.user).toEqual(mockUser);
      expect(store.state().auth.token).toBe('token123');
      expect(store.state().auth.isLoading).toBe(false);
      expect(mockOnPullServerData).toHaveBeenCalledWith('token123', 'u1');
      expect(mockOnSync).toHaveBeenCalled();
    });

    it('sets isLoading to true during login', async () => {
      let resolveLogin: (v: any) => void;
      vi.mocked(apiLogin).mockReturnValue(new Promise(r => { resolveLogin = r; }) as any);

      const store = makeTestStore();
      const slice = createAuthSlice(
        mockAdapter as any, mockOnSync, mockOnLogout, mockOnPullServerData, mockOnClearData,
      )(store.set, store.get, store.api);
      Object.assign(store.api.getState(), slice);

      const loginPromise = slice.login('test@test.com', 'password');
      expect(store.state().auth.isLoading).toBe(true);

      resolveLogin!({
        user: { id: 'u1', email: 'test@test.com', name: 'Test' },
        token: 't', refreshToken: 'r', expiresAt: Date.now() + 3600000,
      });
      await loginPromise;

      expect(store.state().auth.isLoading).toBe(false);
    });

    it('resets isLoading on login failure', async () => {
      vi.mocked(apiLogin).mockRejectedValue(new Error('Invalid credentials'));

      const store = makeTestStore();
      const slice = createAuthSlice(
        mockAdapter as any, mockOnSync, mockOnLogout, mockOnPullServerData, mockOnClearData,
      )(store.set, store.get, store.api);

      await expect(slice.login('test@test.com', 'wrong')).rejects.toThrow('Invalid credentials');
      expect(store.state().auth.isLoading).toBe(false);
      expect(store.state().auth.isSignedIn).toBe(false);
    });
  });

  describe('register', () => {
    it('sets auth state on successful registration', async () => {
      const mockUser = { id: 'u1', email: 'new@test.com', name: 'New' };
      vi.mocked(apiRegister).mockResolvedValue({
        user: mockUser,
        token: 'token123',
        refreshToken: 'refresh123',
        expiresAt: Date.now() + 3600000,
      } as any);

      const store = makeTestStore();
      const slice = createAuthSlice(
        mockAdapter as any, mockOnSync, mockOnLogout, mockOnPullServerData, mockOnClearData,
      )(store.set, store.get, store.api);
      // Attach slice to store so get().pullServerData works
      Object.assign(store.api.getState(), slice);

      await slice.register('new@test.com', 'password', 'New', '123456');

      expect(store.state().auth.isSignedIn).toBe(true);
      expect(store.state().auth.user).toEqual(mockUser);
      expect(mockOnSync).toHaveBeenCalled();
    });

    it('resets isLoading on registration failure', async () => {
      vi.mocked(apiRegister).mockRejectedValue(new Error('Email exists'));

      const store = makeTestStore();
      const slice = createAuthSlice(
        mockAdapter as any, mockOnSync, mockOnLogout, mockOnPullServerData, mockOnClearData,
      )(store.set, store.get, store.api);
      Object.assign(store.api.getState(), slice);

      await expect(slice.register('test@test.com', 'pw', 'Name', '123456')).rejects.toThrow('Email exists');
      expect(store.state().auth.isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('resets auth state to default', async () => {
      const store = makeTestStore({
        auth: { ...defaultAuthState, isSignedIn: true, token: 't', refreshToken: 'r' },
      });
      const slice = createAuthSlice(
        mockAdapter as any, mockOnSync, mockOnLogout, mockOnPullServerData, mockOnClearData,
      )(store.set, store.get, store.api);

      await slice.logout();

      expect(store.state().auth).toEqual(defaultAuthState);
      expect(mockOnLogout).toHaveBeenCalled();
    });

    it('calls apiLogout with token and refreshToken', async () => {
      const store = makeTestStore({
        auth: { ...defaultAuthState, isSignedIn: true, token: 't', refreshToken: 'r' },
      });
      const slice = createAuthSlice(
        mockAdapter as any, mockOnSync, mockOnLogout, mockOnPullServerData, mockOnClearData,
      )(store.set, store.get, store.api);

      await slice.logout();

      expect(apiLogout).toHaveBeenCalledWith('t', 'r');
    });
  });

  describe('refreshAuth', () => {
    it('refreshes token when expired', async () => {
      vi.mocked(apiRefreshToken).mockResolvedValue({
        token: 'newToken',
        refreshToken: 'newRefresh',
        expiresAt: Date.now() + 3600000,
      } as any);

      const store = makeTestStore({
        auth: {
          ...defaultAuthState,
          isSignedIn: true,
          token: 'oldToken',
          refreshToken: 'oldRefresh',
          expiresAt: Date.now() - 1000, // expired
        },
      });
      const slice = createAuthSlice(
        mockAdapter as any, mockOnSync, mockOnLogout, mockOnPullServerData, mockOnClearData,
      )(store.set, store.get, store.api);

      await slice.refreshAuth();

      expect(store.state().auth.token).toBe('newToken');
      expect(store.state().auth.refreshToken).toBe('newRefresh');
    });

    it('skips refresh when token is still valid', async () => {
      const store = makeTestStore({
        auth: {
          ...defaultAuthState,
          isSignedIn: true,
          token: 'validToken',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000, // not expired
        },
      });
      const slice = createAuthSlice(
        mockAdapter as any, mockOnSync, mockOnLogout, mockOnPullServerData, mockOnClearData,
      )(store.set, store.get, store.api);

      await slice.refreshAuth();

      expect(apiRefreshToken).not.toHaveBeenCalled();
    });

    it('skips refresh when no refreshToken', async () => {
      const store = makeTestStore({
        auth: { ...defaultAuthState, isSignedIn: true, token: 't' },
      });
      const slice = createAuthSlice(
        mockAdapter as any, mockOnSync, mockOnLogout, mockOnPullServerData, mockOnClearData,
      )(store.set, store.get, store.api);

      await slice.refreshAuth();

      expect(apiRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('pullServerData', () => {
    it('delegates to onPullServerData when provided', async () => {
      const store = makeTestStore({
        auth: { ...defaultAuthState, token: 't', user: { id: 'u1' } },
      });
      const slice = createAuthSlice(
        mockAdapter as any, mockOnSync, mockOnLogout, mockOnPullServerData, mockOnClearData,
      )(store.set, store.get, store.api);

      await slice.pullServerData();

      expect(mockOnPullServerData).toHaveBeenCalledWith('t', 'u1');
    });

    it('does nothing when no token', async () => {
      const store = makeTestStore({ auth: defaultAuthState });
      const slice = createAuthSlice(
        mockAdapter as any, mockOnSync, mockOnLogout, mockOnPullServerData, mockOnClearData,
      )(store.set, store.get, store.api);

      await slice.pullServerData();

      expect(mockOnPullServerData).not.toHaveBeenCalled();
    });
  });
});
