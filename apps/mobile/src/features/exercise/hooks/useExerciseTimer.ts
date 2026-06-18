import { useState, useEffect, useRef, useCallback } from 'react';
import { Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';

export type Page = 'prep' | 'countdown' | 'active' | 'paused' | 'report';

export function useExerciseTimer() {
  const [page, setPage]         = useState<Page>('prep');
  const [sec, setSec]           = useState(0);
  const [active, setActive]     = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [pausedSec, setPausedSec] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Main timer
  useEffect(() => {
    if (page === 'active' && active) {
      timerRef.current = setInterval(() => setSec(s => s + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [page, active]);

  // Countdown
  useEffect(() => {
    if (page !== 'countdown') return;
    if (countdown <= 0) {
      setPage('active');
      setActive(true);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [page, countdown]);

  // Cleanup hold timeout and animation listener on unmount
  useEffect(() => () => {
    if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    holdAnim.removeAllListeners();
    holdAnim.stopAnimation();
  }, []);

  const handleGo = useCallback(() => { setCountdown(3); setPage('countdown'); }, []);

  const handlePause = useCallback(() => {
    setActive(false);
    setPage('paused');
  }, []);

  const handleContinue = useCallback(() => {
    setPage('active');
    setActive(true);
  }, []);

  const handleHoldStart = useCallback(() => {
    if (holdTimeoutRef.current) { clearTimeout(holdTimeoutRef.current); holdTimeoutRef.current = null; }
    holdAnim.setValue(0);
    holdAnim.removeAllListeners();

    // Spring scale: overshoot to 1.2 then settle
    Animated.spring(scaleAnim, {
      toValue: 1.2, damping: 8, stiffness: 200, useNativeDriver: true,
    }).start();

    // Linear progress ring fill over 3s
    const anim = Animated.timing(holdAnim, {
      toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: false,
    });
    holdAnim.addListener(({ value }) => {
      if (value >= 1) {
        holdAnim.removeAllListeners();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Pulse wave
        pulseAnim.setValue(0);
        Animated.timing(pulseAnim, { toValue: 1, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
        // Spring back scale
        Animated.spring(scaleAnim, { toValue: 1, damping: 10, useNativeDriver: true }).start();
        holdTimeoutRef.current = setTimeout(() => {
          if (holdTimeoutRef.current !== null) setPage('report');
        }, 400);
      }
    });
    anim.start();
  }, [holdAnim, scaleAnim, pulseAnim]);

  const handleHoldEnd = useCallback(() => {
    if (holdTimeoutRef.current) { clearTimeout(holdTimeoutRef.current); holdTimeoutRef.current = null; }
    holdAnim.removeAllListeners();
    // Spring back scale
    Animated.spring(scaleAnim, { toValue: 1, damping: 10, useNativeDriver: true }).start();
    // Clear ring
    holdAnim.stopAnimation(() => {
      Animated.timing(holdAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    });
  }, [holdAnim, scaleAnim]);

  return {
    page, setPage, sec, setSec, active, setActive,
    countdown, pausedSec,
    holdAnim, scaleAnim, pulseAnim, timerRef,
    handleGo, handlePause, handleContinue, handleHoldStart, handleHoldEnd,
  };
}
