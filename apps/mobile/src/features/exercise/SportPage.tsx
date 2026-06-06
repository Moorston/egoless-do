import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Alert } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useRootNavigation } from '../../navigation/hooks';
// expo-location loaded lazily — not in Expo Go built-in SDK
import * as Haptics from 'expo-haptics';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, useT } from '../../components/UI';
import { SPORT_BG_COLORS, fmt, COLORS, getSportType, TARGET_PRESETS, estimateCalories, MET_MAP, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_STAT_CARD, FONT_STAT_SECTION, FONT_HERO, FONT_CLOSE, FONT_BADGE, FONT_BACK, REP_MILESTONES, TIME_MILESTONES, getSoftTarget, getSportExperienceType, EXERCISE_SOUNDS } from '@egoless-do/core';
import type { SportType, ExerciseSet } from '@egoless-do/core';
import { useAppStore } from '../../store/useAppStore';
import { X, Play, Pause, Minus, Plus, Music } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import type { RootStackParamList } from '../../navigation/hooks';

// Sound files mapping (reuse meditation sounds)
const SOUND_FILES: Record<string, number> = {
  '海潮': require('../../../assets/sounds/ocean.mp3'),
  '雨声': require('../../../assets/sounds/rain.mp3'),
  '钵声': require('../../../assets/sounds/bowl.mp3'),
  '鸟叫': require('../../../assets/sounds/birds.mp3'),
  '流水': require('../../../assets/sounds/flowing-stream.mp3'),
  '风铃': require('../../../assets/sounds/wind-chimes.mp3'),
};
const BELL_FILE = require('../../../assets/sounds/temple_bell.mp3');

// Gradient colors by experience type
const EXPERIENCE_GRADIENTS: Record<string, string[]> = {
  meditative: ['#1a2a3a', '#0d1f2d', '#0a1520'],
  endurance: ['#1a2e1a', '#0f1f0f', '#0a150a'],
  strength: ['#2e1a1a', '#1f0f0f', '#150a0a'],
  interval: ['#2e2a1a', '#1f1a0f', '#15100a'],
};

let _MapView: any = null;
let _Polyline: any = null;
let _amapLoaded = false;

function useAmapComponents() {
  const [ready, setReady] = useState(_amapLoaded);
  useEffect(() => {
    if (_amapLoaded) { setReady(true); return; }
    import('react-native-amap3d').then(m => {
      _MapView = m.MapView;
      _Polyline = m.Polyline;
      _amapLoaded = true;
      setReady(true);
    }).catch(() => {});
  }, []);
  return { MapView: _MapView, Polyline: _Polyline, ready };
}

function MapViewFallback() {
  return <View style={{ flex: 1, backgroundColor: '#1a1a2e' }} />;
}

let _LocationMod: any = null;
async function _getLocation() {
  if (_LocationMod === null) {
    try { _LocationMod = await import('expo-location'); } catch { _LocationMod = false; }
  }
  return _LocationMod;
}
async function _reqLocPerm() {
  const m = await _getLocation();
  if (!m) return { status: 'denied' };
  try { return await m.requestForegroundPermissionsAsync(); } catch { return { status: 'denied' }; }
}
async function _getCurPos() {
  const m = await _getLocation();
  if (!m) return null;
  try { return await m.getCurrentPositionAsync({}); } catch { return null; }
}
async function _watchPos(cb: (loc: any) => void) {
  const m = await _getLocation();
  if (!m) return { remove: () => {} };
  try { return await m.watchPositionAsync({ accuracy: m.Accuracy.High, timeInterval: 2000, distanceInterval: 5 }, cb); } catch { return { remove: () => {} }; }
}

type Route = RouteProp<RootStackParamList, 'Sport'>;
type Page = 'prep' | 'countdown' | 'active' | 'paused' | 'report';

function computeDistance(coords: { latitude: number; longitude: number }[]): number {
  if (coords.length < 2) return 0;
  return coords.reduce((total, c, i) => {
    if (i === 0) return 0;
    const prev = coords[i - 1];
    const dlat = (c.latitude - prev.latitude) * Math.PI / 180;
    const dlng = (c.longitude - prev.longitude) * Math.PI / 180;
    const a = Math.sin(dlat / 2) ** 2 + Math.cos(prev.latitude * Math.PI / 180) *
              Math.cos(c.latitude * Math.PI / 180) * Math.sin(dlng / 2) ** 2;
    return total + 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, 0);
}

function formatPace(secPerKm: number): string {
  if (!isFinite(secPerKm) || secPerKm <= 0) return '--:--';
  const m = Math.floor(secPerKm / 60);
  const s = Math.floor(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function SportPage() {
  const nav   = useRootNavigation();
  const route = useRoute<Route>();
  const TH    = useTheme();
  const T     = useT();
  const store = useAppStore();
  const { MapView, Polyline, ready: amapReady } = useAmapComponents();
  const { key: sportName, icon, color, gps: gpsParam } = route.params;

  const isGpsSport = gpsParam ?? false;
  const weight = store.userProfile?.weight ?? 70;

  // Determine sport type
  const sportType = getSportType(sportName, isGpsSport);
  const presets = TARGET_PRESETS[sportType];

  // Mode labels based on sport type
  const modeLabels = {
    free: sportType === 'repetition' ? T('exerciseFreeReps') : sportType === 'timed' ? T('exerciseFreeSport') : T('exerciseFreeRun'),
    target: sportType === 'repetition' ? T('exerciseTargetReps') : sportType === 'timed' ? T('exerciseTargetSport') : T('exerciseTargetRun'),
  };

  // Available target types for this sport
  const availableTargetTypes = Object.keys(presets) as Array<'distance' | 'time' | 'calories' | 'reps'>;

  // ── State ──
  const [page, setPage]           = useState<Page>('prep');
  const [mode, setMode]           = useState<'free' | 'target'>('free');
  const [targetType, setTargetType] = useState<string>(availableTargetTypes[0]);
  const [targetValue, setTargetValue] = useState(presets[availableTargetTypes[0]]?.[0]?.value ?? 0);
  const [sec, setSec]             = useState(0);
  const [pausedSec, setPausedSec] = useState(0);
  const [active, setActive]       = useState(false);
  const [reps, setReps]           = useState(0);
  const [coords, setCoords]       = useState<{ latitude: number; longitude: number; ts: number }[]>([]);
  const [initialPos, setInitialPos] = useState({ latitude: 39.9042, longitude: 116.4074 });
  const [countdown, setCountdown] = useState(3);
  const [segmentPaces, setSegmentPaces] = useState<number[]>([]);
  const [lastKmMark, setLastKmMark] = useState(0);
  const [lastKmTs, setLastKmTs]     = useState(0);
  const [sets, setSets]             = useState<ExerciseSet[]>([]);
  const [currentSetReps, setCurrentSetReps] = useState(0);
  const [isResting, setIsResting]   = useState(false);
  const [restSec, setRestSec]       = useState(0);
  const [selectedSound, setSelectedSound] = useState<string>('无');
  const [showSoundPicker, setShowSoundPicker] = useState(false);

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSub = useRef<any>(null);
  const mapRef      = useRef<any>(null);
  const holdAnim    = useRef(new Animated.Value(0)).current;

  // Long press refs for +/- buttons
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressStartedRef = useRef(false);

  // Celebration animation
  const celebrateAnim = useRef(new Animated.Value(0)).current;
  const [showCelebration, setShowCelebration] = useState(false);

  // Number bounce animation
  const bounceAnim = useRef(new Animated.Value(1)).current;

  // Button ripple animations
  const plusRippleAnim = useRef(new Animated.Value(1)).current;
  const minusRippleAnim = useRef(new Animated.Value(1)).current;

  // Progress bar pulse animation
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Pause button long press
  const pauseLongPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pauseHoldAnim = useRef(new Animated.Value(1)).current;

  // Milestone tracking
  const reachedMilestonesRef = useRef(new Set<number>());
  const [milestoneText, setMilestoneText] = useState<string | null>(null);
  const milestoneAnim = useRef(new Animated.Value(0)).current;
  const softTargetBellPlayedRef = useRef(false);

  // Breathing guide (meditative sports)
  const experienceType = getSportExperienceType(sportName, sportType);
  const isMeditative = experienceType === 'meditative';
  const [breathGuideEnabled, setBreathGuideEnabled] = useState(isMeditative);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const breathAnim = useRef(new Animated.Value(0)).current;
  const breathTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const breathCycleRef = useRef(0); // 0=inhale, 1=hold, 2=exhale

  const distKm = computeDistance(coords);
  const calories = estimateCalories(sportName, sec, weight);
  const bg = SPORT_BG_COLORS[sportName] || color || '#4CAF50';

  useKeepAwake();

  // ── Audio players ──
  const bgSource = SOUND_FILES[selectedSound];
  const bgPlayer = useAudioPlayer(bgSource ?? undefined);
  bgPlayer.loop = true;
  bgPlayer.volume = 0.25;

  const bellPlayer = useAudioPlayer(BELL_FILE);
  bellPlayer.volume = 0.5;

  // Init audio session + restore last selected sound
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {});
    AsyncStorage.getItem('sport_selected_sound').then(v => {
      if (v && EXERCISE_SOUNDS.some(s => s.key === v)) setSelectedSound(v);
    }).catch(() => {});
  }, []);

  // Persist selected sound
  useEffect(() => {
    AsyncStorage.setItem('sport_selected_sound', selectedSound).catch(() => {});
  }, [selectedSound]);

  // ── Breathing guide cycle (meditative sports) ──
  useEffect(() => {
    if (!breathGuideEnabled || page !== 'active' || !active) {
      if (breathTimerRef.current) { clearTimeout(breathTimerRef.current); breathTimerRef.current = null; }
      return;
    }

    const PHASE_DURATION = 4000; // 4s per phase
    const runPhase = () => {
      const cycle = breathCycleRef.current;
      if (cycle === 0) {
        // Inhale
        setBreathPhase('inhale');
        breathAnim.setValue(0);
        Animated.timing(breathAnim, { toValue: 1, duration: PHASE_DURATION, useNativeDriver: false }).start();
        bellPlayer.seekTo(0);
        bellPlayer.play();
      } else if (cycle === 1) {
        // Hold
        setBreathPhase('hold');
      } else {
        // Exhale
        setBreathPhase('exhale');
        Animated.timing(breathAnim, { toValue: 0, duration: PHASE_DURATION, useNativeDriver: false }).start();
        bellPlayer.seekTo(0);
        bellPlayer.play();
      }
      breathTimerRef.current = setTimeout(() => {
        breathCycleRef.current = (breathCycleRef.current + 1) % 3;
        runPhase();
      }, PHASE_DURATION);
    };

    runPhase();
    return () => {
      if (breathTimerRef.current) { clearTimeout(breathTimerRef.current); breathTimerRef.current = null; }
    };
  }, [breathGuideEnabled, page, active]);

  // ── Number bounce on change ──
  useEffect(() => {
    if (currentSetReps === 0) return;
    bounceAnim.setValue(1);
    Animated.sequence([
      Animated.timing(bounceAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
      Animated.timing(bounceAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }, [currentSetReps]);

  // ── Init GPS position ──
  useEffect(() => {
    if (isGpsSport) {
      (async () => {
        const { status } = await _reqLocPerm();
        if (status === 'granted') {
          const loc = await _getCurPos();
          if (loc) setInitialPos({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      })();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      locationSub.current?.remove();
    };
  }, []);

  // ── Timer ──
  useEffect(() => {
    if (page === 'active' && active) {
      timerRef.current = setInterval(() => setSec(s => s + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [page, active]);

  // ── Countdown ──
  useEffect(() => {
    if (page !== 'countdown') return;
    if (countdown <= 0) {
      setPage('active');
      setActive(true);
      if (isGpsSport) startGpsTracking();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [page, countdown]);

  // ── Rest timer ──
  useEffect(() => {
    if (!isResting) return;
    if (restSec <= 0) {
      setIsResting(false);
      return;
    }
    const t = setTimeout(() => setRestSec(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [isResting, restSec]);

  // ── Segment pace tracking ──
  useEffect(() => {
    if (!isGpsSport || page !== 'active') return;
    const currentKm = Math.floor(distKm);
    if (currentKm > lastKmMark && lastKmMark >= 0) {
      const segTime = sec - lastKmTs;
      setSegmentPaces(prev => [...prev, segTime]);
      setLastKmMark(currentKm);
      setLastKmTs(sec);
    }
  }, [distKm]);

  // ── Target progress check ──
  useEffect(() => {
    if (mode !== 'target' || page !== 'active' || !active) return;
    const totalReps = reps || sets.reduce((s, set) => s + set.reps, 0) + currentSetReps;
    let reached = false;
    if (targetType === 'distance' && distKm >= targetValue) reached = true;
    if (targetType === 'time' && sec >= targetValue) reached = true;
    if (targetType === 'calories' && calories >= targetValue) reached = true;
    if (targetType === 'reps' && totalReps >= targetValue) reached = true;
    if (reached) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      triggerCelebration();
      bellPlayer.seekTo(0);
      bellPlayer.play();
    }
  }, [sec, distKm, calories, reps, currentSetReps, sets]);

  // ── Milestone check ──
  useEffect(() => {
    if (page !== 'active' || !active) return;
    const totalReps = reps || sets.reduce((s, set) => s + set.reps, 0) + currentSetReps;
    const milestones = sportType === 'repetition' ? REP_MILESTONES : TIME_MILESTONES;
    const currentValue = sportType === 'repetition' ? totalReps : sec;
    for (const m of milestones) {
      if (currentValue >= m.value && !reachedMilestonesRef.current.has(m.value)) {
        reachedMilestonesRef.current.add(m.value);
        setMilestoneText(m.label);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        bellPlayer.seekTo(0);
        bellPlayer.play();
        milestoneAnim.setValue(0);
        Animated.sequence([
          Animated.timing(milestoneAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.delay(1500),
          Animated.timing(milestoneAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => setMilestoneText(null));
        break; // Only show one milestone at a time
      }
    }
  }, [sec, currentSetReps, sets]);

  // ── Soft target bell on first reach ──
  const softTargetBell = mode === 'free' ? getSoftTarget(sportName) : undefined;
  const softTargetBellVal = softTargetBell ? (softTargetBell.unit === 'min' ? softTargetBell.intermediate * 60 : softTargetBell.intermediate) : 0;
  const softTargetBellProg = softTargetBellVal > 0
    ? Math.min((sportType === 'repetition' ? (reps || sets.reduce((s, set) => s + set.reps, 0) + currentSetReps) : sec) / softTargetBellVal, 1)
    : 0;
  const softTargetReachedHere = softTargetBellProg >= 1;
  useEffect(() => {
    if (softTargetReachedHere && !softTargetBellPlayedRef.current) {
      softTargetBellPlayedRef.current = true;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      bellPlayer.seekTo(0);
      bellPlayer.play();
    }
    if (!softTargetReachedHere) {
      softTargetBellPlayedRef.current = false;
    }
  }, [softTargetReachedHere]);

  // ── GPS tracking ──
  const startGpsTracking = async () => {
    const { status } = await _reqLocPerm();
    if (status !== 'granted') return;
    locationSub.current = await _watchPos(loc => {
      const c = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, ts: Date.now() };
      setCoords(arr => [...arr, c]);
      mapRef.current?.moveCamera({ target: c, zoom: 16 }, 300);
    });
  };

  const stopGpsTracking = () => {
    locationSub.current?.remove();
    locationSub.current = null;
  };

  // ── Controls ──
  const handleGo = () => { setCountdown(3); setPage('countdown'); };

  const handlePause = () => {
    setActive(false);
    setPausedSec(sec);
    stopGpsTracking();
    setPage('paused');
  };

  const handleContinue = () => {
    setPage('active');
    setActive(true);
    if (isGpsSport) startGpsTracking();
  };

  const handleHoldStart = () => {
    holdAnim.setValue(0);
    holdAnim.removeAllListeners();
    const anim = Animated.timing(holdAnim, {
      toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: false,
    });
    holdAnim.addListener(({ value }) => {
      if (value >= 1) {
        holdAnim.removeAllListeners();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPage('report');
      }
    });
    anim.start();
  };

  const handleHoldEnd = () => {
    holdAnim.removeAllListeners();
    holdAnim.stopAnimation(() => holdAnim.setValue(0));
  };

  // ── Long press +/- for repetition ──
  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
    if (longPressIntervalRef.current) { clearTimeout(longPressIntervalRef.current); longPressIntervalRef.current = null; }
    longPressStartedRef.current = false;
  }, []);

  const startLongPress = useCallback((delta: 1 | -1) => {
    clearLongPress();
    longPressStartedRef.current = false;
    // After 200ms, start continuous triggering
    longPressTimerRef.current = setTimeout(() => {
      longPressStartedRef.current = true;
      const startTime = Date.now();
      const tick = () => {
        const elapsed = Date.now() - startTime;
        const interval = elapsed > 2000 ? 50 : 150;
        setCurrentSetReps(r => Math.max(0, r + delta));
        longPressIntervalRef.current = setTimeout(tick, interval);
      };
      tick();
    }, 200);
  }, [clearLongPress]);

  const stopLongPress = useCallback((delta: 1 | -1) => {
    const wasLongPress = longPressStartedRef.current;
    clearLongPress();
    // Short tap: trigger single increment only if long press didn't start
    if (!wasLongPress) {
      setCurrentSetReps(r => Math.max(0, r + delta));
    }
    // Ripple feedback
    const anim = delta > 0 ? plusRippleAnim : minusRippleAnim;
    anim.setValue(1);
    Animated.sequence([
      Animated.timing(anim, { toValue: 1.15, duration: 80, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [clearLongPress]);

  // ── Celebration trigger ──
  const triggerCelebration = useCallback(() => {
    setShowCelebration(true);
    celebrateAnim.setValue(0);
    Animated.sequence([
      Animated.timing(celebrateAnim, { toValue: 1, duration: 300, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
      Animated.delay(600),
      Animated.timing(celebrateAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setShowCelebration(false));
  }, [celebrateAnim]);

  // ── Complete set handler ──
  const handleCompleteSet = useCallback(() => {
    setSets(prev => [...prev, { reps: currentSetReps, restSec: 60 }]);
    setCurrentSetReps(0);
    setIsResting(true);
    setRestSec(60);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    bellPlayer.seekTo(0);
    bellPlayer.play();
  }, [currentSetReps]);

  // ── Pause long press to finish ──
  const handlePauseLongPressStart = useCallback(() => {
    pauseHoldAnim.setValue(1);
    pauseLongPressRef.current = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        T('exerciseFinishConfirm'),
        '',
        [
          { text: T('cancel') || '取消', style: 'cancel' },
          { text: T('confirm') || '确认', onPress: () => setPage('report'), style: 'destructive' },
        ],
      );
    }, 800);
    Animated.timing(pauseHoldAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }).start();
  }, [pauseHoldAnim, T]);

  const handlePauseLongPressEnd = useCallback(() => {
    if (pauseLongPressRef.current) { clearTimeout(pauseLongPressRef.current); pauseLongPressRef.current = null; }
    Animated.timing(pauseHoldAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  }, [pauseHoldAnim]);

  const handleSave = () => {
    stopGpsTracking();
    const finalReps = sportType === 'repetition' ? (reps || sets.reduce((s, set) => s + set.reps, 0) + currentSetReps) : undefined;
    if (sec > 0 || (finalReps && finalReps > 0)) {
      const entry = {
        sportKey: sportName, sportIcon: icon, durationSec: sec,
        timestamp: Date.now(), isGpsSport: isGpsSport,
        distanceKm: isGpsSport ? distKm : undefined,
        calories,
        avgPace: isGpsSport && distKm > 0 ? sec / distKm : undefined,
        trackPoints: isGpsSport ? coords.map(c => ({ lat: c.latitude, lng: c.longitude, ts: c.ts })) : undefined,
        segmentPaces: segmentPaces.length > 0 ? segmentPaces : undefined,
        mode,
        target: mode === 'target' ? { type: targetType, value: targetValue } : undefined,
        reps: finalReps,
        sets: sets.length > 0 ? sets : undefined,
        met: MET_MAP[sportName],
      };
      store.addExercise(entry);
      if (useAppStore.getState().healthSyncEnabled) {
        import('../health/HealthService').then(({ writeWorkout }) => {
          writeWorkout({ ...entry, id: '', updatedAt: 0 }).catch(e => console.warn('[Health] write failed:', e));
        });
      }
    }
    nav.goBack();
  };

  const totalRepsForProgress = reps || sets.reduce((s, set) => s + set.reps, 0) + currentSetReps;
  const targetProgress = mode === 'target' ? (() => {
    if (targetType === 'distance') return Math.min(distKm / targetValue, 1);
    if (targetType === 'time') return Math.min(sec / targetValue, 1);
    if (targetType === 'calories') return Math.min(calories / targetValue, 1);
    if (targetType === 'reps') return Math.min(totalRepsForProgress / targetValue, 1);
    return 0;
  })() : 0;

  // Target type labels
  const targetTypeLabels: Record<string, string> = {
    distance: T('exerciseDistanceGoal'),
    time: T('exerciseTimeGoal'),
    calories: T('exerciseCalGoal'),
    reps: T('exerciseRepsGoal'),
  };

  // ── PREP PAGE ──
  if (page === 'prep') {
    return (
      <View style={{ flex: 1, backgroundColor: bg }}>
        {/* Header */}
        <View style={{ paddingTop: 56, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '700', color: '#fff' }}>{sportName}</Text>
            <TouchableOpacity onPress={() => nav.goBack()}>
              <X size={22} color="rgba(255,255,255,.6)" />
            </TouchableOpacity>
          </View>

          {/* Mode toggle — available for all sport types */}
          <View style={{ flexDirection: 'row', marginTop: 24, backgroundColor: 'rgba(0,0,0,.2)', borderRadius: 12, padding: 3 }}>
            {(['free', 'target'] as const).map(m => (
              <TouchableOpacity key={m} onPress={() => setMode(m)}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: mode === m ? 'rgba(255,255,255,.25)' : 'transparent', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: mode === m ? '700' : '400', fontSize: FONT_BODY }}>
                  {modeLabels[m]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Target selection */}
          {mode === 'target' && (
            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {availableTargetTypes.map(t => (
                  <TouchableOpacity key={t} onPress={() => { setTargetType(t); setTargetValue(presets[t]?.[0]?.value ?? 0); }}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: targetType === t ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.1)' }}>
                    <Text style={{ color: '#fff', fontSize: FONT_SUB, fontWeight: targetType === t ? '700' : '400' }}>
                      {targetTypeLabels[t] ?? t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {(presets[targetType as keyof typeof presets] ?? []).map((p: { label: string; value: number }) => (
                  <TouchableOpacity key={p.label} onPress={() => setTargetValue(p.value)}
                    style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: targetValue === p.value ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.1)' }}>
                    <Text style={{ color: '#fff', fontSize: FONT_BODY, fontWeight: targetValue === p.value ? '700' : '400' }}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Breathing guide toggle (meditative sports) */}
          {isMeditative && (
            <TouchableOpacity onPress={() => setBreathGuideEnabled(v => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.08)' }}>
              <Text style={{ color: 'rgba(255,255,255,.7)', fontSize: FONT_BODY }}>呼吸引导</Text>
              <View style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: breathGuideEnabled ? COLORS.GREEN : 'rgba(255,255,255,.2)', padding: 2, justifyContent: 'center' }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignSelf: breathGuideEnabled ? 'flex-end' : 'flex-start' }} />
              </View>
            </TouchableOpacity>
          )}

          {/* Sound picker (compact) */}
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: 'rgba(255,255,255,.5)', fontSize: FONT_SUB, marginBottom: 6 }}>背景音效</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {EXERCISE_SOUNDS.map(s => (
                <TouchableOpacity key={s.key} onPress={() => {
                  setSelectedSound(s.key);
                  if (s.key === '无') { bgPlayer.pause(); }
                  else { bgPlayer.play(); }
                }} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: selectedSound === s.key ? `${COLORS.ORANGE}30` : 'rgba(255,255,255,.08)' }}>
                  <Text style={{ fontSize: FONT_SUB, color: selectedSound === s.key ? COLORS.ORANGE : 'rgba(255,255,255,.5)' }}>{s.key}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Soft target recommendation */}
          {mode === 'free' && (() => {
            const st = getSoftTarget(sportName);
            if (!st) return null;
            const label = st.unit === 'min' ? `💡 建议 ${st.intermediate} 分钟` : `💡 建议 ${st.intermediate} 次`;
            return (
              <View style={{ marginTop: 12, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.05)' }}>
                <Text style={{ color: 'rgba(255,255,255,.5)', fontSize: FONT_SUB }}>{label}</Text>
              </View>
            );
          })()}

          {/* Last workout data */}
          {(() => {
            const lastEntry = store.exerciseLog?.filter((e: any) => e.sportKey === sportName).slice(-1)[0];
            if (!lastEntry) return null;
            return (
              <View style={{ marginTop: 12, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.05)' }}>
                <Text style={{ color: 'rgba(255,255,255,.4)', fontSize: FONT_SUB }}>
                  上次: {lastEntry.durationSec ? fmt(lastEntry.durationSec) : ''}{lastEntry.reps ? ` · ${lastEntry.reps} 次` : ''}{lastEntry.calories ? ` · ${lastEntry.calories}kcal` : ''}
                </Text>
              </View>
            );
          })()}
        </View>

        {/* Centered circle + GO button */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 40 }}>
          {/* Big circle */}
          <View style={{ width: 180, height: 180, borderRadius: 90, borderWidth: 4, borderColor: 'rgba(255,255,255,.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 40 }}>
            {sportType === 'repetition' ? (
              <>
                <Text style={{ fontSize: FONT_HERO, fontWeight: '900', color: '#fff' }}>0</Text>
                <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.6)', marginTop: 4 }}>{T('exerciseReps')}</Text>
              </>
            ) : sportType === 'timed' ? (
              <>
                <Text style={{ fontSize: FONT_HERO, fontWeight: '900', color: '#fff' }}>0:00</Text>
                <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.6)', marginTop: 4 }}>{T('exerciseMin')}</Text>
              </>
            ) : (
              <>
                <Text style={{ fontSize: FONT_HERO, fontWeight: '900', color: '#fff' }}>0.00</Text>
                <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.6)', marginTop: 4 }}>km</Text>
              </>
            )}
          </View>

          {/* GO button */}
          <TouchableOpacity onPress={handleGo}
            style={{ height: 64, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' }}>
            <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: bg, letterSpacing: 4 }}>GO</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── COUNTDOWN PAGE ──
  if (page === 'countdown') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: FONT_HERO, fontWeight: '900', color: '#fff' }}>{countdown}</Text>
        <Text style={{ fontSize: FONT_TITLE, color: 'rgba(255,255,255,.5)', marginTop: 16 }}>{T('exerciseCountdown')}</Text>
      </View>
    );
  }

  // ── PAUSED PAGE ──
  if (page === 'paused') {
    const circumference = 2 * Math.PI * 40;
    const pausedReps = reps || sets.reduce((s, set) => s + set.reps, 0) + currentSetReps;
    return (
      <View style={{ flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        {/* Data summary */}
        <View style={{ flexDirection: 'row', gap: 24, marginBottom: 24 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '700', color: '#fff' }}>{fmt(sec)}</Text>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)' }}>{T('exerciseTotalDuration')}</Text>
          </View>
          {sportType === 'repetition' && (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '700', color: '#fff' }}>{pausedReps}</Text>
              <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)' }}>{T('exerciseReps')}</Text>
            </View>
          )}
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '700', color: '#fff' }}>{sets.length}</Text>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)' }}>{T('exerciseSets') || '组'}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '700', color: COLORS.ORANGE }}>{calories}</Text>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)' }}>kcal</Text>
          </View>
        </View>

        <Text style={{ fontSize: FONT_HERO, fontWeight: '900', color: '#fff' }}>{isGpsSport ? distKm.toFixed(2) : sportType === 'repetition' ? pausedReps : Math.floor(sec / 60)}</Text>
        <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)', marginTop: 4 }}>{isGpsSport ? 'km' : sportType === 'repetition' ? T('exerciseReps') : 'min'}</Text>
        <Text style={{ fontSize: FONT_STAT_CARD, color: 'rgba(255,255,255,.7)', marginTop: 16 }}>{fmt(sec)}</Text>

        <View style={{ flexDirection: 'row', marginTop: 40, gap: 16, alignItems: 'center' }}>
          {/* Continue */}
          <TouchableOpacity onPress={handleContinue}
            style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.GREEN, alignItems: 'center', justifyContent: 'center' }}>
            <Play size={24} color="#fff" />
          </TouchableOpacity>

          {/* Direct end & save */}
          <TouchableOpacity onPress={() => { handleSave(); setPage('report'); }}
            style={{ paddingHorizontal: 20, paddingVertical: 14, borderRadius: 24, backgroundColor: 'rgba(255,255,255,.15)', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: FONT_BODY, fontWeight: '700' }}>{T('exerciseFinishConfirm')}</Text>
          </TouchableOpacity>

          {/* Hold to finish (legacy) */}
          <TouchableOpacity
            onPressIn={handleHoldStart}
            onPressOut={handleHoldEnd}
            activeOpacity={0.8}
            style={{ width: 88, height: 88, borderRadius: 44, borderWidth: 4, borderColor: COLORS.RED, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239,68,68,.15)' }}>
            <Animated.View
              style={{
                position: 'absolute', top: -4, left: -4,
                width: 88, height: 88,
                transform: [{ rotate: '-90deg' }],
              }}
              collapsable={false}
            >
              <Animated.View
                style={{
                  width: 88, height: 88,
                  borderRadius: 44,
                  borderWidth: 4,
                  borderColor: 'transparent',
                  borderTopColor: COLORS.RED,
                  borderRightColor: COLORS.RED,
                  transform: [{
                    rotate: holdAnim.interpolate({
                      inputRange: [0, 1], outputRange: ['0deg', '360deg'],
                    }),
                  }],
                }}
              />
            </Animated.View>
            <Text style={{ fontSize: FONT_SUB, color: COLORS.RED, fontWeight: '700', textAlign: 'center' }}>{T('exerciseFinishConfirm')}</Text>
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity onPress={() => { stopGpsTracking(); nav.goBack(); }}
            style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,.1)', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Linear progress bar */}
        <View style={{ marginTop: 32, width: 200, height: 4, backgroundColor: 'rgba(255,255,255,.1)', borderRadius: 2, overflow: 'hidden' }}>
          <Animated.View style={{ height: 4, backgroundColor: COLORS.RED, borderRadius: 2, width: holdAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
        </View>

        {/* Sound control */}
        <TouchableOpacity onPress={() => {
          const sounds = EXERCISE_SOUNDS;
          const idx = sounds.findIndex(s => s.key === selectedSound);
          const next = sounds[(idx + 1) % sounds.length];
          setSelectedSound(next.key);
          if (next.key === '无') { bgPlayer.pause(); }
          else { bgPlayer.play(); }
        }} style={{ marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,.08)' }}>
          <Music size={16} color={selectedSound !== '无' ? COLORS.ORANGE : 'rgba(255,255,255,.4)'} />
          <Text style={{ fontSize: FONT_SUB, color: selectedSound !== '无' ? COLORS.ORANGE : 'rgba(255,255,255,.4)' }}>{selectedSound}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Shared computed values ──
  const currentSet = sets.length + 1;
  const displayReps = reps || (sets.reduce((s, set) => s + set.reps, 0) + currentSetReps);

  // ── REPORT PAGE ──
  if (page === 'report') {
    const bestPace = segmentPaces.length > 0 ? Math.min(...segmentPaces) : 0;
    return (
      <View style={{ flex: 1, backgroundColor: TH.bg }}>
        <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: TH.cardSolid }}>
          <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>{T('exerciseReport')}</Text>
          <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 4 }}>{sportName} · {new Date().toLocaleDateString('zh-CN')}</Text>
        </View>

        {/* Map snapshot (static) */}
        {isGpsSport && coords.length > 1 && (
          <View style={{ height: 200, margin: 16, borderRadius: 16, overflow: 'hidden' }}>
            {amapReady && MapView ? (
              <MapView
                style={{ flex: 1 }}
                initialCameraPosition={{ target: initialPos, zoom: 14 }}
                myLocationEnabled={false}
                zoomGesturesEnabled={false}
                scrollGesturesEnabled={false}
              >
                <Polyline points={coords} color={color} width={4} />
              </MapView>
            ) : (
              <MapViewFallback />
            )}
          </View>
        )}

        {/* Data cards — dynamic based on sport type */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 }}>
          {[
            ...(sportType === 'gps' ? [{ label: T('exerciseDistance'), value: `${distKm.toFixed(2)} km` }] : []),
            ...(sportType === 'repetition' ? [{ label: T('exerciseTotalReps'), value: `${displayReps}` }] : []),
            { label: T('exerciseTime'), value: fmt(sec) },
            ...(sportType === 'gps' ? [{ label: T('exercisePace'), value: formatPace(distKm > 0 ? sec / distKm : 0) }] : []),
            { label: T('exerciseTotalCal'), value: `${calories} kcal` },
          ].map(d => (
            <View key={d.label} style={{ width: '47%', backgroundColor: TH.cardSolid, borderRadius: 12, padding: 16 }}>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{d.label}</Text>
              <Text style={{ fontSize: FONT_CLOSE, fontWeight: '800', color: TH.text, marginTop: 4 }}>{d.value}</Text>
            </View>
          ))}
        </View>

        {/* Sets breakdown for repetition sports */}
        {sets.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text, marginBottom: 8 }}>{T('exerciseSets')}</Text>
            <View style={{ backgroundColor: TH.cardSolid, borderRadius: 12, padding: 12 }}>
              {sets.map((s, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: i < sets.length - 1 ? 1 : 0, borderBottomColor: TH.border }}>
                  <Text style={{ fontSize: FONT_BODY, color: TH.text }}>{T('exerciseSet').replace('{n}', String(i + 1))}</Text>
                  <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text }}>{s.reps} {T('exerciseReps')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Segment paces */}
        {segmentPaces.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text, marginBottom: 8 }}>{T('exerciseSegmentPace')}</Text>
            <View style={{ backgroundColor: TH.cardSolid, borderRadius: 12, padding: 12 }}>
              {segmentPaces.map((p, i) => {
                const isBest = p === bestPace;
                const paceColor = isBest ? COLORS.GREEN : p < 300 ? COLORS.BLUE : p < 360 ? COLORS.YELLOW : COLORS.RED;
                return (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: i < segmentPaces.length - 1 ? 1 : 0, borderBottomColor: TH.border }}>
                    <Text style={{ fontSize: FONT_BODY, color: TH.text }}>{i + 1} km</Text>
                    <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: paceColor }}>{formatPace(p)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Save button */}
        <View style={{ padding: 16 }}>
          <TouchableOpacity onPress={handleSave}
            style={{ height: 56, borderRadius: 28, backgroundColor: COLORS.GREEN, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: '#fff' }}>{T('exerciseSave')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── ACTIVE PAGE (GPS) ──
  if (page === 'active' && isGpsSport) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Map area (40%) */}
        <View style={{ flex: 4 }}>
          {amapReady && MapView ? (
            <MapView
              ref={mapRef}
              style={{ flex: 1 }}
              initialCameraPosition={{ target: initialPos, zoom: 16 }}
              myLocationEnabled
            >
              {coords.length > 1 && <Polyline points={coords} color={color} width={4} />}
            </MapView>
          ) : (
            <MapViewFallback />
          )}
        </View>

        {/* Data area (60%) */}
        <View style={{ flex: 6, backgroundColor: '#1a1a2e', padding: 20 }}>
          {/* Target progress */}
          {mode === 'target' && (
            <View style={{ marginBottom: 16 }}>
              <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,.1)', borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ height: 6, width: `${targetProgress * 100}%`, backgroundColor: COLORS.GREEN, borderRadius: 3 }} />
              </View>
              <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>
                {T('exerciseProgress')}: {Math.round(targetProgress * 100)}%
              </Text>
            </View>
          )}

          {/* Main data row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: FONT_HERO, fontWeight: '900', color: '#fff', fontVariant: ['tabular-nums'] }}>{distKm.toFixed(2)}</Text>
              <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>km</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: FONT_HERO, fontWeight: '900', color: '#fff', fontVariant: ['tabular-nums'] }}>{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}</Text>
              <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>{T('exerciseTime')}</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: FONT_HERO, fontWeight: '900', color: '#fff', fontVariant: ['tabular-nums'] }}>{formatPace(distKm > 0 ? sec / distKm : 0)}</Text>
              <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>{T('exercisePace')}</Text>
            </View>
          </View>

          {/* Calories */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ fontSize: FONT_TITLE, color: COLORS.ORANGE, fontWeight: '700' }}>{calories} kcal</Text>
          </View>

          {/* Pause button */}
          <TouchableOpacity onPress={handlePause}
            style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}>
            <Pause size={32} color="#333" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── ACTIVE PAGE (Non-GPS) ──
  const lastSetReps = sets.length > 0 ? sets[sets.length - 1].reps : null;
  const restProgress = restSec > 0 ? restSec / 60 : 0; // 60s default rest
  const restCircumference = 2 * Math.PI * 44;
  const restStrokeDashoffset = restCircumference * (1 - restProgress);

  // Target info for header
  const targetInfo = mode === 'target' ? (() => {
    if (targetType === 'reps') return `${displayReps}/${targetValue}`;
    if (targetType === 'time') return `${Math.floor(sec / 60)}/${Math.floor(targetValue / 60)}min`;
    if (targetType === 'calories') return `${calories}/${targetValue}kcal`;
    return '';
  })() : '';

  // Soft target for free mode
  const softTarget = mode === 'free' ? getSoftTarget(sportName) : undefined;
  const softTargetValue = softTarget ? (softTarget.unit === 'min' ? softTarget.intermediate * 60 : softTarget.intermediate) : 0;
  const softTargetProgress = softTargetValue > 0
    ? Math.min((sportType === 'repetition' ? displayReps : sec) / softTargetValue, 1)
    : 0;
  const softTargetReached = softTargetProgress >= 1;
  const softTargetLabel = softTarget
    ? (softTarget.unit === 'min' ? `💡 建议 ${softTarget.intermediate} 分钟` : `💡 建议 ${softTarget.intermediate} 次`)
    : '';


  const gradientColors = EXPERIENCE_GRADIENTS[experienceType] || EXPERIENCE_GRADIENTS.strength;

  return (
    <LinearGradient colors={gradientColors as [string, string, string]} style={{ flex: 1 }}>

      {/* ── Rest Timer Overlay ── */}
      {isResting && experienceType !== 'interval' && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,.85)', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
          {/* Ring countdown */}
          <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={120} height={120} style={{ position: 'absolute' }}>
              <Circle cx={60} cy={60} r={44} stroke="rgba(255,255,255,.1)" strokeWidth={6} fill="none" />
              <Circle cx={60} cy={60} r={44} stroke={COLORS.ORANGE} strokeWidth={6} fill="none"
                strokeDasharray={restCircumference} strokeDashoffset={restStrokeDashoffset}
                strokeLinecap="round" rotation="-90" origin="60,60" />
            </Svg>
            <Text style={{ fontSize: FONT_HERO, fontWeight: '900', color: COLORS.ORANGE }}>{restSec}</Text>
          </View>
          <Text style={{ fontSize: FONT_BODY, color: 'rgba(255,255,255,.7)', marginTop: 12 }}>{T('exerciseRestTime')}</Text>

          {/* Set info card */}
          <View style={{ marginTop: 24, backgroundColor: 'rgba(255,255,255,.08)', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 16, minWidth: 200 }}>
            {lastSetReps !== null && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)' }}>{T('exerciseSet').replace('{n}', String(sets.length))}</Text>
                <Text style={{ fontSize: FONT_BODY, color: '#fff', fontWeight: '600' }}>{lastSetReps} {T('exerciseReps')}</Text>
              </View>
            )}
            {mode === 'target' && targetType === 'reps' && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)' }}>{T('exerciseSet').replace('{n}', String(currentSet))}</Text>
                <Text style={{ fontSize: FONT_BODY, color: COLORS.GREEN, fontWeight: '600' }}>{targetValue} {T('exerciseReps')} {T('exerciseTarget') || '目标'}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity onPress={() => { setIsResting(false); setRestSec(0); }}
            style={{ marginTop: 32, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 24, backgroundColor: 'rgba(255,255,255,.15)' }}>
            <Text style={{ color: '#fff', fontSize: FONT_BODY, fontWeight: '700' }}>{T('exerciseSkip')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Embedded Rest (interval sports) ── */}
      {isResting && experienceType === 'interval' && (
        <View style={{ position: 'absolute', top: 56, left: 20, right: 20, zIndex: 20, backgroundColor: 'rgba(0,0,0,.7)', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '800', color: COLORS.ORANGE, fontVariant: ['tabular-nums'] }}>{restSec}s</Text>
          <View style={{ flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,.15)', borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ height: 6, width: `${(1 - restSec / 60) * 100}%`, backgroundColor: COLORS.ORANGE, borderRadius: 3 }} />
          </View>
          <TouchableOpacity onPress={() => { setIsResting(false); setRestSec(0); }}
            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.15)' }}>
            <Text style={{ color: '#fff', fontSize: FONT_SUB }}>{T('exerciseSkip')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Celebration Overlay ── */}
      {showCelebration && (
        <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 15, pointerEvents: 'none' }}>
          <Animated.Text style={{
            fontSize: 64, fontWeight: '900', color: COLORS.GREEN,
            transform: [{ scale: celebrateAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.2] }) }],
            opacity: celebrateAnim,
          }}>
            🎯
          </Animated.Text>
        </Animated.View>
      )}

      {/* ── Milestone Toast ── */}
      {milestoneText && (
        <Animated.View style={{
          position: 'absolute', top: 100, left: 20, right: 20,
          alignItems: 'center', zIndex: 16, pointerEvents: 'none',
          opacity: milestoneAnim,
          transform: [{ translateY: milestoneAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        }}>
          <View style={{ backgroundColor: 'rgba(0,0,0,.7)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 }}>
            <Text style={{ fontSize: FONT_BODY, color: '#fff', fontWeight: '700' }}>{milestoneText}</Text>
          </View>
        </Animated.View>
      )}

      {/* ── Zone 1: Status Bar ── */}
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: FONT_CLOSE }}>{icon}</Text>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: '#bbb' }}>{sportName}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {sportType === 'repetition' && (
              <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)' }}>
                {T('exerciseSet').replace('{n}', String(currentSet))} · {sets.reduce((s, set) => s + set.reps, 0)} {T('exerciseReps')}
              </Text>
            )}
            {targetInfo ? (
              <Text style={{ fontSize: FONT_SUB, color: COLORS.GREEN }}>{targetInfo}</Text>
            ) : null}
            {/* Sound picker button */}
            <TouchableOpacity onPress={() => setShowSoundPicker(!showSoundPicker)} style={{ padding: 4 }}>
              <Music size={18} color={selectedSound !== '无' ? COLORS.ORANGE : 'rgba(255,255,255,.4)'} />
            </TouchableOpacity>
          </View>
        </View>
        {/* Sound picker dropdown */}
        {showSoundPicker && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.08)' }}>
            {EXERCISE_SOUNDS.map(s => (
              <TouchableOpacity key={s.key} onPress={() => {
                setSelectedSound(s.key);
                if (s.key === '无') { bgPlayer.pause(); }
                else { bgPlayer.play(); }
                setShowSoundPicker(false);
              }}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: selectedSound === s.key ? `${COLORS.ORANGE}30` : 'rgba(255,255,255,.08)' }}>
                <Text style={{ fontSize: FONT_SUB, color: selectedSound === s.key ? COLORS.ORANGE : 'rgba(255,255,255,.6)' }}>{s.key}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* ── Zone 2: Main Interaction ── */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>

        {/* Breathing guide animation (meditative sports) */}
        {isMeditative && breathGuideEnabled && page === 'active' && active && (
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <Animated.View style={{
              width: 160, height: 160, borderRadius: 80,
              borderWidth: 3, borderColor: COLORS.GREEN,
              alignItems: 'center', justifyContent: 'center',
              transform: [{ scale: breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.2] }) }],
              opacity: breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
            }}>
              <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: '#fff' }}>
                {breathPhase === 'inhale' ? '吸气...' : breathPhase === 'hold' ? '屏住...' : '呼气...'}
              </Text>
            </Animated.View>
            {/* Cycle dots */}
            <View style={{ flexDirection: 'row', marginTop: 16, gap: 8 }}>
              {['inhale', 'hold', 'exhale'].map((p, i) => (
                <View key={p} style={{
                  width: 10, height: 10, borderRadius: 5,
                  backgroundColor: breathPhase === p ? COLORS.GREEN : 'rgba(255,255,255,.2)',
                }} />
              ))}
            </View>
          </View>
        )}

        {/* Main display */}
        {isMeditative && breathGuideEnabled ? null : sportType === 'repetition' ? (
          <>
            <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
              <Text style={{ fontSize: FONT_HERO, fontWeight: '900', color: '#fff' }}>{currentSetReps}</Text>
            </Animated.View>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.45)', marginTop: 6 }}>{T('exerciseReps')}</Text>

            {/* Rep controls with long press */}
            <View style={{ flexDirection: 'row', marginTop: 20, gap: 16, alignItems: 'center' }}>
              <Animated.View style={{ transform: [{ scale: minusRippleAnim }] }}>
                <TouchableOpacity
                  onPressIn={() => startLongPress(-1)}
                  onPressOut={() => stopLongPress(-1)}
                  style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,.15)', alignItems: 'center', justifyContent: 'center' }}>
                  <Minus size={24} color="#fff" />
                </TouchableOpacity>
              </Animated.View>
              <Animated.View style={{ transform: [{ scale: plusRippleAnim }] }}>
                <TouchableOpacity
                  onPressIn={() => startLongPress(1)}
                  onPressOut={() => stopLongPress(1)}
                  style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.GREEN, alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={32} color="#fff" />
                </TouchableOpacity>
              </Animated.View>
              <TouchableOpacity onPress={() => setCurrentSetReps(r => r + 5)}
                style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,.15)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_TITLE }}>+5</Text>
              </TouchableOpacity>
            </View>

            {/* Complete set button */}
            {currentSetReps > 0 && (
              <TouchableOpacity onPress={handleCompleteSet}
                style={{ marginTop: 20, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 24, backgroundColor: `${COLORS.GREEN}30`, borderWidth: 1, borderColor: COLORS.GREEN }}>
                <Text style={{ color: COLORS.GREEN, fontSize: FONT_BODY, fontWeight: '700' }}>{T('exerciseSetComplete')}</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            {/* Timed: countdown in target mode, count-up in free mode */}
            <Text style={{ fontSize: FONT_HERO, fontWeight: '900', color: '#fff' }}>
              {mode === 'target' && targetType === 'time'
                ? Math.max(0, Math.floor((targetValue - sec) / 60))
                : Math.floor(sec / 60) || 0}
            </Text>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.45)', marginTop: 6 }}>
              {mode === 'target' && targetType === 'time' ? T('exerciseEstRemaining') || '剩余' : 'min'}
            </Text>
            {/* Show elapsed time below for target mode */}
            {mode === 'target' && targetType === 'time' && (
              <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.35)', marginTop: 4 }}>
                {fmt(sec)} / {fmt(targetValue)}
              </Text>
            )}
          </>
        )}

        {/* Set history cards */}
        {sets.length > 0 && (
          <View style={{ flexDirection: 'row', marginTop: 20, gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {sets.slice(-3).map((s, i) => {
              const idx = sets.length - 3 + i;
              return (
                <View key={idx} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.08)' }}>
                  <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)' }}>
                    {T('exerciseSet').replace('{n}', String(idx + 1))}: {s.reps}
                  </Text>
                </View>
              );
            })}
            {sets.length > 3 && (
              <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.05)' }}>
                <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.3)' }}>+{sets.length - 3}</Text>
              </View>
            )}
          </View>
        )}

        {/* Target progress — always visible when target set */}
        {mode === 'target' && (
          <View style={{ marginTop: 20, width: '100%', paddingHorizontal: 20 }}>
            <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,.1)', borderRadius: 3, overflow: 'hidden' }}>
              <Animated.View style={{ height: 6, width: `${Math.min(targetProgress * 100, 100)}%`, backgroundColor: COLORS.GREEN, borderRadius: 3, opacity: pulseAnim }} />
            </View>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 4, textAlign: 'center' }}>
              {targetType === 'reps' ? `${displayReps} / ${targetValue} ${T('exerciseReps')}` : `${Math.round(targetProgress * 100)}%`}
            </Text>
          </View>
        )}

        {/* Soft target — free mode recommendation */}
        {mode === 'free' && softTarget && (
          <View style={{ marginTop: 20, width: '100%', paddingHorizontal: 20 }}>
            <Text style={{ fontSize: FONT_SUB, color: softTargetReached ? COLORS.GREEN : 'rgba(255,255,255,.35)', textAlign: 'center', marginBottom: 4 }}>
              {softTargetReached ? '✓ 达标' : softTargetLabel}
            </Text>
            <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,.08)', borderRadius: 2, overflow: 'hidden' }}>
              <View style={{ height: 4, width: `${softTargetProgress * 100}%`, backgroundColor: softTargetReached ? COLORS.GREEN : 'rgba(255,255,255,.2)', borderRadius: 2 }} />
            </View>
          </View>
        )}
      </View>

      {/* ── Zone 3: Bottom Action Bar ── */}
      <View style={{ paddingBottom: 48, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Duration */}
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: '#fff', fontVariant: ['tabular-nums'] }}>
            {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}
          </Text>
          <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>{T('exerciseTotalDuration')}</Text>
        </View>

        {/* Pause button with long-press to finish */}
        <Animated.View style={{ transform: [{ scale: pauseHoldAnim }] }}>
          <TouchableOpacity
            onPress={handlePause}
            onPressIn={handlePauseLongPressStart}
            onPressOut={handlePauseLongPressEnd}
            style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Pause size={28} color="#333" />
          </TouchableOpacity>
        </Animated.View>

        {/* Calories */}
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '700', color: COLORS.ORANGE }}>{calories}</Text>
          <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>kcal</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({});
