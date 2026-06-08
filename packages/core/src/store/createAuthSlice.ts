import type { AuthSlice, UiSlice, StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';
import { defaultAuthState } from '../types';
import { apiLogin, apiRegister, apiLogout, apiRefreshToken, apiSyncPull } from '../auth';
import { mergeById } from '../sync/merge';
import { calculateCheckinStreak } from '../utils';

export function createAuthSlice(
  adapter: StorageAdapter,
  onSyncTrigger: () => void,
  onLogout?: () => void,
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
        apiLogout(auth.token, auth.refreshToken).catch((e: unknown) => console.error('[err]', e));
      }
      set({ auth: defaultAuthState });
      onLogout?.();
    },

    async refreshAuth() {
      const { auth } = get();
      if (!auth.refreshToken) return;
      if (_refreshInFlight) return _refreshInFlight;
      _refreshInFlight = (async () => {
        try {
          const res = await apiRefreshToken(auth.refreshToken!);
          set(s => ({ auth: { ...s.auth, token: res.token, refreshToken: res.refreshToken, expiresAt: res.expiresAt } }));
        } catch {
          set({ auth: defaultAuthState });
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
      try {
        const result = await apiSyncPull(token);
        if (!result.data) return;
        const data = result.data;
        const s = get();
        const patch: Record<string, unknown> = {};

        if (data.habit)      patch.habits = mergeById(data.habit, s.habits ?? [], 'id');
        if (data.reflection) patch.reflections = mergeById(data.reflection, s.reflections ?? [], 'id');
        if (data.fasting)    patch.fastingHistory = mergeById(data.fasting, s.fastingHistory ?? [], 'id');
        if (data.food)       patch.foodLog = mergeById(data.food, s.foodLog ?? [], 'id');
        if (data.checkin)    patch.checkinHistory = mergeById(data.checkin, s.checkinHistory ?? [], 'date');
        if (data.exercise)   patch.exerciseLog = mergeById(data.exercise, s.exerciseLog ?? [], 'id');
        if (data.meditation) {
          patch.medHistory = mergeById(data.meditation, s.medHistory ?? [], 'date');
          patch.totalMedMinutes = (patch.medHistory as any[]).reduce((sum: number, m: any) => sum + (parseInt(m.dur) || 0), 0);
        }
        if (data.plan)            patch.plans = mergeById(data.plan, s.plans ?? [], 'id');
        if (data.planItem)        patch.planItems = mergeById(data.planItem, s.planItems ?? [], 'id');
        if (data.planItemCheckin) patch.planItemCheckins = mergeById(data.planItemCheckin, s.planItemCheckins ?? [], 'id');
        if (data.dailyCustomTodo) patch.dailyCustomTodos = mergeById(data.dailyCustomTodo, s.dailyCustomTodos ?? [], 'id');
        if (data.dailyTodoHistory) patch.dailyTodoHistory = mergeById(data.dailyTodoHistory, s.dailyTodoHistory ?? [], 'id');
        if (data.grace)           patch.graceHistory = mergeById(data.grace, s.graceHistory ?? [], 'date');
        if (data.thoughtTrail)    patch.thoughtTrails = mergeById(data.thoughtTrail, s.thoughtTrails ?? [], 'id');

        if (data.profile?.length) {
          const latest = data.profile
            .filter((p: any) => !p.deleted)
            .sort((a: any, b: any) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0];
          if (latest) {
            let profileData = latest.data ?? latest;
            if (typeof profileData === 'string') {
              try { profileData = JSON.parse(profileData); } catch { profileData = {}; }
            }
            patch.userProfile = { ...(s.userProfile ?? {}), ...profileData };
            if (profileData.waterMl !== undefined) patch.waterMl = profileData.waterMl;
            if (profileData.waterGoal !== undefined) patch.waterGoal = profileData.waterGoal;
            if (profileData.weightUnit !== undefined) patch.weightUnit = profileData.weightUnit;
            // Extract piggybacked settings from profile
            const SETTINGS_KEYS = ['calGoal', 'customFoodPresets', 'theme', 'language', 'remindEnabled', 'remindTime', 'customTags', 'customMoods', 'allTagsOrder', 'allMoodsOrder'] as const;
            for (const sk of SETTINGS_KEYS) {
              if (profileData[sk] !== undefined) (patch as any)[sk] = profileData[sk];
            }
          }
        }

        if (Object.keys(patch).length) {
          set(patch);
          if (patch.checkinHistory) get().calculateStreak();
        }
      } catch (err) {
        console.error('[pullServerData] Error:', err);
      }
    },
  });
}
