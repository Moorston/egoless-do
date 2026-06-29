import type { AuthSlice, UiSlice, StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';
import { defaultAuthState } from '../types';
import { apiLogin, apiRegister, apiLogout, apiRefreshToken, apiSyncPull } from '../auth';
import { mergeById } from '../sync/merge';
import { calculateCheckinStreak } from '../utils';
import { createLogger } from '../logger';
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
      onLogout?.();
    },

    async clearDataAndLogout() {
      const { auth } = get();
      set({ auth: defaultAuthState });
      // Clear data first so UI updates immediately, then fire-and-forget logout API
      await onClearData?.();
      onLogout?.();
      if (auth.token && auth.refreshToken) {
        apiLogout(auth.token, auth.refreshToken).catch((e: unknown) => log.error(e));
      }
    },

    async refreshAuth() {
      const { auth } = get();
      if (!auth.refreshToken) return;
      if (_refreshInFlight) return _refreshInFlight;
      _refreshInFlight = (async () => {
        try {
          const res = await apiRefreshToken(auth.refreshToken!);
          // Only apply if user is still logged in (not logged out during refresh)
          if (get().auth.refreshToken) {
            set(s => ({ auth: { ...s.auth, token: res.token, refreshToken: res.refreshToken, expiresAt: res.expiresAt } }));
          }
        } catch {
          // Only clear auth if user is still logged in
          if (get().auth.refreshToken) {
            set({ auth: defaultAuthState });
          }
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
        const data = result.data;
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
            patch.medHistory = mergedMed.filter(m => !m.deleted);
            patch.totalMedMinutes = (mergedMed as Array<{ dur?: string; deleted?: boolean }>).filter(m => !m.deleted).reduce((sum, m) => sum + (parseInt(m.dur ?? '') || 0), 0);
          }
          if (data.plan)            patch.plans = mergeById(data.plan, s.plans ?? [], 'id').filter(i => !i.deleted);
          if (data.planItem)        patch.planItems = mergeById(data.planItem, s.planItems ?? [], 'id').filter(i => !i.deleted);
          if (data.planItemCheckin) patch.planItemCheckins = mergeById(data.planItemCheckin, s.planItemCheckins ?? [], 'id').filter(i => !i.deleted);
          if (data.dailyCustomTodo) patch.dailyCustomTodos = mergeById(data.dailyCustomTodo, s.dailyCustomTodos ?? [], 'id').filter(i => !i.deleted);
          if (data.dailyTodoHistory) patch.dailyTodoHistory = mergeById(data.dailyTodoHistory, s.dailyTodoHistory ?? [], 'id').filter(i => !i.deleted);
          if (data.grace)           patch.graceHistory = mergeById(data.grace, s.graceHistory ?? [], 'date').filter(i => !i.deleted);
          if (data.thoughtTrail)    patch.thoughtTrails = mergeById(data.thoughtTrail, s.thoughtTrails ?? [], 'id').filter(i => !i.deleted);
          if (data.trailNote)       patch.trailNotes = mergeById(data.trailNote, s.trailNotes ?? [], 'id').filter(i => !i.deleted);

          if (data.profile?.length) {
            const latest = data.profile
              .filter((p: any) => !p.deleted)
              .sort((a: any, b: any) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0];
            if (latest) {
              let profileData = latest.data ?? latest;
              if (typeof profileData === 'string') {
                try { profileData = JSON.parse(profileData); } catch { profileData = {}; }
              }
              const SETTINGS_KEYS = ['calGoal', 'customFoodPresets', 'theme', 'language', 'remindEnabled', 'remindTime', 'customTags', 'customMoods', 'allTagsOrder', 'allMoodsOrder'] as const;
              const { calGoal: _cg, customFoodPresets: _cfp, theme: _th, language: _lg, remindEnabled: _re, remindTime: _rt, customTags: _ct, customMoods: _cm, allTagsOrder: _ato, allMoodsOrder: _amo, ...profileDataWithoutSettings } = profileData as any;
              patch.userProfile = { ...(s.userProfile ?? {}), ...profileDataWithoutSettings };
              if (profileData.waterMl !== undefined) patch.waterMl = profileData.waterMl;
              if (profileData.waterGoal !== undefined) patch.waterGoal = profileData.waterGoal;
              if (profileData.weightUnit !== undefined) patch.weightUnit = profileData.weightUnit;
              const localUpdated = s.userProfile?.updatedAt ?? 0;
              const serverUpdated = latest.updatedAt ?? 0;
              if (serverUpdated >= localUpdated) {
                for (const sk of SETTINGS_KEYS) {
                  if (profileData[sk] !== undefined) (patch as any)[sk] = profileData[sk];
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
