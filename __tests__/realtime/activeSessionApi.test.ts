// ─── Realtime transport tests (polling-based) ───────────────────
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock the entire activeSessionApi module's pbRequest to control fetch behavior
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockFetchResponse(items: unknown[]) {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ items }),
  });
}

import {
  subscribeSessions,
  getConnectionState,
  onConnectionStateChange,
} from '../../apps/mobile/src/features/global-pulse/services/activeSessionApi';

const makeSession = (id: string, overrides?: Record<string, unknown>) => ({
  session_id: id,
  user_hash: `hash-${id}`,
  nickname: '',
  type: 'exercise',
  started_at: '2026-06-26T10:00:00Z',
  last_heartbeat: '2026-06-26T10:00:00Z',
  ...overrides,
});

describe('Realtime Transport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper: advance fake timers and flush microtasks
  async function tick(ms: number) {
    await vi.advanceTimersByTimeAsync(ms);
  }

  it('polls active sessions on subscribe', async () => {
    mockFetchResponse([]);
    const unsubscribe = subscribeSessions({});
    // The initial poll() is fire-and-forget; advance timers to let it complete
    await tick(0);
    await tick(100); // extra flush for microtasks

    expect(mockFetch).toHaveBeenCalled();
    unsubscribe();
  });

  it('calls onCreate when new session appears', async () => {
    mockFetchResponse([]);
    const onCreate = vi.fn();
    const unsubscribe = subscribeSessions({ onCreate });
    await tick(0);

    // Next poll returns a new session
    mockFetchResponse([makeSession('s1')]);
    await tick(15_000);

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ session_id: 's1', user_hash: 'hash-s1' }),
    );
    unsubscribe();
  });

  it('calls onDelete when session disappears', async () => {
    mockFetchResponse([makeSession('s1')]);
    const onDelete = vi.fn();
    const unsubscribe = subscribeSessions({ onDelete });
    await tick(0);

    // Next poll returns empty
    mockFetchResponse([]);
    await tick(15_000);

    expect(onDelete).toHaveBeenCalledWith('s1');
    unsubscribe();
  });

  it('calls onUpdate when session data changes', async () => {
    mockFetchResponse([makeSession('s1', { last_heartbeat: '2026-06-26T10:00:00Z' })]);
    const onUpdate = vi.fn();
    const unsubscribe = subscribeSessions({ onUpdate });
    await tick(0);

    // Next poll returns updated heartbeat
    mockFetchResponse([makeSession('s1', { last_heartbeat: '2026-06-26T10:01:00Z' })]);
    await tick(15_000);

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ session_id: 's1', last_heartbeat: '2026-06-26T10:01:00Z' }),
    );
    unsubscribe();
  });

  it('stops polling on unsubscribe', async () => {
    mockFetchResponse([]);
    const unsubscribe = subscribeSessions({});
    await tick(0);
    const callCount = mockFetch.mock.calls.length;

    unsubscribe();
    await tick(30_000);

    // No additional fetch calls after unsubscribe
    expect(mockFetch.mock.calls.length).toBe(callCount);
  });

  it('sets connection state correctly', async () => {
    mockFetchResponse([]);
    const states: string[] = [];
    const unsubState = onConnectionStateChange(s => states.push(s));

    const unsubscribe = subscribeSessions({});
    await tick(0);

    expect(states).toContain('connecting');
    expect(states).toContain('connected');

    unsubscribe();
    unsubState();
  });

  it('ignores events after unsubscribe', async () => {
    mockFetchResponse([]);
    const onCreate = vi.fn();
    const unsubscribe = subscribeSessions({ onCreate });
    await tick(0);
    unsubscribe();

    // Poll returns data after unsubscribe
    mockFetchResponse([makeSession('s1')]);
    await tick(15_000);

    expect(onCreate).not.toHaveBeenCalled();
  });

  it('getConnectionState returns valid state', () => {
    const state = getConnectionState();
    expect(['idle', 'connecting', 'connected', 'disconnected']).toContain(state);
  });
});
