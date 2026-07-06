// ─── UI Store ────────────────────────────────────────────────────
// Manages UI-specific state: modals, loading, theme, etc.
// Note: theme & language defaults are replaced by main store's SQLite
//       settings after initApp() runs on startup.

import { create } from 'zustand';

export interface ModalState {
  visible: boolean;
  type?: string;
  data?: unknown;
}

export interface UiStore {
  // Modal states
  modals: Record<string, ModalState>;
  showModal: (type: string, data?: unknown) => void;
  hideModal: (type: string) => void;
  hideAllModals: () => void;

  // Loading states
  loading: Record<string, boolean>;
  setLoading: (key: string, loading: boolean) => void;

  // Theme
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;

  // Language
  language: string;
  setLanguage: (language: string) => void;

  // Toast/Notification
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
}

export const useUiStore = create<UiStore>()(
  (set, get) => ({
    // Modal states
    modals: {},
    showModal: (type, data) =>
      set((state) => ({
        modals: {
          ...state.modals,
          [type]: { visible: true, type, data },
        },
      })),
    hideModal: (type) =>
      set((state) => ({
        modals: {
          ...state.modals,
          [type]: { ...state.modals[type], visible: false },
        },
      })),
    hideAllModals: () =>
      set((state) => ({
        modals: Object.fromEntries(
          Object.entries(state.modals).map(([key, modal]) => [
            key,
            { ...modal, visible: false },
          ])
        ),
      })),

    // Loading states
    loading: {},
    setLoading: (key, loading) =>
      set((state) => ({
        loading: { ...state.loading, [key]: loading },
      })),

    // Theme
    theme: 'light',
    setTheme: (theme) => set({ theme }),

    // Language
    language: 'zh',
    setLanguage: (language) => set({ language }),

    // Toast
    toast: null,
    showToast: (message, type = 'info') => set({ toast: { message, type } }),
    hideToast: () => set({ toast: null }),
  })
);
