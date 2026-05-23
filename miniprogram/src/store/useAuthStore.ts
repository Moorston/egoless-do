import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Taro from '@tarojs/taro';
import { apiLogin, apiRegister, apiWechatLogin, apiLogout, apiRefreshToken, apiSyncPull, setApiBase, type AuthState, defaultAuthState } from '../core';
import { useStore } from '../utils/store';

setApiBase('https://your-domain.com');

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, code: string) => Promise<void>;
  wechatLogin: (code: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  pullServerData: (token?: string) => Promise<void>;
  checkAuthExpiry: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...defaultAuthState,

      async login(email, password) {
        set({ isLoading: true });
        try {
          const res = await apiLogin(email, password);
          set({ user: res.user, token: res.token, refreshToken: res.refreshToken, isSignedIn: true, isLoading: false, expiresAt: res.expiresAt });
          await get().pullServerData(res.token);
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },

      async register(email, password, name, code) {
        set({ isLoading: true });
        try {
          const res = await apiRegister(email, password, name, code);
          set({ user: res.user, token: res.token, refreshToken: res.refreshToken, isSignedIn: true, isLoading: false, expiresAt: res.expiresAt });
          await get().pullServerData(res.token);
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },

      async wechatLogin(code) {
        set({ isLoading: true });
        try {
          const res = await apiWechatLogin(code);
          set({ user: res.user, token: res.token, refreshToken: res.refreshToken, isSignedIn: true, isLoading: false, expiresAt: res.expiresAt });
          await get().pullServerData(res.token);
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },

      logout() {
        const { token, refreshToken } = get();
        if (token && refreshToken) apiLogout(token, refreshToken).catch((e) => console.error('[err]', e));
        set({ ...defaultAuthState });
      },

      async refreshAuth() {
        const { refreshToken } = get();
        if (!refreshToken) return;
        try {
          const res = await apiRefreshToken(refreshToken);
          set({ token: res.token, refreshToken: res.refreshToken, expiresAt: res.expiresAt });
        } catch {
          set({ ...defaultAuthState });
        }
      },

      checkAuthExpiry() {
        const { isSignedIn, expiresAt } = get();
        if (!isSignedIn) return;
        if (!expiresAt || expiresAt < Date.now()) {
          get().refreshAuth().catch(() => get().logout());
        } else if (expiresAt - Date.now() < 3600000) {
          get().refreshAuth().catch((e) => console.error('[err]', e));
        }
      },

      async pullServerData(tokenOverride) {
        const token = tokenOverride ?? get().token;
        if (!token) return;
        try {
          const { data } = await apiSyncPull(token);
          if (data) {
            // 将服务端数据存入本地存储，供页面读取
            Taro.setStorageSync('egoless-server-data', data);
            // 回写到 Zustand store
            useStore.getState().hydrateFromServer(data);
          }
        } catch {
          // 拉取失败不阻断登录流程
        }
      },
    }),
    {
      name: 'egoless-auth',
      storage: createJSONStorage(() => ({
        getItem: (key: string) => Taro.getStorageSync(key) || null,
        setItem: (key: string, value: string) => Taro.setStorageSync(key, value),
        removeItem: (key: string) => Taro.removeStorageSync(key),
      })),
    }
  )
);
