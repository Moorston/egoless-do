import type { StateCreator } from 'zustand';
import type { AuthState } from '../types';
import { defaultAuthState } from '../types';
import {
  apiLogin, apiRegister, apiLogout, apiRefreshToken, apiSyncPull,
  mergeById, calculateCheckinStreak,
} from '../';
import type { StorageAdapter } from './storageAdapter';
import type { AuthSlice } from './types';

export function createAuthSlice<S extends AuthSlice>(
  adapter: StorageAdapter,
  onSyncTrigger: () => void,
): StateCreator<S, [], [], AuthSlice> {
  return (set, get) => ({
    auth: defaultAuthState,

    async login(email: string, password: string) {
      set({ auth: { ...(get() as any).auth, isLoading: true } } as any);
      try {
        const res = await apiLogin(email, password);
        set({
          auth: {
            user: res.user, token: res.token, refreshToken: res.refreshToken,
            isSignedIn: true, isLoading: false, expiresAt: res.expiresAt,
          },
        } as any);
        await (get() as any).pullServerData(res.token);
        onSyncTrigger();
      } catch (e) {
        set({ auth: { ...(get() as any).auth, isLoading: false } } as any);
        throw e;
      }
    },

    async register(email: string, password: string, name: string, code: string) {
      set({ auth: { ...(get() as any).auth, isLoading: true } } as any);
      try {
        const res = await apiRegister(email, password, name, code);
        set({
          auth: {
            user: res.user, token: res.token, refreshToken: res.refreshToken,
            isSignedIn: true, isLoading: false, expiresAt: res.expiresAt,
          },
        } as any);
        await (get() as any).pullServerData(res.token);
        onSyncTrigger();
      } catch (e) {
        set({ auth: { ...(get() as any).auth, isLoading: false } } as any);
        throw e;
      }
    },

    logout() {
      const { auth } = get() as any;
      if (auth.token && auth.refreshToken) {
        apiLogout(auth.token, auth.refreshToken).catch((e: unknown) => console.error('[err]', e));
      }
      set({ auth: defaultAuthState } as any);
    },

    async refreshAuth() {
      const { auth } = get() as any;
      if (!auth.refreshToken) return;
      try {
        const res = await apiRefreshToken(auth.refreshToken);
        set({ auth: { ...auth, token: res.token, refreshToken: res.refreshToken, expiresAt: res.expiresAt } } as any);
      } catch {
        set({ auth: defaultAuthState } as any);
      }
    },

    async pullServerData(tokenOverride?: string) {
      const token = tokenOverride ?? (get() as any).auth.token;
      if (!token) return;
      try {
        const result = await apiSyncPull(token);
        if (!result.data) return;
        const data = result.data;
        const s = get() as any;
        const patch: Record<string, unknown> = {};

        if (data.habit)      patch.habits = mergeById(data.habit, s.habits ?? [], 'id');
        if (data.reflection) patch.reflections = mergeById(data.reflection, s.reflections ?? [], 'id');
        if (data.fasting)    patch.fastingHistory = mergeById(data.fasting, s.fastingHistory ?? [], 'id');
        if (data.food)       patch.foodLog = mergeById(data.food, s.foodLog ?? [], 'id');
        if (data.checkin)    patch.checkinHistory = mergeById(data.checkin, s.checkinHistory ?? [], 'date');
        if (data.exercise)   patch.exerciseLog = mergeById(data.exercise, s.exerciseLog ?? [], 'id');

        if (data.profile?.length) {
          const latest = data.profile
            .filter((p: any) => !p.deleted)
            .sort((a: any, b: any) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0];
          if (latest) {
            const profileData = latest.data ?? latest;
            patch.userProfile = { ...(s.userProfile ?? {}), ...profileData };
            if (profileData.waterMl !== undefined) patch.waterMl = profileData.waterMl;
            if (profileData.waterGoal !== undefined) patch.waterGoal = profileData.waterGoal;
          }
        }

        if (Object.keys(patch).length) {
          set(patch as any);
          if (patch.checkinHistory) (get() as any).calculateStreak();
        }
      } catch (err) {
        console.error('[pullServerData] Error:', err);
      }
    },
  });
}
