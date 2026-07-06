// ─── Shared global tick hook ────────────────────────────────────
// A single shared timer that all time-display components subscribe to.
// Eliminates N separate setInterval calls per mounted component.

import { useSyncExternalStore, useCallback } from 'react';

type Listener = () => void;

class TickStore {
  private _listeners = new Set<Listener>();
  private _tick = 0;
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _intervalMs: number;

  constructor(intervalMs: number) {
    this._intervalMs = intervalMs;
  }

  getSnapshot = (): number => this._tick;

  subscribe = (listener: Listener): (() => void) => {
    this._listeners.add(listener);

    // Start timer on first subscriber
    if (this._listeners.size === 1 && !this._timer) {
      this._timer = setInterval(() => {
        this._tick++;
        this._listeners.forEach(l => l());
      }, this._intervalMs);
    }

    return () => {
      this._listeners.delete(listener);
      // Stop timer when no subscribers remain
      if (this._listeners.size === 0 && this._timer) {
        clearInterval(this._timer);
        this._timer = null;
      }
    };
  };
}

// Shared singleton instances — created once, reused across mounts
const tickStore1s = new TickStore(1000);
const tickStore5s = new TickStore(5000);
const tickStore1m = new TickStore(60_000);

const STORES: Record<number, TickStore> = {
  1000: tickStore1s,
  5000: tickStore5s,
  60000: tickStore1m,
};

/**
 * Subscribe to a shared global tick at the given interval.
 * Returns the current tick count (incremented each interval).
 *
 * All components sharing the same `ms` value share a single timer.
 * The timer starts when the first subscriber mounts and stops
 * when the last subscriber unmounts.
 *
 * @param ms - Tick interval in milliseconds (1000, 5000, or 60000)
 * @returns Current tick count (use for triggering re-renders or elapsed calculations)
 *
 * @example
 * // In a component that displays elapsed time:
 * const tick = useGlobalTick(1000);
 * // tick changes every 1s, triggering a re-render
 */
export function useGlobalTick(ms: number = 1000): number {
  let store = STORES[ms];
  if (!store) {
    if (__DEV__) console.warn(`useGlobalTick: unsupported interval ${ms}ms, falling back to 1s`);
    store = tickStore1s;
  }
  const getSnapshot = useCallback(() => store.getSnapshot(), [store]);
  const subscribe = useCallback((listener: Listener) => store.subscribe(listener), [store]);
  return useSyncExternalStore(subscribe, getSnapshot);
}
