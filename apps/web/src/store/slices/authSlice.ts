import type { StateCreator } from 'zustand';
import type { AuthState } from '@egoless-do/core';
import { defaultAuthState, apiLogin, apiRegister, apiLogout, apiRefreshToken, apiSyncPull } from '@egoless-do/core';
import type { WebStore } from '../useWebStore';
import { triggerSync } from '../../db/syncService';

export interface AuthSlice {
  auth: AuthState;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, code: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  pullServerData: (token?: string) => Promise<void>;
}

export const createAuthSlice: StateCreator<WebStore, [], [], AuthSlice> = (set, get) => ({
  auth: defaultAuthState,

  async login(email, password) {
    set({ auth: { ...get().auth, isLoading: true } });
    try {
      const res = await apiLogin(email, password);
      console.log('[Login] API response:', res);
      
      set({ auth: { user: res.user, token: res.token, refreshToken: res.refreshToken, isSignedIn: true, isLoading: false, expiresAt: res.expiresAt } });
      
      console.log('[Login] Pulling server data...');
      await get().pullServerData(res.token);
      // Push any pending local changes to server, then pull again
      triggerSync().catch(() => {});
      console.log('[Login] Data pull complete');
    } catch (e) {
      set({ auth: { ...get().auth, isLoading: false } });
      throw e;
    }
  },

  async register(email, password, name, code) {
    set({ auth: { ...get().auth, isLoading: true } });
    try {
      const res = await apiRegister(email, password, name, code);
      set({ auth: { user: res.user, token: res.token, refreshToken: res.refreshToken, isSignedIn: true, isLoading: false, expiresAt: res.expiresAt } });
      await get().pullServerData(res.token);
      triggerSync().catch(() => {});
    } catch (e) {
      set({ auth: { ...get().auth, isLoading: false } });
      throw e;
    }
  },

  logout() {
    const { auth } = get();
    if (auth.token && auth.refreshToken) {
      apiLogout(auth.token, auth.refreshToken).catch((e) => console.error('[err]', e));
    }
    set({ auth: defaultAuthState });
  },

  async refreshAuth() {
    const { auth } = get();
    if (!auth.refreshToken) return;
    try {
      const res = await apiRefreshToken(auth.refreshToken);
      set({ auth: { ...auth, token: res.token, refreshToken: res.refreshToken, expiresAt: res.expiresAt } });
    } catch {
      set({ auth: defaultAuthState });
    }
  },

  async pullServerData(tokenOverride) {
    const token = tokenOverride ?? get().auth.token;
    if (!token) return;
    try {
      const result = await apiSyncPull(token);
      console.log('[pullServerData] API response:', result);
      
      if (!result.data) {
        console.log('[pullServerData] No data returned');
        return;
      }
      
      const data = result.data;
      const s = get();
      const patch: Record<string, unknown> = {};

      // Merge helper: combine server + local arrays, dedup by id/date, keep newest
      const merge = <T extends Record<string, any>>(server: T[], local: T[], idKey: string): T[] => {
        if (!server.length) return local;
        if (!local.length) return server;
        const map = new Map<string, T>();
        for (const item of local) map.set(item[idKey], item);
        for (const item of server) {
          const key = item[idKey];
          const existing = map.get(key);
          if (!existing || (item.updatedAt ?? 0) >= (existing.updatedAt ?? 0)) {
            map.set(key, item);
          }
        }
        return Array.from(map.values());
      };

      if (data.habit)      patch.habits = merge(data.habit, s.habits, 'id');
      if (data.reflection) patch.reflections = merge(data.reflection, s.reflections, 'id');
      if (data.fasting)    patch.fastingHistory = merge(data.fasting, s.fastingHistory, 'id');
      if (data.food)       patch.foodLog = merge(data.food, s.foodLog, 'id');
      if (data.checkin)    patch.checkinHistory = merge(data.checkin, s.checkinHistory, 'date');
      if (data.exercise)   patch.exerciseLog = merge(data.exercise, s.exerciseLog, 'id');
      
      console.log('[pullServerData] Patch to apply:', patch);
      
      if (Object.keys(patch).length) {
        set(patch as Partial<WebStore>);
        // Recalculate streak after merging checkinHistory
        if (patch.checkinHistory) get().calculateStreak();
      }
    } catch (err) {
      console.error('[pullServerData] Error:', err);
    }
  },
});
