import type { AuthSlice, UiSlice, StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';
import { defaultAuthState } from '../types';
import { apiLogin, apiRegister, apiLogout, apiRefreshToken, apiSyncPull } from '../auth';
import { mergeById } from '../sync/merge';
import { calculateCheckinStreak, activeOnly } from '../utils';
import { createLogger } from '../logger';
import { resetAIService } from '../ai/ai-service';
import { clearAICaches } from '../ai/trail-recommender';
const log = createLogger('Store');

export function createAuthSlice(
  adapter: StorageAdapter,
  onSyncTrigger: () => void,
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
        onSyncTrigger();
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
        onSyncTrigger();
      } catch (e) {
        set(s => ({ auth: { ...s.auth, isLoading: false } }));
        throw e;
      }
    },

    logout() {
      const { auth } = get();
      if (auth.token && auth.refreshToken) {
        apiLogout(auth.token, auth.refreshToken).catch((e: unknown) => log.error(e));
      }
      set({ auth: defaultAuthState });
      // Clear AI caches and reset service to prevent stale data leakage
      clearAICaches();
      resetAIService();
      onLogout?.();
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
    },

    async refreshAuth() {
      const { auth } = get();
      if (!auth.refreshToken) return;
      // Don't refresh if token is still valid (not expired)
      if (auth.expiresAt && auth.expiresAt > Date.now()) return;
      if (_refreshInFlight) return _refreshInFlight;
      _refreshInFlight = (async () => {
        try {
          const res = await apiRefreshToken(auth.refreshToken!, auth.token ?? undefined);
          // Only apply if user is still logged in (not logged out during refresh)
          if (get().auth.refreshToken) {
            set(s => ({ auth: { ...s.auth, token: res.token, refreshToken: res.refreshToken, expiresAt: res.expiresAt } }));
          }
        } catch {
          // Only clear auth if token is actually expired (not just a network error)
          const currentAuth = get().auth;
          if (currentAuth.refreshToken && currentAuth.expiresAt && currentAuth.expiresAt < Date.now()) {
            set({ auth: defaultAuthState });
          }
          // If token is still valid, keep the auth state — network error is transient
        }
      })();
      try {
        await _refreshInFlight;
      } finally {
        _refreshInFlight = null;
      }
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
          const patch: Record<string, unknown> = {};

          if (data.habit)      patch.habits = mergeById(data.habit, s.habits ?? [], 'id').filter(i => !i.deleted);
          if (data.reflection) patch.reflections = mergeById(data.reflection, s.reflections ?? [], 'id').filter(i => !i.deleted);
          if (data.fasting)    patch.fastingHistory = mergeById(data.fasting, s.fastingHistory ?? [], 'id').filter(i => !i.deleted);
          if (data.food)       patch.foodLog = mergeById(data.food, s.foodLog ?? [], 'id').filter(i => !i.deleted);
          if (data.checkin)    patch.checkinHistory = mergeById(data.checkin, s.checkinHistory ?? [], 'date').filter(i => !i.deleted);
          if (data.exercise)   patch.exerciseLog = mergeById(data.exercise, s.exerciseLog ?? [], 'id').filter(i => !i.deleted);
          if (data.meditation) {
            const mergedMed = mergeById(data.meditation, s.medHistory ?? [], 'date');
            patch.medHistory = activeOnly(mergedMed);
            patch.totalMedMinutes = (mergedMed as Array<{ durMin?: number; deleted?: boolean }>).filter(m => !m.deleted).reduce((sum, m) => sum + (m.durMin || 0), 0);
          }
          if (data.plan)            patch.plans = mergeById(data.plan, s.plans ?? [], 'id').filter(i => !i.deleted);
          if (data.planItem)        patch.planItems = mergeById(data.planItem, s.planItems ?? [], 'id').filter(i => !i.deleted);
          if (data.planItemCheckin) patch.planItemCheckins = mergeById(data.planItemCheckin, s.planItemCheckins ?? [], 'id').filter(i => !i.deleted);
          if (data.dailyCustomTodo) patch.dailyCustomTodos = mergeById(data.dailyCustomTodo, s.dailyCustomTodos ?? [], 'id').filter(i => !i.deleted);
          if (data.dailyTodoHistory) patch.dailyTodoHistory = mergeById(data.dailyTodoHistory, s.dailyTodoHistory ?? [], 'id').filter(i => !i.deleted);
          if (data.grace)           patch.graceHistory = mergeById(data.grace, s.graceHistory ?? [], 'date').filter(i => !i.deleted);
          if (data.thoughtTrail)    patch.thoughtTrails = mergeById(data.thoughtTrail, s.thoughtTrails ?? [], 'id').filter(i => !i.deleted);
          if (data.trailNote)       patch.trailNotes = mergeById(data.trailNote, s.trailNotes ?? [], 'id').filter(i => !i.deleted);
          if (data.reflectionLink)  patch.reflectionLinks = mergeById(data.reflectionLink, s.reflectionLinks ?? [], 'id').filter(i => !i.deleted);
          if (data.checkinReview)   patch.checkinReviews = mergeById(data.checkinReview, s.checkinReviews ?? [], 'id').filter(i => !i.deleted);

          if (data.aiConfig?.length) {
            const latest = data.aiConfig
              .filter((c: Record<string, unknown>) => !c.deleted)
              .sort((a: Record<string, unknown>, b: Record<string, unknown>) => ((b.updatedAt as number) ?? 0) - ((a.updatedAt as number) ?? 0))[0];
            if (latest) {
              const cfg = latest as Record<string, unknown>;
              if (cfg.mode) patch.aiMode = cfg.mode;
              if (cfg.models) patch.aiModels = cfg.models;
            }
          }

          if (data.profile?.length) {
            const latest = data.profile
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
              patch.userProfile = { ...(s.userProfile ?? {}), ...profileDataWithoutSettings };
              if (p.waterMl !== undefined) patch.waterMl = p.waterMl;
              if (p.waterGoal !== undefined) patch.waterGoal = p.waterGoal;
              if (p.weightUnit !== undefined) patch.weightUnit = p.weightUnit;
              const localUpdated = s.userProfile?.updatedAt ?? 0;
              const serverUpdated = (latest as Record<string, unknown>).updatedAt as number ?? 0;
              if (serverUpdated >= localUpdated) {
                for (const sk of SETTINGS_KEYS) {
                  if (p[sk] !== undefined) (patch as Record<string, unknown>)[sk] = p[sk];
                }
              }
            }
          }

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
