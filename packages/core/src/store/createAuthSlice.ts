import type { AuthSlice, StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';
import { defaultAuthState } from '../types';
import { apiLogin, apiRegister, apiLogout, apiRefreshToken, apiSyncPull } from '../auth';
import { createLogger } from '../logger';
import { resetAIService } from '../ai/ai-service';
import { clearAICaches } from '../ai/trail-recommender';
import { NetworkError } from '../fetch';
import { buildMergePatch } from './mergeEngine';
const log = createLogger('Store');

export function createAuthSlice(
  adapter: StorageAdapter,
  onSync: () => void,
  onLogout?: () => void | Promise<void>,
  onPullServerData?: (token: string, userId?: string) => Promise<void>,
  onClearData?: () => void | Promise<void>,
): SliceCreator<AuthSlice> {
  // Guard against concurrent refresh calls (shared across the slice lifetime)
  let _refreshInFlight: Promise<void> | null = null;
  let _loginInFlight: Promise<void> | null = null;
  let _registerInFlight: Promise<void> | null = null;

  return (set, get) => ({
    auth: defaultAuthState,

    async login(email: string, password: string) {
      if (_loginInFlight) return _loginInFlight;
      _loginInFlight = (async () => {
        set(s => ({ auth: { ...s.auth, isLoading: true } }));
        try {
          const res = await apiLogin(email, password);
          log.debug('login response', { hasToken: !!res.token, hasRefreshToken: !!res.refreshToken, expiresAt: res.expiresAt });
          // Set token and user immediately (for API calls), but keep isLoading true
          // until pullServerData completes — prevents UI from rendering empty data
          set({
            auth: {
              user: res.user, token: res.token, refreshToken: res.refreshToken,
              isSignedIn: true, isLoading: true, expiresAt: res.expiresAt,
            },
          });
          await get().pullServerData(res.token);
          log.debug('after pull', { signedIn: get().auth.isSignedIn });
          // Now data is loaded — mark as fully ready
          set(s => ({ auth: { ...s.auth, isLoading: false } }));
          onSync();
          adapter.persistSettings('auth', { isSignedIn: true, user: res.user, isGuest: false }).catch(e => log.error(e));
        } catch (e) {
          // If we already have a token (login succeeded but pull failed), keep auth state
          // The token is valid — user can retry data pull later
          const currentAuth = get().auth;
          if (currentAuth.token) {
            set(s => ({ auth: { ...s.auth, isLoading: false } }));
            log.error(e, { context: 'pullServerData after login' });
          } else {
            // Login itself failed — clear everything
            set({ auth: defaultAuthState });
            throw e;
          }
        }
      })();
      try {
        await _loginInFlight;
      } finally {
        _loginInFlight = null;
      }
    },

    async register(email: string, password: string, name: string, code: string) {
      if (_registerInFlight) return _registerInFlight;
      _registerInFlight = (async () => {
        set(s => ({ auth: { ...s.auth, isLoading: true } }));
        try {
          const res = await apiRegister(email, password, name, code);
          // Set token and user immediately, keep isLoading true until pullServerData
          set({
            auth: {
              user: res.user, token: res.token, refreshToken: res.refreshToken,
              isSignedIn: true, isLoading: true, expiresAt: res.expiresAt,
            },
          });
          await get().pullServerData(res.token);
          // Now data is loaded — mark as fully ready
          set(s => ({ auth: { ...s.auth, isLoading: false } }));
          onSync();
          adapter.persistSettings('auth', { isSignedIn: true, user: res.user, isGuest: false }).catch(e => log.error(e));
        } catch (e) {
          // If we already have a token (register succeeded but pull failed), keep auth state
          // The token is valid — user can retry data pull later
          const currentAuth = get().auth;
          if (currentAuth.token) {
            set(s => ({ auth: { ...s.auth, isLoading: false } }));
            log.error(e, { context: 'pullServerData after register' });
          } else {
            // Register itself failed — clear everything
            set({ auth: defaultAuthState });
            throw e;
          }
        }
      })();
      try {
        await _registerInFlight;
      } finally {
        _registerInFlight = null;
      }
    },

    async logout() {
      const { auth } = get();
      if (auth.token && auth.refreshToken) {
        try {
          await apiLogout(auth.token, auth.refreshToken);
        } catch (e: unknown) {
          log.error(e, { context: 'logout API call' });
        }
      }
      set({ auth: defaultAuthState });
      // Clear AI caches and reset service to prevent stale data leakage
      clearAICaches();
      resetAIService();
      await onLogout?.();
      adapter.persistSettings('auth', { isSignedIn: false, user: null, isGuest: false }).catch(e => log.error(e));
    },

    async clearDataAndLogout() {
      const { auth } = get();
      // Send logout API first to invalidate token server-side before clearing
      if (auth.token && auth.refreshToken) {
        try { await apiLogout(auth.token, auth.refreshToken); } catch (e: unknown) { log.error(e); }
      }
      set({ auth: defaultAuthState });
      // Clear AI caches and reset service to prevent stale data leakage
      clearAICaches();
      resetAIService();
      await onClearData?.();
      await onLogout?.();
      // Note: SecureStore is cleared by the Zustand subscription in initApp.ts
      // which watches auth.token changes and calls clearSecureTokens()
      adapter.persistSettings('auth', { isSignedIn: false, user: null, isGuest: false }).catch(e => log.error(e));
    },

    async refreshAuth() {
      const { auth } = get();
      if (!auth.refreshToken) return;
      // Proactive refresh: refresh when token is within 5 minutes of expiration
      // This prevents the race where token expires mid-API-call
      const PROACTIVE_WINDOW_MS = 5 * 60 * 1000;
      if (auth.expiresAt && auth.expiresAt > Date.now() + PROACTIVE_WINDOW_MS) return;
      if (_refreshInFlight) return _refreshInFlight;
      _refreshInFlight = (async () => {
        // Note: retry only helps with transient network errors.
        // 400/401 responses from the server are not retried (they land in catch too,
        // but the second attempt will receive the same server response and fail again).
        // Retry up to 2 times on transient network errors
        let lastError: unknown;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const res = await apiRefreshToken(auth.refreshToken!, auth.token ?? undefined);
            // Only apply if user is still logged in (not logged out during refresh)
            if (get().auth.isSignedIn && get().auth.refreshToken) {
              set(s => ({ auth: { ...s.auth, token: res.token, refreshToken: res.refreshToken, expiresAt: res.expiresAt } }));
            }
            return; // Success — exit retry loop
          } catch (e) {
            lastError = e;
            if (attempt === 0 && e instanceof NetworkError) {
              // First failure on network error: brief wait before retry
              await new Promise(r => setTimeout(r, 1000));
              continue;
            }
            // 401/400 etc: don't retry, fall through to check token expiry
            // Second failure or non-retryable error: only clear auth if token has been expired
            // beyond the grace period (7 days). Prevents forced logout from transient network issues.
            const currentAuth = get().auth;
            const LOGOUT_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
            const isPastGrace = currentAuth.expiresAt > 0 ? currentAuth.expiresAt + LOGOUT_GRACE_MS < Date.now() : false;
            if (currentAuth.refreshToken && isPastGrace) {
              log.warn('Token refresh failed after 2 attempts and past grace period, clearing auth', { context: 'refreshAuth' });
              set({ auth: defaultAuthState });
            }
            // If token is still valid, keep the auth state — network error is transient
          }
        }
        // After retry loop completes without success, propagate the error
        // so callers know the refresh failed (don't silently resolve)
        if (lastError) {
          log.error(lastError, { context: 'refreshAuth failed after retries' });
        }
      })();
      try {
        await _refreshInFlight;
      } finally {
        _refreshInFlight = null;
      }
      // After refresh completes, verify user is still logged in
      if (!get().auth.refreshToken) return;
    },

    async pullServerData(tokenOverride?: string) {
      const token = tokenOverride ?? get().auth.token;
      if (!token) return;
      const userId = get().auth.user?.id;

      // Delegate to platform-specific handler if provided (mobile: SQLite path)
      if (onPullServerData) {
        try {
          await onPullServerData(token, userId);
        } catch (err) {
          log.error(err, { context: 'pullServerData delegate' });
        }
        return;
      }

      // Default: merge directly into store (web path)
      try {
        const result = await apiSyncPull(token, userId);
        if (!result.data) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- sync data is heterogeneous; mergeById requires Record<string, any> index access
        const data = result.data as Record<string, any[]>;
        // Use functional set() to merge with the latest state, avoiding stale-overwrite
        set(s => {
          const patch = buildMergePatch(data, s as unknown as Record<string, unknown>);
          if (patch.checkinHistory) {
            // Defer streak calculation to after set completes
            setTimeout(() => get().calculateStreak(), 0);
          }
          return patch;
        });
      } catch (err) {
        log.error(err, { context: 'pullServerData' });
      }
    },
  });
}
