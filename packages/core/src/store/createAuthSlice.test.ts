import { describe, it, expect, vi, beforeEach } from 'vitest';

// __DEV__ is globally declared via src/logger.ts; ensure test env has it set.
globalThis.__DEV__ = false;

import { apiLogin, apiRegister, apiLogout, apiRefreshToken, apiVerifyMFALogin, MFARequiredError } from '../auth';
import type { AuthResponse, MFARequiredResponse, RefreshResponse } from '../auth';
import { defaultAuthState } from '../types';

import { createAuthSlice } from './createAuthSlice';
import { createTestStore, createMockStorageAdapter, bindSlice } from './test-utils/storeHarness';
import type { AuthSlice } from './types';

// createAuthSlice reads only `auth` (and its own methods) via get() — no cross-slice
// state. So the isolated store is typed AuthSlice and seeded with just auth.
function makeTestStore(overrides: Partial<AuthSlice> = {}) {
  return createTestStore<AuthSlice>({ auth: defaultAuthState, ...overrides });
}

const adapter = createMockStorageAdapter();

const mockOnSync = vi.fn();
const mockOnLogout = vi.fn();
const mockOnPullServerData = vi.fn().mockResolvedValue(undefined);
const mockOnClearData = vi.fn().mockResolvedValue(undefined);

// Mock auth API
vi.mock('../auth', () => {
  class MFARequiredError extends Error {
    mfaToken: string;
    constructor(mfaToken: string) {
      super('MFA required');
      this.name = 'MFARequiredError';
      this.mfaToken = mfaToken;
    }
  }
  return {
    apiLogin: vi.fn(),
    apiRegister: vi.fn(),
    apiLogout: vi.fn().mockResolvedValue(undefined),
    apiRefreshToken: vi.fn(),
    apiVerifyMFALogin: vi.fn(),
    MFARequiredError,
  };
});

vi.mock('../ai/ai-service', () => ({
  resetAIService: vi.fn(),
}));

vi.mock('../ai/trail-recommender', () => ({
  clearAICaches: vi.fn(),
}));


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
      } as AuthResponse);

      const store = makeTestStore();
      const slice = bindSlice(createAuthSlice)(
        adapter, mockOnSync, mockOnLogout, mockOnPullServerData, mockOnClearData,
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
      let resolveLogin: (v: AuthResponse) => void;
      vi.mocked(apiLogin).mockReturnValue(new Promise<AuthResponse>(r => { resolveLogin = r; }));

      const store = makeTestStore();
      const slice = bindSlice(createAuthSlice)(
        adapter, mockOnSync, mockOnLogout, mockOnPullServerData, mockOnClearData,
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
      const slice = bindSlice(createAuthSlice)(
        adapter, mockOnSync, mockOnLogout, mockOnPullServerData, mockOnClearData,
      )(store.set, store.get, store.api);

      await expect(slice.login('test@test.com', 'wrong')).rejects.toThrow('Invalid credentials');
      expect(store.state().auth.isLoading).toBe(false);
      expect(store.state().auth.isSignedIn).toBe(false);
    });
  });

  describe('MFA step-up', () => {
    it('login() throws MFARequiredError and does not set auth when server requires MFA', async () => {
      vi.mocked(apiLogin).mockResolvedValue({
        mfaRequired: true,
        mfaToken: 'challenge-token',
        expiresAt: Date.now() + 5 * 60 * 1000,
      } as MFARequiredResponse);

      const store = makeTestStore();
      const slice = bindSlice(createAuthSlice)(
        adapter, mockOnSync, mockOnLogout, mockOnPullServerData, mockOnClearData,
      )(store.set, store.get, store.api);
      Object.assign(store.api.getState(), slice);

      await expect(slice.login('test@test.com', 'password')).rejects.toBeInstanceOf(MFARequiredError);

      // Auth must NOT be set — no token, not signed in
      expect(store.state().auth.isSignedIn).toBe(false);
      expect(store.state().auth.token).toBeNull();
      expect(store.state().auth.isLoading).toBe(false);
      // Must not have pulled server data or triggered sync
      expect(mockOnPullServerData).not.toHaveBeenCalled();
      expect(mockOnSync).not.toHaveBeenCalled();
    });

    it('verifyMfaLogin() completes login with the real token', async () => {
      const mockUser = { id: 'u1', email: 'test@test.com', name: 'Test' };
      vi.mocked(apiVerifyMFALogin).mockResolvedValue({
        user: mockUser,
        token: 'real-token',
        refreshToken: 'real-refresh',
        expiresAt: Date.now() + 3600000,
      } as AuthResponse);

      const store = makeTestStore();
      const slice = bindSlice(createAuthSlice)(
        adapter, mockOnSync, mockOnLogout, mockOnPullServerData, mockOnClearData,
      )(store.set, store.get, store.api);
      Object.assign(store.api.getState(), slice);

      await slice.verifyMfaLogin('challenge-token', '123456');

      expect(store.state().auth.isSignedIn).toBe(true);
      expect(store.state().auth.token).toBe('real-token');
      expect(store.state().auth.isLoading).toBe(false);
      expect(mockOnPullServerData).toHaveBeenCalledWith('real-token', 'u1');
      expect(mockOnSync).toHaveBeenCalled();
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
      } as AuthResponse);

      const store = makeTestStore();
      const slice = bindSlice(createAuthSlice)(
        adapter, mockOnSync, mockOnLogout, mockOnPullServerData, mockOnClearData,
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
      const slice = bindSlice(createAuthSlice)(
        adapter, mockOnSync, mockOnLogout, mockOnPullServerData, mockOnClearData,
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
      const slice = bindSlice(createAuthSlice)(
        adapter, mockOnSync, mockOnLogout, mockOnPullServerData, mockOnClearData,
      )(store.set, store.get, store.api);

      await slice.logout();

      expect(store.state().auth).toEqual(defaultAuthState);
      expect(mockOnLogout).toHaveBeenCalled();
    });

    it('calls apiLogout with token and refreshToken', async () => {
      const store = makeTestStore({
        auth: { ...defaultAuthState, isSignedIn: true, token: 't', refreshToken: 'r' },
      });
      const slice = bindSlice(createAuthSlice)(
        adapter, mockOnSync, mockOnLogout, mockOnPullServerData, mockOnClearData,
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
      } as RefreshResponse);

      const store = makeTestStore({
        auth: {
          ...defaultAuthState,
          isSignedIn: true,
          token: 'oldToken',
          refreshToken: 'oldRefresh',
          expiresAt: Date.now() - 1000, // expired
        },
      });
      const slice = bindSlice(createAuthSlice)(
        adapter, mockOnSync, mockOnLogout, mockOnPullServerData, mockOnClearData,
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
      const slice = bindSlice(createAuthSlice)(
        adapter, mockOnSync, mockOnLogout, mockOnPullServerData, mockOnClearData,
      )(store.set, store.get, store.api);

      await slice.refreshAuth();

      expect(apiRefreshToken).not.toHaveBeenCalled();
    });

    it('skips refresh when no refreshToken', async () => {
      const store = makeTestStore({
        auth: { ...defaultAuthState, isSignedIn: true, token: 't' },
      });
      const slice = bindSlice(createAuthSlice)(
        adapter, mockOnSync, mockOnLogout, mockOnPullServerData, mockOnClearData,
      )(store.set, store.get, store.api);

      await slice.refreshAuth();

      expect(apiRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('pullServerData', () => {
    it('delegates to onPullServerData when provided', async () => {
      const store = makeTestStore({
        auth: { ...defaultAuthState, token: 't', user: { id: 'u1', name: 'Test' } },
      });
      const slice = bindSlice(createAuthSlice)(
        adapter, mockOnSync, mockOnLogout, mockOnPullServerData, mockOnClearData,
      )(store.set, store.get, store.api);

      await slice.pullServerData();

      expect(mockOnPullServerData).toHaveBeenCalledWith('t', 'u1');
    });

    it('does nothing when no token', async () => {
      const store = makeTestStore({ auth: defaultAuthState });
      const slice = bindSlice(createAuthSlice)(
        adapter, mockOnSync, mockOnLogout, mockOnPullServerData, mockOnClearData,
      )(store.set, store.get, store.api);

      await slice.pullServerData();

      expect(mockOnPullServerData).not.toHaveBeenCalled();
    });
  });
});
