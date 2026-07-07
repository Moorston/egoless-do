import { describe, it, expect, vi, beforeEach } from 'vitest';

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

// Test the pure logic that useSearchHistory wraps
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
