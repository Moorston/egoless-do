// ─── useZhiguanTimer 计时器 Hook ────────────────────────────────
// 核心计时功能：elapsedSecs / start / pause / resume / stop
import { useState, useRef, useCallback, useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

interface TimerState {
  elapsedSecs: number;
  isPaused: boolean;
  isRunning: boolean;
}

interface TimerApi extends TimerState {
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

export function useZhiguanTimer(): TimerApi {
  const [state, setState] = useState<TimerState>({
    elapsedSecs: 0,
    isPaused: false,
    isRunning: false,
  });

  const startTsRef = useRef(0);
  const pausedElapsedRef = useRef(0);
  const pauseTsRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const isPausedRef = useRef(false);

  const tick = useCallback(() => {
    const now = Date.now();
    if (startTsRef.current === 0) return;
    const elapsed = Math.floor((now - startTsRef.current - pausedElapsedRef.current) / 1000);

    setState(prev => ({
      ...prev,
      elapsedSecs: elapsed >= 0 ? elapsed : 0,
    }));

    if (isRunningRef.current && !isPausedRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, []);

  const start = useCallback(() => {
    const now = Date.now();
    startTsRef.current = now;
    pausedElapsedRef.current = 0;
    pauseTsRef.current = 0;
    isRunningRef.current = true;
    isPausedRef.current = false;

    setState({ elapsedSecs: 0, isPaused: false, isRunning: true });
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const pause = useCallback(() => {
    pauseTsRef.current = Date.now();
    isPausedRef.current = true;
    setState(prev => ({ ...prev, isPaused: true }));
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const resume = useCallback(() => {
    const now = Date.now();
    if (pauseTsRef.current > 0) {
      pausedElapsedRef.current += (now - pauseTsRef.current);
      pauseTsRef.current = 0;
    }
    isPausedRef.current = false;
    setState(prev => ({ ...prev, isPaused: false }));
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    isRunningRef.current = false;
    setState(prev => ({ ...prev, isRunning: false }));
  }, []);

  useEffect(() => {
    const handler = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' && isRunningRef.current && !isPausedRef.current) {
        pauseTsRef.current = Date.now();
        isPausedRef.current = true;
        setState(prev => ({ ...prev, isPaused: true }));
      } else if (nextAppState === 'active' && isRunningRef.current && isPausedRef.current && pauseTsRef.current > 0) {
        const bgDur = Date.now() - pauseTsRef.current;
        pausedElapsedRef.current += bgDur;
        pauseTsRef.current = 0;
        isPausedRef.current = false;
        setState(prev => ({ ...prev, isPaused: false }));
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    const sub = AppState.addEventListener('change', handler);
    return () => { sub.remove(); };
  }, [state.isRunning, state.isPaused]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { ...state, start, pause, resume, stop };
}

/** 监听坐禅时间触发阶段提示 */
export function usePracticeElapseHints(
  elapsedSecs: number,
  handlers: { on5min?: () => void; on30min?: () => void; on60min?: () => void; },
) {
  const fired = useRef<Record<string, boolean>>({});
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  useEffect(() => {
    if (elapsedSecs === 300 && !fired.current['5min']) { fired.current['5min'] = true; handlersRef.current.on5min?.(); }
    else if (elapsedSecs === 1800 && !fired.current['30min']) { fired.current['30min'] = true; handlersRef.current.on30min?.(); }
    else if (elapsedSecs === 3600 && !fired.current['60min']) { fired.current['60min'] = true; handlersRef.current.on60min?.(); }
  }, [elapsedSecs]);
}
