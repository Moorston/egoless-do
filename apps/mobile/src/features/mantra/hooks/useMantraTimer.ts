// ─── useMantraTimer — Mantra chanting timer and counter logic ────
// Extracted from MantraEngine.tsx for testability and separation of concerns.

import { useState, useRef, useCallback, useEffect } from 'react';
import type { MantraDef } from '@egoless-do/core';

/** Number of beads per round in a traditional mala (prayer beads). */
const BEAD_COUNT = 108;

/**
 * Configuration options for the {@link useMantraTimer} hook.
 */
export interface UseMantraTimerOpts {
  /** Total rounds target (each round = 108 beads) */
  targetRounds: number;
  /**
   * Called when session ends with all session data.
   * Receives an object containing mantra ID, count, rounds, duration, timestamps, and target.
   */
  onEndSession: (data: {
    mantraId: string;
    count: number;
    rounds: number;
    durationSec: number;
    startedAt: number;
    completedAt: number;
    targetRounds: number;
  }) => void;
  /** Called to stop audio playback when the session is paused, ended, or reset. */
  onStopAudio: () => void;
}

/**
 * Custom React hook that manages the state and logic for a mantra chanting session.
 *
 * Tracks the chant count (bead-by-bead), elapsed time (with pause support),
 * pause/resume state, and provides actions to start, increment, decrement,
 * toggle pause, end, and reset the session.
 *
 * The elapsed timer runs via `setInterval` and automatically subtracts paused
 * durations so the reported active time excludes pauses.
 *
 * @param opts - Configuration options including target rounds and callbacks.
 * @returns An object containing reactive state (`count`, `elapsed`, `isPaused`),
 *   constants (`BEAD_COUNT`, `startTime`), and action functions (`start`, `increment`,
 *   `decrement`, `togglePause`, `end`, `reset`).
 */
export function useMantraTimer(opts: UseMantraTimerOpts) {
  const { targetRounds, onEndSession, onStopAudio } = opts;

  // ── State ──────────────────────────────────────────────────────────
  /** Current bead count (reactive, triggers re-render). */
  const [count, setCount] = useState(0);
  /** Mutable ref mirror of count for use in callbacks without stale closures. */
  const countRef = useRef(0);
  /** Elapsed time in milliseconds (reactive, triggers re-render). */
  const [elapsed, setElapsed] = useState(0);
  /** Mutable ref mirror of elapsed for use in callbacks without stale closures. */
  const elapsedRef = useRef(0);
  /** Whether the session is currently paused. */
  const [isPaused, setIsPaused] = useState(false);

  // ── Private refs (not exposed) ─────────────────────────────────────
  /** Handle for the 1-second interval timer. */
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Timestamp (ms) when the session was started. */
  const startTimeRef = useRef(0);
  /** Cumulative milliseconds spent in paused state (subtracted from elapsed). */
  const pausedElapsedRef = useRef(0);
  /** Timestamp (ms) when the current pause began. */
  const pauseStartRef = useRef(0);
  /** The mantra definition selected for the current session. */
  const selectedMantraRef = useRef<MantraDef | null>(null);

  /**
   * Cleanup effect: clears the interval timer when the component unmounts
   * to prevent memory leaks and state updates on unmounted components.
   */
  // Stop timer on unmount
  useEffect(() => () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  /**
   * Effect that manages the elapsed-time interval.
   * When a session is active (`startTimeRef.current > 0`) and not paused,
   * a 1-second interval is created that updates the `elapsed` state.
   * When paused or a dependency changes, the interval is cleared.
   *
   * Side effects:
   * - Creates/clears a `setInterval` based on `isPaused` state.
   * - Updates both `elapsedRef` and `elapsed` state each tick.
   */
  // Start the timer interval when active and not paused
  useEffect(() => {
    if (startTimeRef.current > 0 && !isPaused) {
      timerRef.current = setInterval(() => {
        const e = Date.now() - startTimeRef.current - pausedElapsedRef.current;
        elapsedRef.current = e;
        setElapsed(e);
      }, 1000);
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [isPaused]);

  /**
   * Begins a new chanting session.
   * Resets all counters and elapsed time to zero, records the start timestamp,
   * stores the selected mantra definition, and unpauses the timer.
   *
   * @param mantra - The {@link MantraDef} to chant for this session.
   */
  const start = useCallback((mantra: MantraDef) => {
    selectedMantraRef.current = mantra;
    setCount(0); countRef.current = 0;
    startTimeRef.current = Date.now();
    setElapsed(0); elapsedRef.current = 0;
    pausedElapsedRef.current = 0;
    setIsPaused(false);
  }, []);

  /**
   * Increments the bead count by 1.
   * No-op if the session is currently paused.
   * Updates both the reactive state and the mutable ref.
   */
  const increment = useCallback(() => {
    if (isPaused) return;
    setCount(prev => {
      const next = prev + 1;
      countRef.current = next;
      return next;
    });
  }, [isPaused]);

  /**
   * Decrements the bead count by 1, with a minimum floor of 0.
   * Works even when paused (to allow correction of accidental taps).
   * Updates both the reactive state and the mutable ref.
   */
  const decrement = useCallback(() => {
    setCount(prev => {
      const v = Math.max(0, prev - 1);
      countRef.current = v;
      return v;
    });
  }, []);

  /**
   * Toggles between paused and active states.
   * When pausing: records the pause start time and stops audio playback.
   * When resuming: calculates the duration of the pause and adds it to
   * the cumulative paused time so it is subtracted from elapsed time.
   *
   * Side effects:
   * - Calls `onStopAudio()` when pausing.
   * - Updates `isPaused` state and paused-duration tracking refs.
   */
  const togglePause = useCallback(() => {
    if (isPaused) {
      // Resume: add paused duration
      pausedElapsedRef.current += Date.now() - pauseStartRef.current;
    } else {
      // Pause: record pause start, stop audio
      pauseStartRef.current = Date.now();
      onStopAudio();
    }
    setIsPaused(!isPaused);
  }, [isPaused, onStopAudio]);

  /**
   * Ends the current chanting session.
   * Stops the interval timer, halts audio, calculates final statistics
   * (count, rounds, duration), and invokes the `onEndSession` callback
   * if at least one bead was counted.
   *
   * @returns An object with the final `count`, `rounds`, and `durationSec` values.
   *
   * Side effects:
   * - Clears the interval timer.
   * - Calls `onStopAudio()`.
   * - Calls `onEndSession(...)` if count > 0 and a mantra was selected.
   */
  const end = useCallback(() => {
    const completedAt = Date.now();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    onStopAudio();

    const c = countRef.current;
    const durationSec = Math.floor((completedAt - startTimeRef.current - pausedElapsedRef.current) / 1000);
    const rounds = Math.floor(c / BEAD_COUNT);
    const mantra = selectedMantraRef.current;

    if (mantra && c > 0) {
      onEndSession({
        mantraId: mantra.id,
        count: c,
        rounds,
        durationSec,
        startedAt: startTimeRef.current,
        completedAt,
        targetRounds,
      });
    }
    return { count: c, rounds, durationSec };
  }, [targetRounds, onEndSession, onStopAudio]);

  /**
   * Fully resets all session state back to its initial values.
   * Stops the timer, halts audio, clears count, elapsed time,
   * paused duration, and unpauses the session.
   *
   * Side effects:
   * - Clears the interval timer.
   * - Calls `onStopAudio()`.
   * - Resets all reactive state and mutable refs to zero/initial values.
   */
  const reset = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    onStopAudio();
    setCount(0); countRef.current = 0;
    startTimeRef.current = 0;
    setElapsed(0); elapsedRef.current = 0;
    pausedElapsedRef.current = 0;
    setIsPaused(false);
  }, [onStopAudio]);

  return {
    /** Current bead count (reactive). */
    count,
    /** Elapsed active time in milliseconds, excluding paused durations (reactive). */
    elapsed,
    /** Whether the session is currently paused. */
    isPaused,
    /** Timestamp (ms) when the session started; 0 if no session is active. */
    startTime: startTimeRef.current,
    /** Number of beads per round (constant: 108). */
    BEAD_COUNT,
    // Actions
    /** Begin a new chanting session with the given mantra definition. */
    start,
    /** Increment the bead count by 1 (no-op when paused). */
    increment,
    /** Decrement the bead count by 1 (minimum 0). */
    decrement,
    /** Toggle between paused and active states. */
    togglePause,
    /** End the current session and return final statistics. */
    end,
    /** Reset all state back to initial values. */
    reset,
  };
}
