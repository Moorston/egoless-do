import type { AuthSlice, StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';
import { defaultAuthState } from '../types';
import { apiLogin, apiRegister, apiLogout, apiRefreshToken, apiSyncPull } from '../auth';
import { mergeById } from '../sync/merge';
import { activeOnly } from '../utils';
import { createLogger } from '../logger';
import { resetAIService } from '../ai/ai-service';
import { clearAICaches } from '../ai/trail-recommender';
const log = createLogger('Store');

// ── 标准实体合并：配置表驱动 ──────────────────────────────────
// [syncKey, storeKey, mergeKey]
const ENTITY_MERGE_MAP: Array<[string, string, string]> = [
  ['habit',           'habits',            'id'],
  ['reflection',      'reflections',       'id'],
  ['fasting',         'fastingHistory',    'id'],
  ['food',            'foodLog',           'id'],
  ['checkin',         'checkinHistory',    'date'],
  ['exercise',        'exerciseLog',       'id'],
  ['plan',            'plans',             'id'],
  ['planItem',        'planItems',         'id'],
  ['planItemCheckin', 'planItemCheckins',  'id'],
  ['dailyCustomTodo', 'dailyCustomTodos',  'id'],
  ['dailyTodoHistory','dailyTodoHistory',  'id'],
  ['grace',           'graceHistory',      'date'],
  ['thoughtTrail',    'thoughtTrails',     'id'],
  ['trailNote',       'trailNotes',        'id'],
  ['reflectionLink',  'reflectionLinks',   'id'],
  ['checkinReview',   'checkinReviews',    'id'],
  ['bodyGoal',        'bodyGoals',         'id'],
  ['bodyPlan',        'bodyPlans',         'id'],
  ['weightRecord',    'weightRecords',     'id'],
  ['bodyCheckin',     'bodyCheckins',      'id'],
  ['sleep',           'sleepHistory',      'id'],
  ['give',            'giveHistory',       'id'],
];

/** Merge server sync data into current store state. Extracted for readability. */
function buildMergePatch(
  data: Record<string, unknown[]>,
  s: Record<string, unknown>,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  for (const [syncKey, storeKey, mergeKey] of ENTITY_MERGE_MAP) {
    const incoming = data[syncKey];
    if (!incoming) continue;
    const existing = (s[storeKey] ?? []) as Record<string, any>[];
    patch[storeKey] = mergeById(incoming as Record<string, any>[], existing, mergeKey)
      .filter((i: Record<string, any>) => !i.deleted);
  }

  // ── 特殊实体：meditation（需 activeOnly + totalMedMinutes 计算）
  if (data.meditation) {
    const mergedMed = mergeById(data.meditation as Record<string, any>[], (s.medHistory ?? []) as Record<string, any>[], 'date');
    patch.medHistory = activeOnly(mergedMed);
    patch.totalMedMinutes = (mergedMed as Array<{ durMin?: number; deleted?: boolean }>)
      .filter(m => !m.deleted).reduce((sum, m) => sum + (m.durMin || 0), 0);
  }

  // ── 特殊实体：aiConfig（取最新一条）
  if (data.aiConfig?.length) {
    const latest = (data.aiConfig as Record<string, unknown>[])
      .filter((c: Record<string, unknown>) => !c.deleted)
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => ((b.updatedAt as number) ?? 0) - ((a.updatedAt as number) ?? 0))[0];
    if (latest) {
      const cfg = latest as Record<string, unknown>;
      if (cfg.mode) patch.aiMode = cfg.mode;
      if (cfg.models) patch.aiModels = cfg.models;
    }
  }

  // ── 特殊实体：profile（解析 data 字段 + 设置时间覆盖）
  if (data.profile?.length) {
    const latest = (data.profile as Record<string, unknown>[])
      .filter((p: Record<string, unknown>) => !p.deleted)
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => ((b.updatedAt as number) ?? 0) - ((a.updatedAt as number) ?? 0))[0];
    if (latest) {
      let profileData = (latest as Record<string, unknown>).data ?? latest;
      if (typeof profileData === 'string') {
        try { profileData = JSON.parse(profileData); } catch { profileData = {}; }
      }
      const p = profileData as Record<string, unknown>;
      const SETTINGS_KEYS = ['calGoal', 'customFoodPresets', 'theme', 'language', 'remindEnabled', 'remindTime', 'customTags', 'customMoods', 'allTagsOrder', 'allMoodsOrder'] as const;
      const { calGoal: _cg, customFoodPresets: _cfp, theme: _th, language: _lg, remindEnabled: _re, remindTime: _rt, customTags: _ct, customMoods: _cm, allTagsOrder: _ato, allMoodsOrder: _amo, ...profileDataWithoutSettings } = p;
      patch.userProfile = { ...((s.userProfile as Record<string, unknown>) ?? {}), ...profileDataWithoutSettings };
      if (p.waterMl !== undefined) patch.waterMl = p.waterMl;
      if (p.waterGoal !== undefined) patch.waterGoal = p.waterGoal;
      if (p.weightUnit !== undefined) patch.weightUnit = p.weightUnit;
      const localUpdated = ((s.userProfile as Record<string, unknown>)?.updatedAt as number) ?? 0;
      const serverUpdated = ((latest as Record<string, unknown>).updatedAt as number) ?? 0;
      if (serverUpdated >= localUpdated) {
        for (const sk of SETTINGS_KEYS) {
          if (p[sk] !== undefined) (patch as Record<string, unknown>)[sk] = p[sk];
        }
      }
    }
  }

  return patch;
}

export function createAuthSlice(
  adapter: StorageAdapter,
  onSync: () => void,
  onLogout?: () => void | Promise<void>,
  onPullServerData?: (token: string, userId?: string) => Promise<void>,
  onClearData?: () => void | Promise<void>,
): SliceCreator<AuthSlice> {
  // Guard against concurrent refresh calls (shared across the slice lifetime)
  let _refreshInFlight: Promise<void> | null = null;

  return (set, get) => ({
    auth: defaultAuthState,

    async login(email: string, password: string) {
      set(s => ({ auth: { ...s.auth, isLoading: true } }));
      try {
        const res = await apiLogin(email, password);
        log.debug('login response', { hasToken: !!res.token, hasRefreshToken: !!res.refreshToken, expiresAt: res.expiresAt });
        set({
          auth: {
            user: res.user, token: res.token, refreshToken: res.refreshToken,
            isSignedIn: true, isLoading: false, expiresAt: res.expiresAt,
          },
        });
        await get().pullServerData(res.token);
        log.debug('after pull', { signedIn: get().auth.isSignedIn });
        onSync();
        adapter.persistSettings('auth', { isSignedIn: true, user: res.user, isGuest: false }).catch(e => log.error(e));
      } catch (e) {
        set(s => ({ auth: { ...s.auth, isLoading: false } }));
        throw e;
      }
    },

    async register(email: string, password: string, name: string, code: string) {
      set(s => ({ auth: { ...s.auth, isLoading: true } }));
      try {
        const res = await apiRegister(email, password, name, code);
        set({
          auth: {
            user: res.user, token: res.token, refreshToken: res.refreshToken,
            isSignedIn: true, isLoading: false, expiresAt: res.expiresAt,
          },
        });
        await get().pullServerData(res.token);
        onSync();
        adapter.persistSettings('auth', { isSignedIn: true, user: res.user, isGuest: false }).catch(e => log.error(e));
      } catch (e) {
        set(s => ({ auth: { ...s.auth, isLoading: false } }));
        throw e;
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
      onLogout?.();
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
      onLogout?.();
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
        // Retry up to 2 times on transient network errors
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const res = await apiRefreshToken(auth.refreshToken!, auth.token ?? undefined);
            // Only apply if user is still logged in (not logged out during refresh)
            if (get().auth.isSignedIn && get().auth.refreshToken) {
              set(s => ({ auth: { ...s.auth, token: res.token, refreshToken: res.refreshToken, expiresAt: res.expiresAt } }));
            }
            return; // Success — exit retry loop
          } catch {
            if (attempt === 0) {
              // First failure: brief wait before retry (transient network blip)
              await new Promise(r => setTimeout(r, 1000));
              continue;
            }
            // Second failure: only clear auth if token is actually expired
            const currentAuth = get().auth;
            if (currentAuth.refreshToken && currentAuth.expiresAt && currentAuth.expiresAt < Date.now()) {
              log.warn('Token refresh failed after 2 attempts, clearing auth', { context: 'refreshAuth' });
              set({ auth: defaultAuthState });
            }
            // If token is still valid, keep the auth state — network error is transient
          }
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
