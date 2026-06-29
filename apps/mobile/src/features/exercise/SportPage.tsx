import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useRootNavigation } from '../../navigation/hooks';
import { useKeepAwake } from 'expo-keep-awake';
import { useTheme, useT } from '../../components/UI';
import { SPORT_BG_COLORS, COLORS, getSportType, TARGET_PRESETS, estimateCalories, MET_MAP, FONT_HERO, FONT_SUB, FONT_TITLE, FONT_STAT_CARD, FONT_STAT_SECTION, getSoftTarget, getSportExperienceType, formatPace, createLogger } from '@egoless-do/core';
import type { SportType } from '@egoless-do/core';

const log = createLogger('Exercise');
import { useAppStore } from '../../store/useAppStore';
import { Pause } from 'lucide-react-native';
import type { RootStackParamList } from '../../navigation/hooks';

// 实时会话
import { createSession, deleteSession, updateSession } from '../global-pulse/services/activeSessionApi';
import { useGoalResolver } from '../global-pulse/hooks/useGoalResolver';
import { useSessionHeartbeat } from '../global-pulse/hooks/useSessionHeartbeat';
import { ActiveInsightBar } from '../global-pulse/components/ActiveInsightBar';

// Hooks
import { useExerciseTimer } from './hooks/useExerciseTimer';
import { useExerciseAudio } from './hooks/useExerciseAudio';
import { useMusicStore } from '../music/useMusicStore';
import { useExerciseRest } from './hooks/useExerciseRest';
import { useExerciseSets } from './hooks/useExerciseSets';
import { useExerciseTargets } from './hooks/useExerciseTargets';
import { useAmapComponents } from './hooks/useAmapComponents';
import { reqLocPerm, getCurPos, watchPos, computeDistance } from './hooks/useExerciseGps';

// Pages
import PrepPage from './pages/PrepPage';
import CountdownPage from './pages/CountdownPage';
import PausedPage from './pages/PausedPage';
import ReportPage from './pages/ReportPage';

// Layouts
import MeditativeActive from './layouts/MeditativeActive';
import EnduranceActive from './layouts/EnduranceActive';
import StrengthActive from './layouts/StrengthActive';
import GpsActive from './layouts/GpsActive';


type Route = RouteProp<RootStackParamList, 'Sport'>;

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
  const sportType = getSportType(sportName, isGpsSport);
  const experienceType = getSportExperienceType(sportName, sportType);
  const isMeditative = experienceType === 'meditative';
  const bg = SPORT_BG_COLORS[sportName] || color || '#4CAF50';

  useKeepAwake();

  // ── Hooks ──
  const timer = useExerciseTimer();
  const audio = useExerciseAudio();
  const rest  = useExerciseRest();
  const musicTrack = useMusicStore(s => s.currentTrack);
  const musicIsPlaying = useMusicStore(s => s.isPlaying);
  const musicLoop = useMusicStore(s => s.loop);
  const musicPause = useMusicStore(s => s.pause);
  const musicResume = useMusicStore(s => s.resume);
  const musicToggleLoop = useMusicStore(s => s.toggleLoop);

  // ── 实时会话管理 ──
  const sessionIdRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [insight, setInsight] = useState('');
  const { resolveGoal } = useGoalResolver();

  // 心跳
  useSessionHeartbeat(sessionIdRef.current, sessionIdRef.current ? 'exercise' : null);

  // 创建/删除会话
  useEffect(() => {
    if (timer.page === 'active' && timer.active && !sessionIdRef.current) {
      const userHash = store.auth.user?.id || '';
      if (!userHash) return;
      const goal = resolveGoal('exercise');
      createSession({
        user_hash: userHash,
        nickname: store.userProfile?.nickname || '',
        type: 'exercise',
        goal: goal || undefined,
        sport_key: sportName,
        sport_icon: icon,
      }).then(result => {
        if (result.success && result.data) {
          sessionIdRef.current = result.data.session_id;
        }
      });
    }
  }, [timer.page, timer.active]);

  // 更新感悟
  const handleInsightChange = useCallback((text: string) => {
    setInsight(text);
    if (sessionIdRef.current) {
      // debounce: 只在停止输入 1s 后更新
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        updateSession(sessionIdRef.current!, { insight: text });
      }, 1000);
    }
  }, []);

  // 删除会话（通用清理）
  const cleanupSession = useCallback(() => {
    if (sessionIdRef.current) {
      deleteSession(sessionIdRef.current);
      sessionIdRef.current = null;
    }
  }, []);

  const onBellAndRest = useCallback(() => {
    audio.playBell();
    rest.startRest(60);
  }, [audio, rest]);

  const sets = useExerciseSets(onBellAndRest);

  // ── Mode & target state ──
  const [mode, setMode] = useState<'free' | 'target'>('free');
  const presets = TARGET_PRESETS[sportType] ?? {};
  const availableTargetTypes = Object.keys(presets) as Array<'distance' | 'time' | 'calories' | 'reps'>;
  const [targetType, setTargetType] = useState<string>(availableTargetTypes[0]);
  const [targetValue, setTargetValue] = useState(presets[availableTargetTypes[0]]?.[0]?.value ?? 0);

  // ── Breathing state ──
  const [breathGuideEnabled, setBreathGuideEnabled] = useState(isMeditative);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const breathAnim = useRef(new Animated.Value(0)).current;
  const breathTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const breathCycleRef = useRef(0);

  // ── GPS state ──
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; ts: number }[]>([]);
  const [initialPos, setInitialPos] = useState({ latitude: 39.9042, longitude: 116.4074 });
  const [segmentPaces, setSegmentPaces] = useState<number[]>([]);
  const lastKmMarkRef = useRef(0);
  const lastKmTsRef = useRef(0);
  const locationSub = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const pauseHoldAnim = useRef(new Animated.Value(1)).current;

  // ── Computed ──
  const distKm = computeDistance(coords);
  const calories = estimateCalories(sportName, timer.sec, weight);

  // Recalculate targets with actual values
  const actualTargets = useExerciseTargets({
    sportName, sportType, mode, targetType, targetValue,
    sec: timer.sec, distKm, calories, totalReps: sets.totalReps,
    playBell: audio.playBell,
  });

  // ── Breathing guide cycle ──
  useEffect(() => {
    if (!breathGuideEnabled || timer.page !== 'active' || !timer.active) {
      if (breathTimerRef.current) { clearTimeout(breathTimerRef.current); breathTimerRef.current = null; }
      return;
    }
    const PHASE_DURATION = 4000;
    const runPhase = () => {
      const cycle = breathCycleRef.current;
      if (cycle === 0) {
        setBreathPhase('inhale');
        breathAnim.setValue(0);
        Animated.timing(breathAnim, { toValue: 1, duration: PHASE_DURATION, useNativeDriver: false }).start();
        audio.playBell();
      } else if (cycle === 1) {
        setBreathPhase('hold');
      } else {
        setBreathPhase('exhale');
        Animated.timing(breathAnim, { toValue: 0, duration: PHASE_DURATION, useNativeDriver: false }).start();
        audio.playBell();
      }
      breathTimerRef.current = setTimeout(() => {
        breathCycleRef.current = (breathCycleRef.current + 1) % 3;
        runPhase();
      }, PHASE_DURATION);
    };
    runPhase();
    return () => { if (breathTimerRef.current) { clearTimeout(breathTimerRef.current); breathTimerRef.current = null; } };
  }, [breathGuideEnabled, timer.page, timer.active]);

  // ── GPS tracking ──
  const startGpsTracking = useCallback(async () => {
    if (locationSub.current) return;
    const { status } = await reqLocPerm();
    if (status !== 'granted') return;
    locationSub.current = await watchPos(loc => {
      const c = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, ts: Date.now() };
      setCoords(arr => [...arr, c]);
      mapRef.current?.moveCamera({ target: c, zoom: 16 }, 300);
    });
  }, []);

  const stopGpsTracking = useCallback(() => {
    locationSub.current?.remove();
    locationSub.current = null;
  }, []);

  // Start GPS when active begins
  useEffect(() => {
    if (timer.page === 'active' && timer.active && isGpsSport) {
      startGpsTracking();
    }
    return () => { stopGpsTracking(); };
  }, [timer.page, timer.active, isGpsSport, startGpsTracking, stopGpsTracking]);

  // Init GPS position
  useEffect(() => {
    let mounted = true;
    if (isGpsSport) {
      (async () => {
        try {
          const { status } = await reqLocPerm();
          if (!mounted) return;
          if (status === 'granted') {
            const loc = await getCurPos();
            if (mounted && loc) setInitialPos({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          }
        } catch (e) { log.warn('Location error:', e); }
      })();
    }
    return () => { mounted = false; };
  }, []);

  // Segment pace tracking
  useEffect(() => {
    if (!isGpsSport || timer.page !== 'active') return;
    const currentKm = Math.floor(distKm);
    if (currentKm > lastKmMarkRef.current && lastKmMarkRef.current >= 0) {
      const segTime = timer.sec - lastKmTsRef.current;
      setSegmentPaces(prev => [...prev, segTime]);
      lastKmMarkRef.current = currentKm;
      lastKmTsRef.current = timer.sec;
    }
  }, [distKm, isGpsSport, timer.page, timer.sec]);

  // Target/milestone checks
  useEffect(() => {
    if (timer.page === 'active' && timer.active) {
      actualTargets.checkTargetReached();
      actualTargets.checkMilestone();
      actualTargets.checkSoftTargetBell();
    }
  }, [timer.sec, timer.page, timer.active, sets.currentSetReps, sets.sets.length]);

  // Triggers bounce on rep change
  useEffect(() => {
    if (sets.currentSetReps > 0) sets.triggerBounce();
  }, [sets.currentSetReps]);

  // ── Handlers ──
  const handleGo = useCallback(() => {
    timer.handleGo();
  }, [timer]);

  const handlePause = useCallback(() => {
    stopGpsTracking();
    timer.handlePause();
  }, [timer, stopGpsTracking]);

  const handleContinue = useCallback(() => {
    timer.handleContinue();
    if (isGpsSport) startGpsTracking();
  }, [timer, isGpsSport, startGpsTracking]);

  // 组件卸载时清理会话
  useEffect(() => {
    return () => { cleanupSession(); };
  }, [cleanupSession]);

  const savingRef = useRef(false);
  const handleSave = useCallback(() => {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      cleanupSession();
      stopGpsTracking();
      const finalReps = sportType === 'repetition' ? sets.totalReps : undefined;
      if (timer.sec > 0 || (finalReps && finalReps > 0)) {
        const entry = {
          sportKey: sportName, sportIcon: icon, durationSec: timer.sec,
          timestamp: Date.now(), isGpsSport,
          distanceKm: isGpsSport ? distKm : undefined,
          calories,
          avgPace: isGpsSport && distKm > 0 ? timer.sec / distKm : undefined,
          trackPoints: isGpsSport ? coords.map(c => ({ lat: c.latitude, lng: c.longitude, ts: c.ts })) : undefined,
          segmentPaces: segmentPaces.length > 0 ? segmentPaces : undefined,
          mode,
          target: mode === 'target' ? { type: targetType as 'distance' | 'time' | 'calories' | 'reps', value: targetValue } : undefined,
          reps: finalReps,
          sets: sets.sets.length > 0 ? sets.sets : undefined,
          met: MET_MAP[sportName],
        };
        store.addExercise(entry);
        if (useAppStore.getState().healthSyncEnabled) {
          import('../health/HealthService').then(({ writeWorkout }) => {
            return writeWorkout({ ...entry, id: '', updatedAt: 0, deleted: false });
          }).catch(e => log.warn('Health write failed:', e));
        }
      }
    } catch (e) {
      log.error(e, { message: 'Save failed' });
      savingRef.current = false;
      return;
    }
    nav.goBack();
  }, [timer.sec, sets, sportName, icon, isGpsSport, distKm, calories, coords, segmentPaces, mode, targetType, targetValue, store, nav]);

  // ── GPS Pause handler (stays inline for GPS sports) ──
  const handleGpsPause = useCallback(() => {
    stopGpsTracking();
    timer.handlePause();
  }, [timer, stopGpsTracking]);

  // Target info string
  const targetInfo = mode === 'target' ? (() => {
    if (targetType === 'reps') return `${sets.totalReps}/${targetValue}`;
    if (targetType === 'time') return `${Math.floor(timer.sec / 60)}/${Math.floor(targetValue / 60)}min`;
    if (targetType === 'calories') return `${calories}/${targetValue}kcal`;
    return '';
  })() : '';

  // Current set number
  const currentSet = sets.sets.length + 1;

  // ── Page routing ──
  const { page } = timer;

  // Prep page
  if (page === 'prep') {
    return (
      <PrepPage
        icon={icon} sportName={sportName} sportType={sportType} experienceType={experienceType}
        bg={TH.primary} isGpsSport={isGpsSport}
        sec={timer.sec} countdown={timer.countdown} holdAnim={timer.holdAnim} scaleAnim={timer.scaleAnim} pulseAnim={timer.pulseAnim}
        mode={mode} setMode={setMode} targetType={targetType} setTargetType={setTargetType}
        targetValue={targetValue} setTargetValue={setTargetValue}
        breathGuideEnabled={breathGuideEnabled} setBreathGuideEnabled={setBreathGuideEnabled}
        isMeditative={isMeditative}
        selectedSound={audio.selectedSound} cycleSound={audio.cycleSound} selectSound={audio.selectSound} bgPlayer={audio.bgPlayer}
        sets={sets.sets} currentSetReps={sets.currentSetReps} totalReps={sets.totalReps}
        distKm={distKm} calories={calories} coords={coords} initialPos={initialPos}
        amapReady={amapReady} MapView={MapView} Polyline={Polyline} mapRef={mapRef}
        segmentPaces={segmentPaces}
        handleGo={handleGo} handlePause={handlePause} handleContinue={handleContinue}
        handleHoldStart={timer.handleHoldStart} handleHoldEnd={timer.handleHoldEnd}
        handleSave={handleSave} onGoBack={() => nav.goBack()}
        exerciseLog={(store.exerciseLog ?? []).filter(e => !e.deleted)}
        TH={TH} T={T}
      />
    );
  }

  // Countdown page
  if (page === 'countdown') {
    return <CountdownPage countdown={timer.countdown} label={T('exerciseCountdown')} />;
  }

  // Paused page
  if (page === 'paused') {
    return (
      <PausedPage
        icon={icon} sportName={sportName} sportType={sportType} experienceType={experienceType}
        bg={bg} isGpsSport={isGpsSport}
        sec={timer.sec} countdown={timer.countdown} holdAnim={timer.holdAnim} scaleAnim={timer.scaleAnim} pulseAnim={timer.pulseAnim}
        mode={mode} setMode={setMode} targetType={targetType} setTargetType={setTargetType}
        targetValue={targetValue} setTargetValue={setTargetValue}
        breathGuideEnabled={breathGuideEnabled} setBreathGuideEnabled={setBreathGuideEnabled}
        isMeditative={isMeditative}
        selectedSound={audio.selectedSound} cycleSound={audio.cycleSound} selectSound={audio.selectSound} bgPlayer={audio.bgPlayer}
        sets={sets.sets} currentSetReps={sets.currentSetReps} totalReps={sets.totalReps}
        distKm={distKm} calories={calories} coords={coords} initialPos={initialPos}
        amapReady={amapReady} MapView={MapView} Polyline={Polyline} mapRef={mapRef}
        segmentPaces={segmentPaces}
        handleGo={handleGo} handlePause={handlePause} handleContinue={handleContinue}
        handleHoldStart={timer.handleHoldStart} handleHoldEnd={timer.handleHoldEnd}
        handleSave={handleSave} onGoBack={() => nav.goBack()} setPage={timer.setPage}
        exerciseLog={(store.exerciseLog ?? []).filter(e => !e.deleted)}
        TH={TH} T={T}
      />
    );
  }

  // Report page
  if (page === 'report') {
    return (
      <ReportPage
        icon={icon} sportName={sportName} sportType={sportType} experienceType={experienceType}
        bg={bg} isGpsSport={isGpsSport}
        sec={timer.sec} countdown={timer.countdown} holdAnim={timer.holdAnim} scaleAnim={timer.scaleAnim} pulseAnim={timer.pulseAnim}
        mode={mode} setMode={setMode} targetType={targetType} setTargetType={setTargetType}
        targetValue={targetValue} setTargetValue={setTargetValue}
        breathGuideEnabled={breathGuideEnabled} setBreathGuideEnabled={setBreathGuideEnabled}
        isMeditative={isMeditative}
        selectedSound={audio.selectedSound} cycleSound={audio.cycleSound} selectSound={audio.selectSound} bgPlayer={audio.bgPlayer}
        sets={sets.sets} currentSetReps={sets.currentSetReps} totalReps={sets.totalReps}
        distKm={distKm} calories={calories} coords={coords} initialPos={initialPos}
        amapReady={amapReady} MapView={MapView} Polyline={Polyline} mapRef={mapRef}
        segmentPaces={segmentPaces}
        handleGo={handleGo} handlePause={handlePause} handleContinue={handleContinue}
        handleHoldStart={timer.handleHoldStart} handleHoldEnd={timer.handleHoldEnd}
        handleSave={handleSave} onGoBack={() => nav.goBack()}
        exerciseLog={(store.exerciseLog ?? []).filter(e => !e.deleted)}
        TH={TH} T={T}
      />
    );
  }

  // ── Active page ──

  // GPS active page
  if (page === 'active' && isGpsSport) {
    return (
      <View style={{ flex: 1 }}>
        <GpsActive
          MapView={MapView} Polyline={Polyline} amapReady={amapReady}
          mapRef={mapRef} initialPos={initialPos} coords={coords} color={color}
          mode={mode} targetProgress={actualTargets.targetProgress}
          distKm={distKm} sec={timer.sec} calories={calories}
          handlePause={handleGpsPause} T={T}
        />
        <ActiveInsightBar
          type="exercise"
          insight={insight}
          onInsightChange={handleInsightChange}
          goal={resolveGoal('exercise')}
        />
      </View>
    );
  }

  // Non-GPS active page — route to layout by experience type
  const layoutProps = {
    icon, sportName, experienceType, sportType, bg,
    sec: timer.sec, active: timer.active,
    sets: sets.sets, currentSetReps: sets.currentSetReps, totalReps: sets.totalReps, currentSet,
    mode, targetType, targetValue,
    targetProgress: actualTargets.targetProgress, targetInfo,
    softTargetReached: actualTargets.softTargetReached,
    softTargetLabel: actualTargets.softTargetLabel,
    softTargetProgress: actualTargets.softTargetProgress,
    isResting: rest.isResting, restSec: rest.restSec, skipRest: rest.skipRest,
    selectedSound: audio.selectedSound, showSoundPicker: audio.showSoundPicker,
    onToggleSoundPicker: () => audio.setShowSoundPicker(!audio.showSoundPicker),
    onSelectSound: audio.selectSound,
    bounceAnim: sets.bounceAnim, plusRippleAnim: sets.plusRippleAnim,
    minusRippleAnim: sets.minusRippleAnim, pulseAnim: actualTargets.pulseAnim,
    celebrateAnim: actualTargets.celebrateAnim, milestoneAnim: actualTargets.milestoneAnim,
    milestoneText: actualTargets.milestoneText, showCelebration: actualTargets.showCelebration,
    breathGuideEnabled, breathPhase, breathAnim,
    handlePause, handleCompleteSet: sets.handleCompleteSet,
    startLongPress: sets.startLongPress, stopLongPress: sets.stopLongPress,
    setCurrentSetReps: sets.setCurrentSetReps,
    onPressInPauseLong: () => {}, onPressOutPauseLong: () => {},
    pauseHoldAnim,
    calories,
    softTarget: actualTargets.softTarget,
    musicTrack, musicIsPlaying, musicLoop,
    onMusicTogglePlay: () => musicIsPlaying ? musicPause() : musicResume(),
    onMusicToggleLoop: musicToggleLoop,
    onMusicPressTrackName: () => nav.navigate('Music'),
    T,
  };

  const activeLayout = (() => {
    switch (experienceType) {
      case 'meditative': return <MeditativeActive {...layoutProps} />;
      case 'endurance':  return <EnduranceActive {...layoutProps} />;
      case 'interval':   return <StrengthActive {...layoutProps} restMode="inline" />;
      default:           return <StrengthActive {...layoutProps} />;
    }
  })();

  return (
    <View style={{ flex: 1 }}>
      {activeLayout}
      <ActiveInsightBar
        type="exercise"
        insight={insight}
        onInsightChange={handleInsightChange}
        goal={resolveGoal('exercise')}
      />
    </View>
  );
}
