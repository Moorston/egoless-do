import { useState, useRef, useCallback } from 'react';
import { Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { REP_MILESTONES, TIME_MILESTONES, getSoftTarget, TARGET_PRESETS, getSportType } from '@egoless-do/core';
import type { SportType } from '@egoless-do/core';

export interface UseExerciseTargetsParams {
  sportName: string;
  sportType: SportType;
  mode: 'free' | 'target';
  targetType: string;
  targetValue: number;
  sec: number;
  distKm: number;
  calories: number;
  totalReps: number;
  playBell: () => void;
}

export function useExerciseTargets(params: UseExerciseTargetsParams) {
  const { sportName, sportType, mode, targetType, targetValue, sec, distKm, calories, totalReps, playBell } = params;

  const reachedMilestonesRef = useRef(new Set<number>());
  const [milestoneText, setMilestoneText] = useState<string | null>(null);
  const milestoneAnim = useRef(new Animated.Value(0)).current;
  const softTargetBellPlayedRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const [showCelebration, setShowCelebration] = useState(false);
  const celebrateAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation
  // Caller should start the loop in a useEffect

  // Target progress
  const targetProgress = mode === 'target' ? (() => {
    if (targetType === 'distance') return Math.min(distKm / targetValue, 1);
    if (targetType === 'time')     return Math.min(sec / targetValue, 1);
    if (targetType === 'calories') return Math.min(calories / targetValue, 1);
    if (targetType === 'reps')     return Math.min(totalReps / targetValue, 1);
    return 0;
  })() : 0;

  // Soft target
  const softTarget = mode === 'free' ? getSoftTarget(sportName) : undefined;
  const softTargetValue = softTarget ? (softTarget.unit === 'min' ? softTarget.intermediate * 60 : softTarget.intermediate) : 0;
  const softTargetProgress = softTargetValue > 0
    ? Math.min((sportType === 'repetition' ? totalReps : sec) / softTargetValue, 1)
    : 0;
  const softTargetReached = softTargetProgress >= 1;
  const softTargetLabel = softTarget
    ? (softTarget.unit === 'min' ? `💡 建议 ${softTarget.intermediate} 分钟` : `💡 建议 ${softTarget.intermediate} 次`)
    : '';

  // Celebration
  const triggerCelebration = useCallback(() => {
    setShowCelebration(true);
    celebrateAnim.setValue(0);
    Animated.sequence([
      Animated.timing(celebrateAnim, { toValue: 1, duration: 300, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
      Animated.delay(600),
      Animated.timing(celebrateAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setShowCelebration(false));
  }, [celebrateAnim]);

  // Check target reached
  const checkTargetReached = useCallback(() => {
    if (mode !== 'target') return;
    let reached = false;
    if (targetType === 'distance' && distKm >= targetValue) reached = true;
    if (targetType === 'time' && sec >= targetValue) reached = true;
    if (targetType === 'calories' && calories >= targetValue) reached = true;
    if (targetType === 'reps' && totalReps >= targetValue) reached = true;
    if (reached) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      triggerCelebration();
      playBell();
    }
  }, [mode, targetType, targetValue, sec, distKm, calories, totalReps, triggerCelebration, playBell]);

  // Milestone check
  const checkMilestone = useCallback(() => {
    const milestones = sportType === 'repetition' ? REP_MILESTONES : TIME_MILESTONES;
    const currentValue = sportType === 'repetition' ? totalReps : sec;
    for (const m of milestones) {
      if (currentValue >= m.value && !reachedMilestonesRef.current.has(m.value)) {
        reachedMilestonesRef.current.add(m.value);
        setMilestoneText(m.label);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        playBell();
        milestoneAnim.setValue(0);
        Animated.sequence([
          Animated.timing(milestoneAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.delay(1500),
          Animated.timing(milestoneAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => setMilestoneText(null));
        break;
      }
    }
  }, [sportType, totalReps, sec, playBell, milestoneAnim]);

  // Soft target bell
  const checkSoftTargetBell = useCallback(() => {
    if (softTargetReached && !softTargetBellPlayedRef.current) {
      softTargetBellPlayedRef.current = true;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      playBell();
    }
    if (!softTargetReached) {
      softTargetBellPlayedRef.current = false;
    }
  }, [softTargetReached, playBell]);

  return {
    targetProgress,
    softTarget, softTargetProgress, softTargetReached, softTargetLabel,
    milestoneText, milestoneAnim,
    showCelebration, celebrateAnim, triggerCelebration,
    pulseAnim,
    checkTargetReached, checkMilestone, checkSoftTargetBell,
  };
}
