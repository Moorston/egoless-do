// ─── useBreathingGuide ──────────────────────────────────────────
// 冥想型运动的呼吸引导循环：inhale → hold → exhale 三相动画 + 钟声。
// 2026-08-30 从 SportPage 提取（move-only，逻辑逐字节搬移，零行为变更）。
// 关键约束：effect 依赖数组不变（breathGuideEnabled/timer.page/timer.active），
// breathAnim 作为 useRef 稳定引用返回给子组件渲染。

import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

import type { useExerciseAudio } from './useExerciseAudio';
import type { useExerciseTimer } from './useExerciseTimer';

export interface UseBreathingGuideParams {
  breathGuideEnabled: boolean;
  timer: ReturnType<typeof useExerciseTimer>;
  audio: ReturnType<typeof useExerciseAudio>;
}

export function useBreathingGuide(params: UseBreathingGuideParams) {
  const { breathGuideEnabled, timer, audio } = params;

  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const breathAnim = useRef(new Animated.Value(0)).current;
  const breathTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const breathCycleRef = useRef(0);
  const audioRef = useRef(audio);
  audioRef.current = audio;

  // ── Breathing guide cycle ──
  useEffect(() => {
    if (!breathGuideEnabled || timer.page !== 'active' || !timer.active) {
      if (breathTimerRef.current) { clearTimeout(breathTimerRef.current); breathTimerRef.current = null; }
      return;
    }
    const PHASE_DURATION = 4000;
    const mountedRef = { current: true };
    const runPhase = () => {
      if (!mountedRef.current) return;
      const cycle = breathCycleRef.current;
      if (cycle === 0) {
        setBreathPhase('inhale');
        breathAnim.setValue(0);
        Animated.timing(breathAnim, { toValue: 1, duration: PHASE_DURATION, useNativeDriver: false }).start();
        audioRef.current.playBell();
      } else if (cycle === 1) {
        setBreathPhase('hold');
      } else {
        setBreathPhase('exhale');
        Animated.timing(breathAnim, { toValue: 0, duration: PHASE_DURATION, useNativeDriver: false }).start();
        audioRef.current.playBell();
      }
      breathTimerRef.current = setTimeout(() => {
        breathCycleRef.current = (breathCycleRef.current + 1) % 3;
        runPhase();
      }, PHASE_DURATION);
    };
    runPhase();
    return () => {
      mountedRef.current = false;
      if (breathTimerRef.current) { clearTimeout(breathTimerRef.current); breathTimerRef.current = null; }
    };
    // breathAnim 为 useRef 稳定引用，无需加入依赖数组
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breathGuideEnabled, timer.page, timer.active]);

  return { breathPhase, breathAnim };
}
