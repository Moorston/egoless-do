import { useState, useRef, useCallback, useEffect } from 'react';
import { Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { ExerciseSet } from '@egoless-do/core';

export function useExerciseSets(onCompleteSet: () => void) {
  const [sets, setSets]               = useState<ExerciseSet[]>([]);
  const [currentSetReps, setCurrentSetReps] = useState(0);
  const currentSetRepsRef = useRef(currentSetReps);
  currentSetRepsRef.current = currentSetReps;
  const onCompleteSetRef = useRef(onCompleteSet);
  onCompleteSetRef.current = onCompleteSet;

  // Long press refs
  const longPressTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressStartedRef  = useRef(false);

  // Animations
  const bounceAnim      = useRef(new Animated.Value(1)).current;
  const plusRippleAnim  = useRef(new Animated.Value(1)).current;
  const minusRippleAnim = useRef(new Animated.Value(1)).current;

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
    if (longPressIntervalRef.current) { clearTimeout(longPressIntervalRef.current); longPressIntervalRef.current = null; }
    longPressStartedRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (longPressIntervalRef.current) clearTimeout(longPressIntervalRef.current);
    };
  }, []);

  const startLongPress = useCallback((delta: 1 | -1) => {
    clearLongPress();
    longPressStartedRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressStartedRef.current = true;
      const startTime = Date.now();
      const tick = () => {
        const elapsed = Date.now() - startTime;
        const interval = elapsed > 2000 ? 50 : 150;
        if (longPressStartedRef.current) {
          setCurrentSetReps(r => Math.max(0, r + delta));
        }
        longPressIntervalRef.current = setTimeout(tick, interval);
      };
      tick();
    }, 200);
  }, [clearLongPress]);

  const stopLongPress = useCallback((delta: 1 | -1) => {
    const wasLongPress = longPressStartedRef.current;
    clearLongPress();
    if (!wasLongPress) {
      setCurrentSetReps(r => Math.max(0, r + delta));
    }
    const anim = delta > 0 ? plusRippleAnim : minusRippleAnim;
    anim.setValue(1);
    Animated.sequence([
      Animated.timing(anim, { toValue: 1.15, duration: 80, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [clearLongPress, plusRippleAnim, minusRippleAnim]);

  // Bounce animation on rep change
  const triggerBounce = useCallback(() => {
    bounceAnim.setValue(1);
    Animated.sequence([
      Animated.timing(bounceAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
      Animated.timing(bounceAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }, [bounceAnim]);

  const handleCompleteSet = useCallback(() => {
    setSets(prev => [...prev, { reps: currentSetRepsRef.current, restSec: 60 }]);
    setCurrentSetReps(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onCompleteSetRef.current();
  }, []);

  const totalReps = sets.reduce((s, set) => s + set.reps, 0) + currentSetReps;

  return {
    sets, setSets,
    currentSetReps, setCurrentSetReps,
    totalReps,
    bounceAnim, plusRippleAnim, minusRippleAnim,
    startLongPress, stopLongPress, triggerBounce,
    handleCompleteSet,
  };
}
