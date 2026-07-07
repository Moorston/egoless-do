import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { type MutableRefObject } from 'react';
import TestRenderer, { act } from 'react-test-renderer';

// @ts-expect-error — React Native global not available in test env
globalThis.__DEV__ = false;

const mockGetItem = vi.fn().mockResolvedValue(null);
const mockSetItem = vi.fn().mockResolvedValue(undefined);

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: mockGetItem, setItem: mockSetItem },
}));

vi.mock('@egoless-do/core', () => ({
  createLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}));

// Minimal renderHook — mirrors @testing-library/react-hooks API
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderHook<T>(hookFn: () => T): { result: MutableRefObject<T>; unmount: () => void } {
  const result = { current: undefined as unknown as T } as MutableRefObject<T>;

  function TestComponent() {
    result.current = hookFn();
    return null;
  }

  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(TestComponent));
  });

  return {
    result,
    unmount: () => {
      act(() => {
        renderer.unmount();
      });
    },
  };
}

// ─── Pure-logic tests (original) ─────────────────────────────────────────────
describe('useSearchHistory logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
  });

  it('loads history from AsyncStorage', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify(['q1', 'q2']));
    const raw = await mockGetItem('quickTrailSearchHistory');
    const history = JSON.parse(raw);
    expect(history).toEqual(['q1', 'q2']);
  });

  it('adds new query to front of history', () => {
    const existing: string[] = ['old1', 'old2'];
    const query = 'new';
    const next = [query, ...existing.filter(h => h !== query)].slice(0, 10);
    expect(next).toEqual(['new', 'old1', 'old2']);
  });

  it('deduplicates existing query on add', () => {
    const existing = ['a', 'b', 'c'];
    const query = 'b';
    const next = [query, ...existing.filter(h => h !== query)].slice(0, 10);
    expect(next).toEqual(['b', 'a', 'c']);
    expect(next.filter(q => q === 'b')).toHaveLength(1);
  });

  it('caps history at 10 entries', () => {
    const existing = Array.from({ length: 10 }, (_, i) => `q${i}`);
    const next = ['new', ...existing.filter(h => h !== 'new')].slice(0, 10);
    expect(next).toHaveLength(10);
    expect(next[0]).toBe('new');
    expect(next).not.toContain('q9'); // oldest dropped
  });

  it('handles empty history', () => {
    const existing: string[] = [];
    const next = ['first', ...existing.filter(h => h !== 'first')].slice(0, 10);
    expect(next).toEqual(['first']);
  });

  it('handles corrupted AsyncStorage data gracefully', async () => {
    mockGetItem.mockResolvedValue('not valid json');
    const raw = await mockGetItem('quickTrailSearchHistory');
    expect(() => JSON.parse(raw)).toThrow();
    // In the real hook, this is caught by try/catch
  });

  it('persists to AsyncStorage with correct key', async () => {
    const next = ['query'];
    await mockSetItem('quickTrailSearchHistory', JSON.stringify(next));
    expect(mockSetItem).toHaveBeenCalledWith('quickTrailSearchHistory', JSON.stringify(['query']));
  });
});

// ─── Hook-level tests via renderHook ─────────────────────────────────────────
describe('useSearchHistory hook', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let useSearchHistory: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
    // Dynamic import ensures mocks are in place before the hook module loads
    const hookModule = await import('./useSearchHistory');
    useSearchHistory = hookModule.useSearchHistory;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads history from AsyncStorage on mount', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify(['saved-query']));

    const { result } = renderHook(() => useSearchHistory());

    // useEffect fires after mount; getItem should have been called
    expect(mockGetItem).toHaveBeenCalledWith('quickTrailSearchHistory');

    // Flush the async .then() inside useEffect
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.searchHistory).toEqual(['saved-query']);
  });

  it('addToHistory triggers setItem and updates state', () => {
    const { result } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.addToHistory('my-query');
    });

    expect(result.current.searchHistory).toEqual(['my-query']);
    expect(mockSetItem).toHaveBeenCalledWith(
      'quickTrailSearchHistory',
      JSON.stringify(['my-query']),
    );
  });

  it('handles empty string as a valid query', () => {
    const { result } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.addToHistory('');
    });

    // Empty string is still a string — the hook does not filter it out
    expect(result.current.searchHistory).toEqual(['']);
    expect(mockSetItem).toHaveBeenCalledWith(
      'quickTrailSearchHistory',
      JSON.stringify(['']),
    );
  });

  it('deduplicates and promotes an existing query via hook', async () => {
    // Pre-populate storage with two entries
    mockGetItem.mockResolvedValue(JSON.stringify(['alpha', 'beta']));

    const { result } = renderHook(() => useSearchHistory());

    // Wait for mount effect to resolve
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.searchHistory).toEqual(['alpha', 'beta']);

    // Re-add 'beta' — should move to front without duplication
    act(() => {
      result.current.addToHistory('beta');
    });

    expect(result.current.searchHistory).toEqual(['beta', 'alpha']);
    expect(result.current.searchHistory.filter((q: string) => q === 'beta')).toHaveLength(1);
  });

  it('caps persisted history at MAX_HISTORY (10)', () => {
    const { result } = renderHook(() => useSearchHistory());

    // Add 11 distinct queries
    act(() => {
      for (let i = 0; i < 11; i++) {
        result.current.addToHistory(`q${i}`);
      }
    });

    expect(result.current.searchHistory).toHaveLength(10);
    // Most recent is first
    expect(result.current.searchHistory[0]).toBe('q10');
    // Oldest ('q0') should be dropped
    expect(result.current.searchHistory).not.toContain('q0');
  });
});
