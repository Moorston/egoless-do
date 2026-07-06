// ─── useGlobalTick unit tests ────────────────────────────────────
// Tests the shared tick store logic (without React hooks).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Extract the TickStore class for testing
class TickStore {
  private _listeners = new Set<() => void>();
  private _tick = 0;
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _intervalMs: number;

  constructor(intervalMs: number) {
    this._intervalMs = intervalMs;
  }

  getSnapshot = (): number => this._tick;

  subscribe = (listener: () => void): (() => void) => {
    this._listeners.add(listener);
    if (this._listeners.size === 1 && !this._timer) {
      this._timer = setInterval(() => {
        this._tick++;
        this._listeners.forEach(l => l());
      }, this._intervalMs);
    }
    return () => {
      this._listeners.delete(listener);
      if (this._listeners.size === 0 && this._timer) {
        clearInterval(this._timer);
        this._timer = null;
      }
    };
  };
}

describe('TickStore (useGlobalTick internals)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts at tick 0', () => {
    const store = new TickStore(1000);
    expect(store.getSnapshot()).toBe(0);
  });

  it('increments tick on interval', () => {
    const store = new TickStore(1000);
    const listener = vi.fn();
    store.subscribe(listener);

    vi.advanceTimersByTime(1000);
    expect(store.getSnapshot()).toBe(1);
    expect(listener).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2000);
    expect(store.getSnapshot()).toBe(3);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('notifies all subscribers', () => {
    const store = new TickStore(1000);
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    store.subscribe(listener1);
    store.subscribe(listener2);

    vi.advanceTimersByTime(1000);
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
  });

  it('stops timer when all subscribers unsubscribe', () => {
    const store = new TickStore(1000);
    const listener = vi.fn();
    const unsub = store.subscribe(listener);

    vi.advanceTimersByTime(1000);
    expect(store.getSnapshot()).toBe(1);

    unsub();
    vi.advanceTimersByTime(5000);
    // Tick should still be 1 — timer was stopped
    expect(store.getSnapshot()).toBe(1);
    // Listener should not have been called after unsub
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('restarts timer when a new subscriber joins after all left', () => {
    const store = new TickStore(1000);
    const listener1 = vi.fn();
    const unsub1 = store.subscribe(listener1);

    vi.advanceTimersByTime(1000);
    expect(store.getSnapshot()).toBe(1);

    unsub1();
    vi.advanceTimersByTime(5000);
    expect(store.getSnapshot()).toBe(1);

    // Re-subscribe
    const listener2 = vi.fn();
    store.subscribe(listener2);

    vi.advanceTimersByTime(1000);
    expect(store.getSnapshot()).toBe(2);
    expect(listener2).toHaveBeenCalledTimes(1);
  });

  it('partial unsubscribe keeps timer running', () => {
    const store = new TickStore(1000);
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    const unsub1 = store.subscribe(listener1);
    store.subscribe(listener2);

    unsub1(); // Remove listener1, listener2 still subscribed
    vi.advanceTimersByTime(1000);
    expect(store.getSnapshot()).toBe(1);
    expect(listener2).toHaveBeenCalledTimes(1);
  });
});
