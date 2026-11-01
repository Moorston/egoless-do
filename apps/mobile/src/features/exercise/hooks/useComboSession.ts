// ─── useComboSession ─────────────────────────────────────────────
// 组合运动状态机：聚合 comboState ref + 组合模式派生值 + 前进/保存/验证逻辑。
// 2026-08-30 从 SportPage 提取（move-only，逻辑逐字节搬移，零行为变更）。
// 关键约束：comboState ref 在本 hook 内 useRef 创建并返回，保持主组件渲染期读取模式。

import { EXERCISE_CATEGORIES, MET_MAP, COMBO_WORKOUT_SPORT_KEY, buildExerciseLibrary, SPORT_BG_COLORS, getSportType, getSportExperienceType, estimateCalories, createLogger, type ExerciseDef, type ExerciseEntry, type SportType, type SportExperienceType } from '@egoless-do/core';
import { useCallback, useMemo, useRef } from 'react';
import { Alert } from 'react-native';

import { audioPlayerRef } from '../../../media/services/audioPlayerRef';
import { useRootNavigation, type MainTabParamList } from '../../../navigation/hooks';
import type { ExerciseResult } from '../components/ComboProgressHeader';

import type { useExerciseSets } from './useExerciseSets';
import type { useExerciseTimer } from './useExerciseTimer';

const log = createLogger('Exercise');

// 组合标题计算：从 ExerciseDef 提取去重分类名
// （2026-08-30 从 SportPage 搬移至此——本 hook 的 handleSaveAll 是唯一消费方）
function computeComboTitle(exercises: ExerciseDef[], count: number, T: (key: string, params?: Record<string, string | number>) => string): string {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const ex of exercises) {
    if (!ex.category || seen.has(ex.category)) continue;
    seen.add(ex.category);
    const category = EXERCISE_CATEGORIES.find(c => c.key === ex.category);
    names.push(category ? T(category.i18nKey) : ex.category);
  }
  return `${names.join(' + ')}（${count} ${T('bodyPlanUnitExercise')}）`;
}

// 组合会话状态：当前动作索引 + 各动作结果聚合
export interface ComboState {
  exercises: ExerciseDef[];
  currentIndex: number;
  results: ExerciseResult[];
  totalDurationSec: number;
  totalCalories: number;
}

export interface UseComboSessionParams {
  comboExercises?: ExerciseDef[];
  comboPlanId?: string;
  planId?: string;
  planTaskWeekday?: number;
  sportName: string;
  icon: string;
  gpsParam?: boolean;
  weight: number;
  color: string;
  // 已构造的运行时依赖（主组件构造后传入，hook 不重复调用底层 hook）
  timer: ReturnType<typeof useExerciseTimer>;
  sets: ReturnType<typeof useExerciseSets>;
  musicStop: () => void;
  audioStopAll: () => void;
  cleanupSession: () => void;
  stopGpsTracking: () => void;
  nav: ReturnType<typeof useRootNavigation>;
  T: (key: string, params?: Record<string, string | number>) => string;
  addExercise: (entry: Omit<ExerciseEntry, 'id' | 'updatedAt' | 'deleted'>) => void;
  setBodyFlowState: (state: Record<string, unknown>) => void;
}

export function useComboSession(params: UseComboSessionParams) {
  const {
    comboExercises, comboPlanId, planId, planTaskWeekday, sportName, icon, gpsParam,
    weight, color,
    timer, sets,
    musicStop, audioStopAll, cleanupSession, stopGpsTracking,
    nav, T, addExercise, setBodyFlowState,
  } = params;

  const isComboMode = !!comboExercises && comboExercises.length > 0;
  const comboState = useRef<ComboState>({
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
  const sportType: SportType = getSportType(effectiveSportName, isGpsSport);
  const experienceType: SportExperienceType = getSportExperienceType(effectiveSportName, sportType);
  const isMeditative = experienceType === 'meditative';
  const bg = SPORT_BG_COLORS[effectiveSportName] || color || '#4CAF50';
  const calories = estimateCalories(effectiveSportName, timer.sec, weight);

  // ── Combo session cleanup ──
  const resetComboSession = useCallback(() => {
    musicStop();
    try { audioPlayerRef.current?.pause(); } catch {}
    audioStopAll();
    cleanupSession();
    stopGpsTracking();
    // audio 为 useExerciseAudio 返回的稳定对象，无需加入依赖数组
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicStop, audioStopAll, cleanupSession, stopGpsTracking]);

  // ── 组合模式：返回确认 ──
  const handleComboBack = useCallback(() => {
    if (comboState.current.currentIndex === 0 && !comboState.current.results.length) {
      nav.goBack();
      return;
    }
    Alert.alert(
      T('bodyFlowExitConfirm') || 'Exit workout flow?',
      undefined,
      [
        { text: T('bodyCancel') || 'Cancel', style: 'cancel' },
        { text: T('bodyFlowSkip') || 'Exit', style: 'destructive', onPress: () => { resetComboSession(); nav.goBack(); } },
      ]
    );
  }, [T, nav, resetComboSession]);

  // ── 组合模式：获取当前动作的休息时间 ──
  const getRestSec = useCallback((exercise: ExerciseDef): number => {
    if (exercise.type === 'strength') return 60;
    if (exercise.type === 'cardio') return 30;
    if (exercise.type === 'traditional' || exercise.type === 'flexibility') return 15;
    return 30;
  }, []);

  // ── 组合模式：验证当前动作是否完成（在用户尝试结束时调用）──
  const validateCurrentExercise = useCallback((): { valid: boolean; message?: string } => {
    if (!isComboMode) return { valid: true };
    const ex = currentComboExercise;
    if (!ex) return { valid: true };
    if (ex.type === 'strength') {
      const plannedSets = ex.defaultSets ?? 1;
      if (sets.sets.length < plannedSets) {
        return { valid: false, message: `${T('bodyExerciseCompleteHint') || '请完成所有计划组数'} (${sets.sets.length}/${plannedSets})` };
      }
      const incompleteSet = sets.sets.find(s => s.reps < (ex.defaultReps ?? 1));
      if (incompleteSet) {
        return { valid: false, message: T('bodyExerciseCompleteRepsHint') || '请完成每组计划次数' };
      }
    } else if (ex.defaultDurationSec) {
      const minSec = Math.round(ex.defaultDurationSec * 0.8);
      if (timer.sec < minSec) {
        return { valid: false, message: (T('bodyExerciseCompleteDurationHint') || '请至少完成 {percent}% 时长 ({min}秒)').replace('{percent}', '80').replace('{min}', String(minSec)) };
      }
    }
    return { valid: true };
  }, [isComboMode, currentComboExercise, sets, timer.sec, T]);

  // ── 组合模式：全部完成，返回聚合结果到 Body ──
  const handleSaveAll = useCallback(() => {
    try {
      musicStop();
      try { audioPlayerRef.current?.pause(); } catch {}
      audioStopAll();
      cleanupSession();
      stopGpsTracking();

      const totalRepsVal = comboState.current.results.reduce((s, r) => s + r.reps, 0);

      // 保存聚合组合训练记录
      if (isComboMode && comboState.current.results.length > 0) {
        addExercise({
          sportKey: COMBO_WORKOUT_SPORT_KEY,
          sportIcon: '🏋️',
          durationSec: comboState.current.totalDurationSec,
          timestamp: Date.now(),
          isGpsSport: false as const,
          calories: comboState.current.totalCalories,
          reps: totalRepsVal,
          planId: comboPlanId || planId,
          planTaskWeekday,
          comboExercises: comboState.current.results,
        });
      }

      // 保存组合训练结果到 flowState
      setBodyFlowState({
        exerciseCompleted: true,
        practiceCompleted: true,
        isCombo: true,
        totalDurationSec: comboState.current.totalDurationSec,
        totalCalories: comboState.current.totalCalories,
        practiceTitle: computeComboTitle(comboExercises ?? [], comboState.current.results.length, T),
        comboExercises: comboState.current.results,
        startedAt: Date.now(),
        updatedAt: Date.now(),
      });

      // 延迟导航，确保 store 写入完成
      setTimeout(() => {
        try {
          nav.navigate('MainTabs', { screen: 'Body' as keyof MainTabParamList });
        } catch (navErr) {
          log.error(navErr, { message: 'Combo navigation failed' });
          setBodyFlowState({ exerciseCompleted: false, isCombo: false });
        }
      }, 100);
    } catch (e) {
      log.error(e, { message: 'Combo save failed' });
      resetComboSession();
    }
    // T/audio/comboExercises 为稳定引用或 props，无需加入依赖数组
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav, musicStop, audioStopAll, cleanupSession, stopGpsTracking, setBodyFlowState, addExercise, isComboMode, comboPlanId, planId, planTaskWeekday, resetComboSession]);

  // ── 组合模式：保存当前动作，前进到下一个 ──
  const goToNextExercise = useCallback(() => {
    if (!isComboMode || !comboExercises) return;

    const currentEx = comboExercises![comboState.current.currentIndex];
    const finalReps = sportType === 'repetition' ? sets.totalReps : undefined;
    const exName = currentEx?.nameZh || buildExerciseLibrary().find(lib => lib.category === (currentEx?.category || effectiveSportName))?.nameZh || effectiveSportName;
    const entry = {
      sportKey: effectiveSportName, sportIcon: effectiveIcon, durationSec: timer.sec,
      timestamp: Date.now(), isGpsSport: false as const,
      calories,
      reps: finalReps,
      sets: sets.sets.length > 0 ? sets.sets : undefined,
      met: MET_MAP[effectiveSportName] || currentEx?.met,
      planId: comboPlanId || planId,
      planTaskWeekday,
      note: exName,
    };
    addExercise(entry);

    const result: ExerciseResult = {
      sportKey: effectiveSportName,
      icon: effectiveIcon,
      nameZh: exName,
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
    // addExercise/handleSaveAll 为 store/自身引用，无需加入依赖数组
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComboMode, comboExercises, effectiveSportName, effectiveIcon, timer, sets, calories, comboPlanId, planId, planTaskWeekday, sportType]);

  return {
    comboState,
    isComboMode,
    currentComboExercise,
    effectiveSportName,
    effectiveIcon,
    effectiveGps,
    effectiveSportLabel,
    isGpsSport,
    sportType,
    experienceType,
    isMeditative,
    bg,
    calories,
    goToNextExercise,
    handleSaveAll,
    validateCurrentExercise,
    handleComboBack,
    getRestSec,
    resetComboSession,
  };
}
