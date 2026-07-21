import { SPORT_BG_COLORS, COLORS, getSportType, TARGET_PRESETS, estimateCalories, MET_MAP, getSportExperienceType, createLogger, EXERCISE_CATEGORIES, type ExerciseDef } from '@egoless-do/core';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useKeepAwake } from 'expo-keep-awake';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Animated, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme, useT } from '../../components/UI';
import { useRootNavigation } from '../../navigation/hooks';

import ComboProgressHeader from './components/ComboProgressHeader';
import TransitionScreen from './components/TransitionScreen';
import type { ExerciseResult } from './components/ComboProgressHeader';




const log = createLogger('Exercise');
import type { RootStackParamList } from '../../navigation/hooks';
import { useAppStore, useShallowStore } from '../../store/useAppStore';

// 实时会话
import { ActiveInsightBar } from '../global-pulse/components/ActiveInsightBar';
import { useGoalResolver } from '../global-pulse/hooks/useGoalResolver';
import { useSessionHeartbeat } from '../global-pulse/hooks/useSessionHeartbeat';
import { createSession, deleteSession, updateSession } from '../global-pulse/services/activeSessionApi';

// Hooks
import MusicPickerModal from '../music/components/MusicPickerModal';
import { useMusicStore } from '../music/useMusicStore';
import { audioPlayerRef } from '../music/services/audioPlayerRef';

import { useAmapComponents } from './hooks/useAmapComponents';
import { useExerciseAudio } from './hooks/useExerciseAudio';
import { reqLocPerm, getCurPos, watchPos, computeDistance } from './hooks/useExerciseGps';
import { useExerciseRest } from './hooks/useExerciseRest';
import { useExerciseSets } from './hooks/useExerciseSets';
import { useExerciseTargets } from './hooks/useExerciseTargets';
import { useExerciseTimer } from './hooks/useExerciseTimer';

// Pages
import EnduranceActive from './layouts/EnduranceActive';
import GpsActive from './layouts/GpsActive';
import MeditativeActive from './layouts/MeditativeActive';
import StrengthActive from './layouts/StrengthActive';
import CountdownPage from './pages/CountdownPage';
import PausedPage from './pages/PausedPage';
import PrepPage from './pages/PrepPage';
import ReportPage from './pages/ReportPage';

// Layouts


type Route = RouteProp<RootStackParamList, 'Sport'>;

export default function SportPage() {
  const nav   = useRootNavigation();
  const route = useRoute<Route>();
  const TH    = useTheme();
  const T     = useT();
  const insets = useSafeAreaInsets();
  const { auth, userProfile, addExercise, exerciseLog, updateBodyTrainingPlan } = useShallowStore(s => ({ auth: s.auth, userProfile: s.userProfile, addExercise: s.addExercise, exerciseLog: s.exerciseLog, updateBodyTrainingPlan: s.updateBodyTrainingPlan }));
  const { MapView, Polyline, ready: amapReady } = useAmapComponents();
  const { key: sportName, icon, color, gps: gpsParam, planId, planTaskWeekday, exercises: comboExercises, comboPlanId } = route.params;

  const isComboMode = !!comboExercises && comboExercises.length > 0;
  const comboState = useRef<{
    exercises: ExerciseDef[];
    currentIndex: number;
    results: ExerciseResult[];
    totalDurationSec: number;
    totalCalories: number;
  }>({
    exercises: comboExercises ?? [],
    currentIndex: 0,
    results: [],
    totalDurationSec: 0,
    totalCalories: 0,
  });

  // 组合模式下，当前动作的属性动态变化
  const currentComboExercise = isComboMode ? comboExercises![comboState.current.currentIndex] : null;
  const effectiveSportName = isComboMode ? (currentComboExercise?.category || sportName) : sportName;
  const effectiveIcon = isComboMode ? (currentComboExercise?.icon || icon) : icon;
  const effectiveGps = isComboMode
  ? (currentComboExercise?.category === 'walking' || currentComboExercise?.category === 'cardio')
  : (gpsParam ?? false);

  // 翻译运动名称：category key → 可读名称
  const effectiveSportLabel = useMemo(() => {
    const cat = EXERCISE_CATEGORIES.find(c => c.key === effectiveSportName);
    return cat ? T(cat.i18nKey) : effectiveSportName;
  }, [effectiveSportName, T]);

  const isGpsSport = effectiveGps;
  const weight = userProfile?.weight ?? 70;
  const sportType = getSportType(effectiveSportName, isGpsSport);
  const experienceType = getSportExperienceType(effectiveSportName, sportType);
  const isMeditative = experienceType === 'meditative';
  const bg = SPORT_BG_COLORS[effectiveSportName] || color || '#4CAF50';

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
  const musicStop = useMusicStore(s => s.stop);
  const [showMusicPicker, setShowMusicPicker] = useState(false);

  // ── 实时会话管理 ──
  const sessionIdRef = useRef<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [insight, setInsight] = useState('');
  const { resolveGoal } = useGoalResolver();

  // 心跳
  useSessionHeartbeat(sessionId, sessionId ? 'exercise' : null);

  // 创建/删除会话
  useEffect(() => {
    if (timer.page === 'active' && timer.active && !sessionIdRef.current) {
      const userHash = auth.user?.id || '';
      if (!userHash) return;
      const goal = resolveGoal('exercise');
      createSession({
        user_hash: userHash,
        nickname: userProfile?.nickname || '',
        type: 'exercise',
        goal: goal || undefined,
        sport_key: effectiveSportName,
        sport_icon: effectiveIcon,
      }).then(result => {
        if (result.success && result.data) {
          sessionIdRef.current = result.data.session_id;
          setSessionId(result.data.session_id);
        }
      });
    }
  }, [timer.page, timer.active, auth.user?.id, userProfile?.nickname, resolveGoal, sportName, icon]);

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
    if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null; }
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
  const audioRef = useRef(audio);
  audioRef.current = audio;

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
  const calories = estimateCalories(effectiveSportName, timer.sec, weight);

  // Recalculate targets with actual values
  const actualTargets = useExerciseTargets({
    sportName: effectiveSportName, sportType, mode, targetType, targetValue,
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
  }, [isGpsSport]);

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
  }, [timer.sec, timer.page, timer.active, sets.currentSetReps, sets.sets.length, actualTargets]);

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

  // ── 组合模式：返回确认 ──
  const handleComboBack = useCallback(() => {
    if (comboState.current.currentIndex === 0 && !comboState.current.results.length) {
      nav.goBack();
      return;
    }
    Alert.alert(
      T('bodyFlowExitConfirm') || '退出练习流程？',
      undefined,
      [
        { text: T('bodyCancel') || '取消', style: 'cancel' },
        { text: T('bodyFlowSkip') || '退出', style: 'destructive', onPress: () => { resetComboSession(); nav.goBack(); } },
      ]
    );
  }, [T, nav]);

  const resetComboSession = useCallback(() => {
    musicStop();
    try { audioPlayerRef.current?.pause(); } catch {}
    audio.stopAll();
    cleanupSession();
    stopGpsTracking();
  }, [musicStop, audio.stopAll, cleanupSession, stopGpsTracking]);

  // ── 组合模式：获取当前动作的休息时间 ──
  const getRestSec = useCallback((exercise: ExerciseDef): number => {
    if (exercise.type === 'strength') return 60;
    if (exercise.type === 'cardio') return 30;
    if (exercise.type === 'traditional' || exercise.type === 'flexibility') return 15;
    return 30;
  }, []);

  // ── 组合模式：保存当前动作，前进到下一个 ──
  const goToNextExercise = useCallback(() => {
    if (!isComboMode || !comboExercises) return;

    // 1. 保存当前动作结果
    const finalReps = sportType === 'repetition' ? sets.totalReps : undefined;
    const entry: Record<string, unknown> = {
      sportKey: effectiveSportName, sportIcon: effectiveIcon, durationSec: timer.sec,
      timestamp: Date.now(), isGpsSport: false,
      distanceKm: undefined,
      calories,
      reps: finalReps,
      sets: sets.sets.length > 0 ? sets.sets : undefined,
      met: MET_MAP[effectiveSportName] || currentComboExercise?.met,
      planId: comboPlanId || planId,
      planTaskWeekday,
    };
    addExercise(entry);

    const result: ExerciseResult = {
      sportKey: effectiveSportName,
      icon: effectiveIcon,
      durationSec: timer.sec,
      calories,
      reps: finalReps ?? 0,
      timestamp: entry.timestamp as number,
    };

    comboState.current.results.push(result);
    comboState.current.totalDurationSec += timer.sec;
    comboState.current.totalCalories += calories;

    // 2. 前进到下一动作
    comboState.current.currentIndex++;
    if (comboState.current.currentIndex < comboExercises.length) {
      // 重置 hooks
      timer.reset();
      sets.reset();
      // 进入过渡页
      timer.setPage('transition');
    } else {
      // 全部完成 → 保存并返回
      handleSaveAll();
    }
  }, [isComboMode, comboExercises, effectiveSportName, effectiveIcon, timer, sets, calories, comboPlanId, planId, planTaskWeekday, sportType]);

  // ── 组合模式：全部完成，返回聚合结果到 BodyFlow ──
  const handleSaveAll = useCallback(() => {
    try {
      musicStop();
      try { audioPlayerRef.current?.pause(); } catch {}
      audio.stopAll();
      cleanupSession();
      stopGpsTracking();

      const totalRepsVal = comboState.current.results.reduce((s, r) => s + r.reps, 0);
      const result: Record<string, unknown> = {};
      if (comboState.current.totalDurationSec > 0) {
        result.sportResult = {
          completed: true,
          durationSec: comboState.current.totalDurationSec,
          calories: comboState.current.totalCalories,
          reps: totalRepsVal,
          sportKey: 'combo',
          isCombo: true,
          exercises: comboState.current.results,
        };
      }
      nav.navigate('MainTabs' as never, { screen: 'Body', params: result } as never);
    } catch (e) {
      log.error(e, { message: 'Combo save failed' });
    }
  }, [nav, musicStop, audio.stopAll, cleanupSession, stopGpsTracking]);

  // 组件卸载时清理会话
  useEffect(() => {
    return () => { cleanupSession(); };
  }, [cleanupSession]);

  const savingRef = useRef(false);
  const handleSave = useCallback(() => {
    if (savingRef.current) return;
    savingRef.current = true;

    // 组合模式：保存当前动作并前进到下一个
    if (isComboMode) {
      savingRef.current = false;
      goToNextExercise();
      return;
    }

    // 单运动模式：原有逻辑
    try {
      musicStop();
      try { audioPlayerRef.current?.pause(); } catch {}
      audio.stopAll();
      cleanupSession();
      stopGpsTracking();
      const finalReps = sportType === 'repetition' ? sets.totalReps : undefined;
      const result: Record<string, unknown> = {};
      if (timer.sec > 0 || (finalReps && finalReps > 0)) {
        const entry: Record<string, unknown> = {
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
          planId,
          planTaskWeekday,
        };
        addExercise(entry);
        // Prepare result for BodyFlow
        result.sportResult = {
          completed: true,
          durationSec: timer.sec,
          calories,
          reps: finalReps ?? 0,
          sportKey: sportName,
        };
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
    try { nav.navigate('MainTabs' as never, { screen: 'Body', params: result } as never); } catch { savingRef.current = false; }
  }, [isComboMode, goToNextExercise, timer.sec, sets, sportName, icon, sportType, isGpsSport, distKm, calories, coords, segmentPaces, mode, targetType, targetValue, addExercise, userProfile, auth, nav, musicStop, audio.stopAll, cleanupSession, stopGpsTracking, planId, planTaskWeekday]);

  // Stop music and ambient audio when entering report page (exercise ended)
  useEffect(() => {
    if (timer.page === 'report') {
      musicStop();
      try { audioPlayerRef.current?.pause(); } catch {}
      audio.stopAll();
    }
  }, [timer.page, musicStop, audio.stopAll]);

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

  // ── 当前动作索引（transition 页用 currentIndex-1）──
  const headerIndex = page === 'transition' ? comboState.current.currentIndex - 1 : comboState.current.currentIndex;

  // ── 页面内容 ──
  let pageContent: React.ReactNode;

  if (page === 'prep') {
    pageContent = (
      <>
        <PrepPage
          icon={effectiveIcon} sportName={effectiveSportLabel} sportType={sportType} experienceType={experienceType}
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
          handleSave={handleSave} onGoBack={isComboMode ? handleComboBack : () => nav.goBack()}
          exerciseLog={(exerciseLog ?? []).filter(e => !e.deleted)}
          musicTrack={musicTrack} onPressMusic={() => setShowMusicPicker(true)}
          TH={TH} T={T}
        />
        <MusicPickerModal visible={showMusicPicker} onClose={() => setShowMusicPicker(false)} primaryColor={TH.primary} selectedTrackId={musicTrack?.id} />
      </>
    );
  } else if (page === 'countdown') {
    pageContent = (
      <>
        <CountdownPage countdown={timer.countdown} label={T('exerciseCountdown')} musicTrack={musicTrack} musicIsPlaying={musicIsPlaying} musicLoop={musicLoop} onMusicTogglePlay={() => musicIsPlaying ? musicPause() : musicResume()} onMusicToggleLoop={musicToggleLoop} onMusicPress={() => setShowMusicPicker(true)} />
        <MusicPickerModal visible={showMusicPicker} onClose={() => setShowMusicPicker(false)} primaryColor={TH.primary} selectedTrackId={musicTrack?.id} />
      </>
    );
  } else if (page === 'paused') {
    pageContent = (
      <>
        <PausedPage
          icon={effectiveIcon} sportName={effectiveSportLabel} sportType={sportType} experienceType={experienceType}
          bg={bg} isGpsSport={isGpsSport}
          sec={timer.sec} countdown={timer.countdown} holdAnim={timer.holdAnim} scaleAnim={timer.scaleAnim} pulseAnim={timer.pulseAnim}
          mode={mode} setMode={setMode} targetType={targetType} setTargetType={setTargetType}
          targetValue={targetValue} setTargetValue={setTargetValue}
          breathGuideEnabled={breathGuideEnabled} setBreathGuideEnabled={setBreathGuideEnabled}
          isMeditative={isMeditative}
          selectedSound={audio.selectedSound} cycleSound={audio.cycleSound} selectSound={audio.selectSound} bgPlayer={audio.bgPlayer}
          musicTrack={musicTrack} musicIsPlaying={musicIsPlaying} musicLoop={musicLoop} onMusicTogglePlay={() => musicIsPlaying ? musicPause() : musicResume()} onMusicToggleLoop={musicToggleLoop} onPressMusic={() => setShowMusicPicker(true)}
          sets={sets.sets} currentSetReps={sets.currentSetReps} totalReps={sets.totalReps}
          distKm={distKm} calories={calories} coords={coords} initialPos={initialPos}
          amapReady={amapReady} MapView={MapView} Polyline={Polyline} mapRef={mapRef}
          segmentPaces={segmentPaces}
          handleGo={handleGo} handlePause={handlePause} handleContinue={handleContinue}
          handleHoldStart={timer.handleHoldStart} handleHoldEnd={timer.handleHoldEnd}
          handleSave={handleSave} onGoBack={isComboMode ? handleComboBack : () => nav.goBack()} setPage={timer.setPage}
          exerciseLog={(exerciseLog ?? []).filter(e => !e.deleted)}
          TH={TH} T={T}
        />
        <MusicPickerModal visible={showMusicPicker} onClose={() => setShowMusicPicker(false)} primaryColor={COLORS.ORANGE} selectedTrackId={musicTrack?.id} />
      </>
    );
  } else if (page === 'report') {
    pageContent = (
      <>
        <ReportPage
          icon={effectiveIcon} sportName={effectiveSportLabel} sportType={sportType} experienceType={experienceType}
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
          handleSave={handleSave} onGoBack={isComboMode ? handleComboBack : () => nav.goBack()}
          exerciseLog={(exerciseLog ?? []).filter(e => !e.deleted)}
          TH={TH} T={T}
        />
      </>
    );
  } else if (page === 'transition') {
    const currentEx = comboExercises?.[comboState.current.currentIndex - 1];
    const nextEx = comboExercises?.[comboState.current.currentIndex];
    const prevResult = comboState.current.results[comboState.current.results.length - 1];
    const restSec = currentEx ? getRestSec(currentEx) : 30;

    pageContent = (
      <TransitionScreen
        currentExercise={currentEx || { id: '', nameZh: '', nameI18nKey: '', icon: '', category: '', type: 'traditional', muscleGroups: [], difficulty: 'beginner' }}
        currentDuration={prevResult?.durationSec || 0}
        nextExercise={nextEx || null}
        restSec={restSec}
        onSkipRest={() => timer.setPage('prep')}
        onNext={() => timer.setPage('prep')}
        onFinishAll={handleSaveAll}
        TH={TH}
        T={T}
      />
    );
  } else if (page === 'active' && isGpsSport) {
    pageContent = (
      <>
        <View style={{ flex: 1 }}>
          <GpsActive
            MapView={MapView} Polyline={Polyline} amapReady={amapReady}
            mapRef={mapRef} initialPos={initialPos} coords={coords} color={color}
            mode={mode} targetProgress={actualTargets.targetProgress}
            distKm={distKm} sec={timer.sec} calories={calories}
            handlePause={handleGpsPause} T={T}
            musicTrack={musicTrack} musicIsPlaying={musicIsPlaying} musicLoop={musicLoop}
            onMusicTogglePlay={() => musicIsPlaying ? musicPause() : musicResume()}
            onMusicToggleLoop={musicToggleLoop}
            onMusicPress={() => setShowMusicPicker(true)}
          />
          <ActiveInsightBar
            type="exercise"
            insight={insight}
            onInsightChange={handleInsightChange}
            goal={resolveGoal('exercise')}
          />
        </View>
        <MusicPickerModal visible={showMusicPicker} onClose={() => setShowMusicPicker(false)} primaryColor={COLORS.GREEN} selectedTrackId={musicTrack?.id} />
      </>
    );
  } else {
    // Non-GPS active page — route to layout by experience type
    const layoutProps = {
      icon: effectiveIcon, sportName: effectiveSportLabel, experienceType, sportType, bg,
      sec: timer.sec, active: timer.active,
      topInset: isComboMode ? 0 : 56,
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
      onMusicPressTrackName: () => setShowMusicPicker(true),
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

    pageContent = (
      <>
        {activeLayout}
        <ActiveInsightBar
          type="exercise"
          insight={insight}
          onInsightChange={handleInsightChange}
          goal={resolveGoal('exercise')}
        />
        <MusicPickerModal visible={showMusicPicker} onClose={() => setShowMusicPicker(false)} primaryColor={TH.primary} selectedTrackId={musicTrack?.id} />
      </>
    );
  }

  // ── 统一返回：pageContent + header（底部）──
  return (
    <View style={{ flex: 1 }}>
      {pageContent}
      {isComboMode && comboExercises && (
        <ComboProgressHeader
          exercises={comboExercises}
          currentIndex={headerIndex}
          results={comboState.current.results}
          onJumpTo={(index) => { comboState.current.currentIndex = index; timer.reset(); sets.reset(); timer.setPage('prep'); }}
          TH={TH}
          T={T}
        />
      )}
    </View>
  );
}