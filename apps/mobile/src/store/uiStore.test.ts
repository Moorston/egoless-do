import { vi, describe, it, expect, beforeEach } from 'vitest';

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
import { useUiStore } from './uiStore';

describe('useUiStore', () => {
  beforeEach(() => {
    useUiStore.setState({
      modals: {},
      loading: {},
      theme: 'light',
      language: 'zh',
      toast: null,
    });
  });

  it('initializes with default state', () => {
    const state = useUiStore.getState();
    expect(state.modals).toEqual({});
    expect(state.loading).toEqual({});
    expect(state.theme).toBe('light');
    expect(state.language).toBe('zh');
    expect(state.toast).toBeNull();
  });

  it('showModal shows a modal', () => {
    useUiStore.getState().showModal('test', { foo: 'bar' });
    const state = useUiStore.getState();
    expect(state.modals['test']).toEqual({ visible: true, type: 'test', data: { foo: 'bar' } });
  });

  it('hideModal hides a modal', () => {
    useUiStore.getState().showModal('test');
    useUiStore.getState().hideModal('test');
    const state = useUiStore.getState();
    expect(state.modals['test'].visible).toBe(false);
  });

  it('hideAllModals hides all modals', () => {
    useUiStore.getState().showModal('modal1');
    useUiStore.getState().showModal('modal2');
    useUiStore.getState().hideAllModals();
    const state = useUiStore.getState();
    expect(state.modals['modal1'].visible).toBe(false);
    expect(state.modals['modal2'].visible).toBe(false);
  });

  it('setLoading sets loading state', () => {
    useUiStore.getState().setLoading('sync', true);
    expect(useUiStore.getState().loading['sync']).toBe(true);
    useUiStore.getState().setLoading('sync', false);
    expect(useUiStore.getState().loading['sync']).toBe(false);
  });

  it('setTheme changes theme', () => {
    useUiStore.getState().setTheme('dark');
    expect(useUiStore.getState().theme).toBe('dark');
  });

  it('setLanguage changes language', () => {
    useUiStore.getState().setLanguage('en');
    expect(useUiStore.getState().language).toBe('en');
  });

  it('showToast shows a toast', () => {
    useUiStore.getState().showToast('Hello', 'success');
    expect(useUiStore.getState().toast).toEqual({ message: 'Hello', type: 'success' });
  });

  it('hideToast hides the toast', () => {
    useUiStore.getState().showToast('Hello');
    useUiStore.getState().hideToast();
    expect(useUiStore.getState().toast).toBeNull();
  });
});

// ─── Reset State Wrapper ──────────────────────────────────────────
describe('useUiStore reset', () => {
  beforeEach(() => {
    useUiStore.setState({
      modals: {},
      loading: {},
      theme: 'light',
      language: 'zh',
      toast: null,
    });
  });

  it('resets all state to defaults on setState({})', () => {
    useUiStore.getState().showModal('test');
    useUiStore.getState().setTheme('dark');
    useUiStore.setState({
      modals: {},
      loading: {},
      theme: 'light',
      language: 'zh',
      toast: null,
    });
    const state = useUiStore.getState();
    expect(state.modals).toEqual({});
    expect(state.theme).toBe('light');
  });
});
