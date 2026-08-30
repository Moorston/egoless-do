import { COLORS, TARGET_PRESETS, MET_MAP, createLogger, type ExerciseDef } from '@egoless-do/core';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useKeepAwake } from 'expo-keep-awake';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Animated, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme, useT } from '../../components/UI';
import MusicPickerModal from '../../media/components/MusicPickerModal';
import { audioPlayerRef } from '../../media/services/audioPlayerRef';
import { useMusicStore } from '../../media/useMusicStore';
import { useRootNavigation, type MainTabParamList, type RootStackParamList } from '../../navigation/hooks';
import { useAppStore, useShallowStore } from '../../store/useAppStore';
import { ActiveInsightBar } from '../global-pulse/components/ActiveInsightBar';
import { useGoalResolver } from '../global-pulse/hooks/useGoalResolver';
import { useSessionHeartbeat } from '../global-pulse/hooks/useSessionHeartbeat';
import { createSession, deleteSession, updateSession } from '../global-pulse/services/activeSessionApi';

import ComboProgressHeader, { type ExerciseResult } from './components/ComboProgressHeader';
import ComboReportPage from './components/ComboReportPage';
import TransitionScreen from './components/TransitionScreen';
import { useAmapComponents } from './hooks/useAmapComponents';
import { useBreathingGuide } from './hooks/useBreathingGuide';
import { useComboSession } from './hooks/useComboSession';
import { useExerciseAudio } from './hooks/useExerciseAudio';
import { reqLocPerm, getCurPos, watchPos, computeDistance } from './hooks/useExerciseGps';
import { useExerciseRest } from './hooks/useExerciseRest';
import { useExerciseSets } from './hooks/useExerciseSets';
import { useExerciseTargets } from './hooks/useExerciseTargets';
import { useExerciseTimer, type Page } from './hooks/useExerciseTimer';
import EnduranceActive from './layouts/EnduranceActive';
import GpsActive from './layouts/GpsActive';
import MeditativeActive from './layouts/MeditativeActive';
import StrengthActive from './layouts/StrengthActive';
import CountdownPage from './pages/CountdownPage';
import PausedPage from './pages/PausedPage';
import PrepPage from './pages/PrepPage';
import ReportPage from './pages/ReportPage';

const log = createLogger('Exercise');

// 单运动模式 entry 构建（纯函数：从 saveSingleSport 提取，降低父函数圈复杂度）
interface SingleSportEntryParams {
  sportName: string;
  icon: string;
  durationSec: number;
  isGpsSport: boolean;
  distKm: number;
  calories: number | undefined;
  coords: { latitude: number; longitude: number; ts: number }[];
  segmentPaces: number[];
  mode: 'free' | 'target';
  targetType: string;
  targetValue: number;
  finalReps: number | undefined;
  setsArr: { reps: number }[];
  planId?: string;
  planTaskWeekday?: number;
}

function buildSingleSportEntry(p: SingleSportEntryParams) {
  return {
    sportKey: p.sportName,
    sportIcon: p.icon,
    durationSec: p.durationSec,
    timestamp: Date.now(),
    isGpsSport: p.isGpsSport,
    distanceKm: p.isGpsSport ? p.distKm : undefined,
    calories: p.calories,
    avgPace: p.isGpsSport && p.distKm > 0 ? p.durationSec / p.distKm : undefined,
    trackPoints: p.isGpsSport ? p.coords.map(c => ({ lat: c.latitude, lng: c.longitude, ts: c.ts })) : undefined,
    segmentPaces: p.segmentPaces.length > 0 ? p.segmentPaces : undefined,
    mode: p.mode,
    target: p.mode === 'target' ? { type: p.targetType as 'distance' | 'time' | 'calories' | 'reps', value: p.targetValue } : undefined,
    reps: p.finalReps,
    sets: p.setsArr.length > 0 ? p.setsArr : undefined,
    met: MET_MAP[p.sportName],
    planId: p.planId,
    planTaskWeekday: p.planTaskWeekday,
  };
}

// 目标进度信息字符串（纯函数：从 SportPage targetInfo IIFE 提取，降低父函数圈复杂度）
function computeTargetInfo(
  mode: 'free' | 'target',
  targetType: string,
  totalReps: number,
  targetValue: number,
  sec: number,
  calories: number | undefined,
): string {
  if (mode !== 'target') return '';
  if (targetType === 'reps') return `${totalReps}/${targetValue}`;
  if (targetType === 'time') return `${Math.floor(sec / 60)}/${Math.floor(targetValue / 60)}min`;
  if (targetType === 'calories') return `${calories}/${targetValue}kcal`;
  return '';
}

type Route = RouteProp<RootStackParamList, 'Sport'>;

// transition 页渲染（纯函数：从 SportPage page 路由块提取，降低父函数圈复杂度）
// 2026-08-30 move-only，JSX 逐字节搬移，零行为变更。
interface TransitionPageParams {
  comboExercises?: ExerciseDef[];
  currentIndex: number;
  results: ExerciseResult[];
  getRestSec: (ex: ExerciseDef) => number;
  setPage: (p: Page) => void;
  TH: ReturnType<typeof useTheme>;
  T: ReturnType<typeof useT>;
}
function renderTransitionPage(p: TransitionPageParams): React.ReactNode {
  const currentEx = p.comboExercises?.[p.currentIndex - 1];
  const nextEx = p.comboExercises?.[p.currentIndex];
  const prevResult = p.results[p.results.length - 1];
  const restSec = currentEx ? p.getRestSec(currentEx) : 30;
  return (
    <TransitionScreen
      currentExercise={currentEx || { id: '', nameZh: '', nameI18nKey: '', icon: '', category: '', type: 'traditional', muscleGroups: [], difficulty: 'beginner' }}
      currentDuration={prevResult?.durationSec || 0}
      nextExercise={nextEx || null}
      restSec={restSec}
      onSkipRest={() => p.setPage('prep')}
      onNext={() => p.setPage('prep')}
      onFinishAll={() => p.setPage('combo_report')}
      TH={p.TH}
      T={p.T}
    />
  );
}

// 组合模式是否显示进度 header（纯函数：从 SportPage return 块提取，降低父函数圈复杂度）
// 2026-08-30 move-only，逻辑表达式逐字节搬移，零行为变更。
// type predicate 恢复原内联 `&&` 短路对 comboExercises 的非空收窄（运行时仍为 boolean）。
function shouldShowComboHeader(isComboMode: boolean, comboExercises: ExerciseDef[] | undefined, page: string): comboExercises is ExerciseDef[] {
  return Boolean(isComboMode && comboExercises && (page === 'prep' || page === 'transition' || page === 'combo_report'));
}

// 组合模式进度 header 的当前动作索引（纯函数：从 SportPage headerIndex 提取，降低父函数圈复杂度）
// transition 页显示刚完成的动作（currentIndex-1），其他页显示当前动作索引。
// 2026-08-30 move-only，三元表达式逐字节搬移，零行为变更。
function computeComboHeaderIndex(page: string, currentIndex: number): number {
  return page === 'transition' ? currentIndex - 1 : currentIndex;
}

// 返回按钮回调（纯函数：从 SportPage onGoBack 提取，降低父函数圈复杂度）
// 组合模式用 handleComboBack（含退出确认），单运动模式直接 goBack。
// 2026-08-30 move-only，三元表达式逐字节搬移，零行为变更。
function resolveOnGoBack(isComboMode: boolean, handleComboBack: () => void, nav: { goBack: () => void }): () => void {
  return isComboMode ? handleComboBack : () => nav.goBack();
}

// 音乐播放切换回调（纯函数：从 SportPage onMusicTogglePlay 提取，降低父函数圈复杂度）
// 正在播放时暂停，暂停时恢复。2026-08-30 move-only，三元逐字节搬移。
function resolveMusicTogglePlay(musicIsPlaying: boolean, musicPause: () => void, musicResume: () => void): () => void {
  return () => musicIsPlaying ? musicPause() : musicResume();
}

// 运动日志空值合并（纯函数：从 SportPage exerciseLogFiltered 提取，降低父函数圈复杂度）
// 2026-08-30 move-only，?? 表达式逐字节搬移，零行为变更。
function coalesceExerciseLog<T>(arr: T[] | null | undefined): T[] {
  return arr ?? [];
}

// 非 GPS active 页 layoutProps 派生值（纯函数：从 SportPage layoutProps 提取，降低父函数圈复杂度）
// 2026-08-30 move-only，三元逐字节搬移，零行为变更。
function resolveCurrentExerciseProp(isComboMode: boolean, currentComboExercise: ExerciseDef | null): ExerciseDef | null | undefined {
  return isComboMode ? currentComboExercise : undefined;
}
function resolveTopInset(isComboMode: boolean, topInset: number): number {
  return isComboMode ? topInset : 56;
}

// SportPage 为多模式（GPS/力量/耐力/冥想）运动综合屏幕，拆分子组件成本较高，暂禁用行数限制
// eslint-disable-next-line max-lines-per-function
export default function SportPage() {
  const nav   = useRootNavigation();
  const route = useRoute<Route>();
  const TH    = useTheme();
  const T     = useT();
  const insets = useSafeAreaInsets();
  const { auth, userProfile, addExercise, exerciseLog, setBodyFlowState } = useShallowStore(s => ({ auth: s.auth, userProfile: s.userProfile, addExercise: s.addExercise, exerciseLog: s.exerciseLog, setBodyFlowState: s.setBodyFlowState }));
  const { MapView, Polyline, ready: amapReady } = useAmapComponents();
  const { key: sportName, icon, color, gps: gpsParam, planId, planTaskWeekday, exercises: comboExercises, comboPlanId } = route.params;

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

  // 更新感悟
  const handleInsightChange = useCallback((text: string) => {
    setInsight(text);
    if (sessionIdRef.current) {
      // debounce: 只在停止输入 1s 后更新
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        void updateSession(sessionIdRef.current!, { insight: text });
      }, 1000);
    }
  }, []);

  // 删除会话（通用清理）
  const cleanupSession = useCallback(() => {
    if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null; }
    if (sessionIdRef.current) {
      void deleteSession(sessionIdRef.current);
      sessionIdRef.current = null;
    }
  }, []);

  const onBellAndRest = useCallback(() => {
    audio.playBell();
    rest.startRest(60);
  }, [audio, rest]);

  const sets = useExerciseSets(onBellAndRest);

  // ── GPS state ──
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; ts: number }[]>([]);
  const [initialPos, setInitialPos] = useState({ latitude: 39.9042, longitude: 116.4074 });
  const [segmentPaces, setSegmentPaces] = useState<number[]>([]);
  const lastKmMarkRef = useRef(0);
  const lastKmTsRef = useRef(0);
  const locationSub = useRef<{ remove: () => void } | null>(null);
  const mapRef = useRef<{ moveCamera: (camera: { target: { latitude: number; longitude: number }; zoom: number }, duration?: number) => void } | null>(null);
  const pauseHoldAnim = useRef(new Animated.Value(1)).current;

  // ── GPS tracking stop（提前定义供 useComboSession 使用）──
  const stopGpsTracking = useCallback(() => {
    locationSub.current?.remove();
    locationSub.current = null;
  }, []);

  // ── 组合运动状态机（comboState ref + 派生值 + 前进/保存/验证逻辑）──
  const {
    comboState, isComboMode, currentComboExercise, effectiveSportName, effectiveIcon,
    effectiveSportLabel, isGpsSport, sportType, experienceType, isMeditative, bg, calories,
    goToNextExercise, handleSaveAll, validateCurrentExercise, handleComboBack, getRestSec,
  } = useComboSession({
    comboExercises, comboPlanId, planId, planTaskWeekday, sportName, icon, gpsParam,
    weight: userProfile?.weight ?? 70, color,
    timer, sets, musicStop, audioStopAll: audio.stopAll, cleanupSession, stopGpsTracking,
    nav, T, addExercise, setBodyFlowState,
  });

  // ── Mode & target state ──
  const [mode, setMode] = useState<'free' | 'target'>('free');
  const presets = TARGET_PRESETS[sportType] ?? {};
  const availableTargetTypes = Object.keys(presets) as Array<'distance' | 'time' | 'calories' | 'reps'>;
  const [targetType, setTargetType] = useState<string>(availableTargetTypes[0]);
  const [targetValue, setTargetValue] = useState(presets[availableTargetTypes[0]]?.[0]?.value ?? 0);

  // ── Breathing state ──
  const [breathGuideEnabled, setBreathGuideEnabled] = useState(isMeditative);
  const { breathPhase, breathAnim } = useBreathingGuide({ breathGuideEnabled, timer, audio });

  // 创建/删除会话
  useEffect(() => {
    if (timer.page === 'active' && timer.active && !sessionIdRef.current) {
      const userHash = auth.user?.id || '';
      if (!userHash) return;
      const goal = resolveGoal('exercise');
      void createSession({
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
  }, [timer.page, timer.active, auth.user?.id, userProfile?.nickname, resolveGoal, sportName, icon, effectiveIcon, effectiveSportName]);

  // ── Computed ──
  const distKm = computeDistance(coords);

  // Recalculate targets with actual values
  const actualTargets = useExerciseTargets({
    sportName: effectiveSportName, sportType, mode, targetType, targetValue,
    sec: timer.sec, distKm, calories, totalReps: sets.totalReps,
    playBell: audio.playBell,
    T,
  });

  // ── Breathing guide cycle（已提取到 useBreathingGuide）──

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

  // Start GPS when active begins
  useEffect(() => {
    if (timer.page === 'active' && timer.active && isGpsSport) {
      void startGpsTracking();
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
    // sets 为 useExerciseSets 返回的稳定对象，无需加入依赖数组
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (isGpsSport) void startGpsTracking();
  }, [timer, isGpsSport, startGpsTracking]);

  // 组件卸载时清理会话
  useEffect(() => {
    return () => { cleanupSession(); };
  }, [cleanupSession]);

  const savingRef = useRef(false);

  // 单运动模式：构建 entry + addExercise + flowState + Health 写入
  const saveSingleSport = useCallback(() => {
    try {
      musicStop();
      try { audioPlayerRef.current?.pause(); } catch {}
      audio.stopAll();
      cleanupSession();
      stopGpsTracking();
      const finalReps = sportType === 'repetition' ? sets.totalReps : undefined;
      if (timer.sec > 0 || (finalReps && finalReps > 0)) {
        const entry = buildSingleSportEntry({
          sportName, icon, durationSec: timer.sec, isGpsSport, distKm, calories,
          coords, segmentPaces, mode, targetType, targetValue,
          finalReps, setsArr: sets.sets, planId, planTaskWeekday,
        });
        addExercise(entry);
        // 保存到 flowState
        setBodyFlowState({
          exerciseCompleted: true,
          practiceCompleted: true,
          practiceDurationSec: timer.sec,
          totalDurationSec: timer.sec,
          totalCalories: calories,
          practiceTitle: effectiveSportLabel,
          practiceExercises: [{
            sportKey: sportName,
            icon: icon,
            nameZh: effectiveSportLabel,
            durationSec: timer.sec,
            calories: calories ?? 0,
            reps: (sportType === 'repetition' ? sets.totalReps : 0) ?? 0,
            timestamp: Date.now(),
          }],
        });
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
    try { nav.navigate('MainTabs', { screen: 'Body' as keyof MainTabParamList }); } catch { savingRef.current = false; }
    // audio/effectiveSportLabel 为稳定引用或派生值，无需加入依赖数组
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.sec, sets, sportName, icon, sportType, isGpsSport, distKm, calories, coords, segmentPaces, mode, targetType, targetValue, addExercise, nav, musicStop, audio.stopAll, cleanupSession, stopGpsTracking, planId, planTaskWeekday, setBodyFlowState]);

  // 组合模式：委托给 hook 的 goToNextExercise（保存当前动作并前进）
  const saveComboExercise = useCallback(() => {
    savingRef.current = false;
    goToNextExercise();
  }, [goToNextExercise]);

  // 保存入口：防重入 + 分派
  const handleSave = useCallback(() => {
    if (savingRef.current) return;
    savingRef.current = true;
    if (isComboMode) {
      saveComboExercise();
    } else {
      saveSingleSport();
    }
  }, [isComboMode, saveComboExercise, saveSingleSport]);

  // Stop music and ambient audio when entering report page (exercise ended)
  useEffect(() => {
    if (timer.page === 'report') {
      musicStop();
      try { audioPlayerRef.current?.pause(); } catch {}
      audio.stopAll();
    }
    // audio 为 useExerciseAudio 返回的稳定对象，无需加入依赖数组
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.page, musicStop, audio.stopAll]);

  // ── GPS Pause handler (stays inline for GPS sports) ──
  const handleGpsPause = useCallback(() => {
    stopGpsTracking();
    timer.handlePause();
  }, [timer, stopGpsTracking]);

  // Target info string
  const targetInfo = computeTargetInfo(mode, targetType, sets.totalReps, targetValue, timer.sec, calories);

  // Current set number
  const currentSet = sets.sets.length + 1;

  // ── Page routing ──
  const { page } = timer;

  // ── 当前动作索引（transition 页用 currentIndex-1）──
  const headerIndex = computeComboHeaderIndex(page, comboState.current.currentIndex);

  // ── 重复 prop 提取为 const（降低 page 路由块内的圈复杂度）──
  const onGoBack = resolveOnGoBack(isComboMode, handleComboBack, nav);
  const exerciseLogFiltered = coalesceExerciseLog(exerciseLog).filter(e => !e.deleted);
  const onMusicTogglePlay = resolveMusicTogglePlay(musicIsPlaying, musicPause, musicResume);
  const onMusicPress = () => setShowMusicPicker(true);

  // ── 页面内容 ──
  let pageContent: React.ReactNode;

  // ── 组合模式：用户尝试结束当前动作（验证 → 进入报告页）
  const handleFinishExercise = useCallback(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    if (isComboMode) {
      const { valid, message } = validateCurrentExercise();
      if (!valid) {
        Alert.alert(
          T('bodyExerciseIncomplete') || '动作未完成',
          message,
          [{ text: T('bodyCancel') || '取消', style: 'cancel' }]
        );
        return;
      }
    }
    timer.handleHoldEnd();
    // timer 为 useExerciseTimer 返回的稳定对象，无需加入依赖数组
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComboMode, validateCurrentExercise, timer.handleHoldEnd, T]);

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
          handleHoldStart={timer.handleHoldStart} handleHoldEnd={handleFinishExercise}
          handleSave={handleSave} onGoBack={onGoBack}
          exerciseLog={exerciseLogFiltered}
          musicTrack={musicTrack} onPressMusic={onMusicPress}
          TH={TH} T={T}
        />
        <MusicPickerModal visible={showMusicPicker} onClose={() => setShowMusicPicker(false)} primaryColor={TH.primary} selectedTrackId={musicTrack?.id} />
      </>
    );
  } else if (page === 'countdown') {
    pageContent = (
      <>
        <CountdownPage countdown={timer.countdown} label={T('exerciseCountdown')} musicTrack={musicTrack} musicIsPlaying={musicIsPlaying} musicLoop={musicLoop} onMusicTogglePlay={onMusicTogglePlay} onMusicToggleLoop={musicToggleLoop} onMusicPress={onMusicPress} />
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
          musicTrack={musicTrack} musicIsPlaying={musicIsPlaying} musicLoop={musicLoop} onMusicTogglePlay={onMusicTogglePlay} onMusicToggleLoop={musicToggleLoop} onPressMusic={() => setShowMusicPicker(true)}
          sets={sets.sets} currentSetReps={sets.currentSetReps} totalReps={sets.totalReps}
          distKm={distKm} calories={calories} coords={coords} initialPos={initialPos}
          amapReady={amapReady} MapView={MapView} Polyline={Polyline} mapRef={mapRef}
          segmentPaces={segmentPaces}
          handleGo={handleGo} handlePause={handlePause} handleContinue={handleContinue}
          handleHoldStart={timer.handleHoldStart} handleHoldEnd={handleFinishExercise}
          handleSave={handleSave} onGoBack={onGoBack} setPage={timer.setPage}
          exerciseLog={exerciseLogFiltered}
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
          handleHoldStart={timer.handleHoldStart} handleHoldEnd={handleFinishExercise}
          handleSave={handleSave} onGoBack={onGoBack}
          exerciseLog={exerciseLogFiltered}
          TH={TH} T={T}
        />
      </>
    );
  } else if (page === 'transition') {
    pageContent = renderTransitionPage({
      comboExercises, currentIndex: comboState.current.currentIndex,
      results: comboState.current.results, getRestSec, setPage: timer.setPage, TH, T,
    });
  } else if (page === 'combo_report') {
    pageContent = (
      <ComboReportPage
        totalDurationSec={comboState.current.totalDurationSec}
        totalCalories={comboState.current.totalCalories}
        exercises={comboState.current.results}
        TH={TH}
        T={T}
        onFinish={handleSaveAll}
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
            onMusicTogglePlay={onMusicTogglePlay}
            onMusicToggleLoop={musicToggleLoop}
            onMusicPress={onMusicPress}
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
      currentExercise: resolveCurrentExerciseProp(isComboMode, currentComboExercise),
      sec: timer.sec, active: timer.active,
      topInset: resolveTopInset(isComboMode, insets.top),
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
      onMusicTogglePlay,
      onMusicToggleLoop: musicToggleLoop,
      onMusicPressTrackName: onMusicPress,
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

  // ── 统一返回：pageContent + header（仅 transition 页显示）──
  return (
    <View style={{ flex: 1 }}>
      {pageContent}
      {shouldShowComboHeader(isComboMode, comboExercises, page) && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <ComboProgressHeader
            exercises={comboExercises}
            currentIndex={headerIndex}
            results={comboState.current.results}
            onJumpTo={(index) => { comboState.current.currentIndex = index; timer.reset(); sets.reset(); timer.setPage('prep'); }}
            safeAreaBottom={insets.bottom}
            T={T}
          />
        </View>
      )}
    </View>
  );
}