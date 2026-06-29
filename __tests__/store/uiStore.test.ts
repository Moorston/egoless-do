// ─── UI Store tests ──────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';

// Mock React Native modules
vi.mock('react-native', () => ({
  AppState: {
    addEventListener: vi.fn(),
  },
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

// Import after mocks
import { useUiStore } from '../../apps/mobile/src/store/uiStore';

describe('UI Store', () => {
  beforeEach(() => {
    // Reset store state
    useUiStore.setState({
      modals: {},
      loading: {},
      theme: 'light',
      language: 'zh',
      toast: null,
    });
  });

  describe('Modal management', () => {
    it('shows modal', () => {
      useUiStore.getState().showModal('test', { data: 'value' });
      const state = useUiStore.getState();
      expect(state.modals.test).toEqual({
        visible: true,
        type: 'test',
        data: { data: 'value' },
      });
    });

    it('hides modal', () => {
      useUiStore.getState().showModal('test');
      useUiStore.getState().hideModal('test');
      const state = useUiStore.getState();
      expect(state.modals.test.visible).toBe(false);
    });

    it('hides all modals', () => {
      useUiStore.getState().showModal('modal1');
      useUiStore.getState().showModal('modal2');
      useUiStore.getState().hideAllModals();
      const state = useUiStore.getState();
      expect(state.modals.modal1.visible).toBe(false);
      expect(state.modals.modal2.visible).toBe(false);
    });
  });

  describe('Loading states', () => {
    it('sets loading state', () => {
      useUiStore.getState().setLoading('fetch', true);
      expect(useUiStore.getState().loading.fetch).toBe(true);
    });

    it('clears loading state', () => {
      useUiStore.getState().setLoading('fetch', true);
      useUiStore.getState().setLoading('fetch', false);
      expect(useUiStore.getState().loading.fetch).toBe(false);
    });
  });

  describe('Theme', () => {
    it('sets theme', () => {
      useUiStore.getState().setTheme('dark');
      expect(useUiStore.getState().theme).toBe('dark');
    });
  });

  describe('Language', () => {
    it('sets language', () => {
      useUiStore.getState().setLanguage('en');
      expect(useUiStore.getState().language).toBe('en');
    });
  });

  describe('Toast', () => {
    it('shows toast', () => {
      useUiStore.getState().showToast('Success!', 'success');
      expect(useUiStore.getState().toast).toEqual({
        message: 'Success!',
        type: 'success',
      });
    });

    it('hides toast', () => {
      useUiStore.getState().showToast('Test');
      useUiStore.getState().hideToast();
      expect(useUiStore.getState().toast).toBeNull();
    });
  });
});
