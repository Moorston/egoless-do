import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// @ts-expect-error — React Native global not available in test env
globalThis.__DEV__ = false;

const { FakeEventSource, FakeEventSourceCtor } = vi.hoisted(() => {
  const FakeEventSourceCtor = vi.fn();
  class FakeEventSource {
    static OPEN = 1;
    readyState = 1;
    addEventListener = vi.fn();
    close = vi.fn();
    constructor(url: string, opts?: unknown) {
      FakeEventSourceCtor(url, opts);
    }
  }
  return { FakeEventSource, FakeEventSourceCtor };
});

vi.mock('react-native-sse', () => ({ default: FakeEventSource }));

vi.mock('@egoless-do/core', () => ({
  createLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
  SYNC_ENTITIES: ['habit'] as unknown as string[],
  SCHEMAS: { habit: { pocketbase: { collection: 'habits' } } } as unknown as Record<string, unknown>,
}));

import { RealtimeAgent } from './RealtimeAgent';

describe('RealtimeAgent', () => {
  let agent: RealtimeAgent;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    agent = new RealtimeAgent();
  });

  afterEach(() => {
    agent.disconnect();
    vi.useRealTimers();
  });

  it('_getToken returns the stored token, not a stale provider closure', () => {
    // provider is permanently bound to the initial token
    agent.connect('http://pb', 'initial', () => 'initial');
    expect((agent as unknown as { _getToken(): string | null })._getToken()).toBe('initial');

    // updateToken must take effect even though the provider still returns 'initial'
    agent.updateToken('refreshed');
    expect((agent as unknown as { _getToken(): string | null })._getToken()).toBe('refreshed');
  });

  it('_getToken returns null when no token is available', () => {
    agent.connect('http://pb', '', () => '');
    expect((agent as unknown as { _getToken(): string | null })._getToken()).toBeNull();
  });

  it('_open bails without creating an EventSource when token is missing', () => {
    FakeEventSourceCtor.mockClear();
    agent.connect('http://pb', '', () => '');
    expect(FakeEventSourceCtor).not.toHaveBeenCalled();
  });

  it('_open creates an EventSource with the token when present', () => {
    FakeEventSourceCtor.mockClear();
    agent.connect('http://pb', 'goodtoken');
    expect(FakeEventSourceCtor).toHaveBeenCalledTimes(1);
    expect(FakeEventSourceCtor).toHaveBeenCalledWith(
      'http://pb/api/realtime',
      expect.objectContaining({ headers: { Authorization: 'Bearer goodtoken' } }),
    );
  });
});
