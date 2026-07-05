// ─── useBarrierTimer — Barrier timer with AppState tracking ──────
// Manages barrier countdown, away time detection, and practice completion.

import { useState, useRef, useCallback, useEffect } from 'react';
import { AppState, Animated } from 'react-native';

/**
 * Options for the {@link useBarrierTimer} hook.
 *
 * @property onComplete - Callback fired when the barrier duration is reached
 *   or when the user skips to the gratitude phase. Receives the barrier
 *   duration in minutes, total away time in minutes, and the list of
 *   completed practice types.
 * @property page - Current navigation page identifier. The timer only runs
 *   when `page` equals `'barrier'`.
 */
export interface UseBarrierTimerOpts {
  /** Called when barrier duration is reached */
  onComplete: (data: { barrierMin: number; awayMin: number; practice: string[] }) => void;
  /** Current page — timer only runs when page === 'barrier' */
  page: string;
}

/**
 * Hook that manages the sleep-barrier countdown timer, app-state-aware
 * "away" time tracking, practice completion logging, and a pulsing glow
 * animation for the countdown circle.
 *
 * The barrier is a mandatory waiting period (default 30 min) the user must
 * sit through before proceeding to the gratitude phase. While the barrier
 * is active the hook:
 *
 * - Increments a 1-second interval tick to track elapsed time.
 * - Listens to React Native `AppState` changes to accumulate time the
 *   user spent away from the app (screen-off, background, inactive).
 * - Drives an infinite `Animated` glow loop so the countdown circle
 *   pulses between 30% and 80% opacity.
 * - Automatically fires `onComplete` once the elapsed time reaches the
 *   configured duration.
 *
 * @param opts - {@link UseBarrierTimerOpts} configuration object.
 * @returns An object containing timer state (duration, elapsed, remaining,
 *   away time), the glow `Animated.Value`, the completed-practice list,
 *   and action callbacks (`startBarrier`, `addPractice`, `skipToGratitude`,
 *   `resetBarrier`).
 */
export function useBarrierTimer(opts: UseBarrierTimerOpts) {
  const { onComplete, page } = opts;

  const [barrierDuration, setBarrierDuration] = useState(30);
  const [barrierElapsed, setBarrierElapsed] = useState(0);
  const [awayMs, setAwayMs] = useState(0);
  const [completedPractice, setCompletedPractice] = useState<string[]>([]);

  const awayStartRef = useRef<number | null>(null);
  const barrierTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);

  // Glow animation
  const glowAnim = useRef(new Animated.Value(0)).current;

  /**
   * Breathing glow animation loop.
   *
   * Runs an infinite `Animated.loop` that fades the glow value from 0 to 1
   * and back over 4 seconds (2 s fade-in, 2 s fade-out). Only active when
   * `page` is `'barrier'`.
   *
   * Side effects: starts/stops an `Animated` loop tied to `glowAnim`.
   * Cleanup: stops the loop on unmount or page change.
   */
  useEffect(() => {
    if (page !== 'barrier') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [page, glowAnim]);

  /**
   * AppState tracking for away-time accumulation.
   *
   * Subscribes to React Native `AppState` change events. When the app
   * transitions from `'active'` to any background/inactive state, the
   * current timestamp is recorded. When it returns to `'active'`, the
   * elapsed time is added to the running `awayMs` total. Only tracks
   * state changes while `page` is `'barrier'`.
   *
   * Side effects: registers an `AppState` event listener.
   * Cleanup: removes the listener on unmount or page change.
   */
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (page !== 'barrier') return;
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (prev === 'active' && nextState !== 'active') {
        awayStartRef.current = Date.now();
      } else if (prev !== 'active' && nextState === 'active') {
        if (awayStartRef.current) {
          setAwayMs(s => s + (Date.now() - awayStartRef.current!));
          awayStartRef.current = null;
        }
      }
    });
    return () => sub.remove();
  }, [page]);

  /**
   * Barrier countdown timer.
   *
   * Starts a 1-second `setInterval` that increments `barrierElapsed` by 1
   * each tick. Only runs when `page` is `'barrier'`; clears itself when
   * the page changes away from barrier.
   *
   * Side effects: creates/clears a `setInterval` stored in `barrierTimerRef`.
   * Cleanup: clears the interval on unmount or page change.
   */
  useEffect(() => {
    if (page !== 'barrier') {
      if (barrierTimerRef.current) { clearInterval(barrierTimerRef.current); barrierTimerRef.current = null; }
      return;
    }
    barrierTimerRef.current = setInterval(() => {
      setBarrierElapsed(s => s + 1);
    }, 1000);
    return () => { if (barrierTimerRef.current) { clearInterval(barrierTimerRef.current); barrierTimerRef.current = null; } };
  }, [page]);

  /**
   * Barrier-completion check.
   *
   * Watches `barrierElapsed` and fires `onComplete` when the elapsed
   * seconds reach or exceed the configured barrier duration (in minutes).
   * Also clears the countdown interval so no further ticks occur.
   *
   * Side effects: clears `barrierTimerRef` interval; fires `onComplete`
   * with the final barrier stats.
   */
  useEffect(() => {
    if (page === 'barrier' && barrierElapsed >= barrierDuration * 60) {
      if (barrierTimerRef.current) { clearInterval(barrierTimerRef.current); barrierTimerRef.current = null; }
      onComplete({ barrierMin: barrierDuration, awayMin: Math.round(awayMs / 60000), practice: completedPractice });
    }
  }, [barrierElapsed, page, barrierDuration, awayMs, completedPractice, onComplete]);

  /**
   * Derived value: seconds remaining before the barrier completes.
   * Clamped to a minimum of 0 to avoid negative display values.
   */
  const remainingSec = Math.max(0, barrierDuration * 60 - barrierElapsed);

  /** Derived value: total away time converted from milliseconds to whole minutes. */
  const awayMin = Math.round(awayMs / 60000);

  /**
   * Start (or restart) a barrier session with the given duration.
   *
   * Resets the elapsed counter, away-time accumulator, and completed-practice
   * list so a fresh countdown begins. The barrier timer `useEffect` will
   * automatically start ticking once `barrierElapsed` resets to 0 while
   * `page === 'barrier'`.
   *
   * @param min - Desired barrier duration in minutes.
   */
  const startBarrier = useCallback((min: number) => {
    setBarrierDuration(min);
    setBarrierElapsed(0);
    setAwayMs(0);
    setCompletedPractice([]);
  }, []);

  /**
   * Record a completed practice type (e.g. "breathing", "meditation").
   *
   * Adds the type to the completed-practice list if it is not already
   * present, preventing duplicates.
   *
   * @param type - A string identifier for the practice the user finished.
   */
  const addPractice = useCallback((type: string) => {
    setCompletedPractice(prev => prev.includes(type) ? prev : [...prev, type]);
  }, []);

  /**
   * Skip the remaining barrier time and jump directly to the gratitude
   * phase.
   *
   * Stops the barrier countdown interval and immediately invokes
   * `onComplete` with the current elapsed time, away minutes, and
   * completed-practice list.
   *
   * Side effects: clears `barrierTimerRef` interval; fires `onComplete`.
   */
  const skipToGratitude = useCallback(() => {
    if (barrierTimerRef.current) { clearInterval(barrierTimerRef.current); barrierTimerRef.current = null; }
    onComplete({ barrierMin: barrierElapsed, awayMin: Math.round(awayMs / 60000), practice: completedPractice });
  }, [barrierElapsed, awayMs, completedPractice, onComplete]);

  /**
   * Reset the barrier elapsed counter and away-time accumulator to zero
   * without changing the configured duration or practice list.
   *
   * Useful when the user wants to restart the countdown from the
   * beginning while keeping the same session context.
   */
  const resetBarrier = useCallback(() => {
    setBarrierElapsed(0);
    setAwayMs(0);
  }, []);

  return {
    barrierDuration,
    barrierElapsed,
    awayMs,
    awayMin,
    remainingSec,
    completedPractice,
    glowAnim,
    // Actions
    startBarrier,
    addPractice,
    skipToGratitude,
    resetBarrier,
  };
}
