import { dateStr, type AgeBracket, type BodyGoal, type BodyTrainingPlan, type ExerciseEntry, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, FONT_LABEL, FONT_STAT_CARD, FONT_STAT_SECTION, FONT_BADGE, generateSuggestions, EXERCISE_CATEGORIES, PART_STRING_TO_KEY, BODY_TAGS_PRESET, COMBO_WORKOUT_SPORT_KEY, type DayOverride, type ExerciseDef, type BodyCheckin } from '@egoless-do/core';
import { ChevronRight, Play, Calendar, Target, Dumbbell, TrendingUp, Activity, Scale, History, Settings, ChevronLeft, ChevronDown } from 'lucide-react-native';
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, Animated, Alert, Modal } from 'react-native';

import { useT, useTheme } from '../../../components/UI';
import { useRootNavigation } from '../../../navigation/hooks';
import { useShallowStore } from '../../../store/useAppStore';

import CelebrationOverlay from './screens/CelebrationOverlay';
import { useTodayPlan } from './hooks/useTodayPlan';
import { useBodyFlowState } from './hooks/useBodyFlowState';
import AssessmentModal from './modals/AssessmentModal';
import BodyCheckinModal from './modals/BodyCheckinModal';
import GoalEditModal from './modals/GoalEditModal';
import WeightRecordModal from './modals/WeightRecordModal';
import WeightTrendModal from './modals/WeightTrendModal';
import QuickSwapModal from './modals/QuickSwapModal';
import AdjustExerciseModal from './modals/AdjustExerciseModal';
import DayActionSheet from './modals/DayActionSheet';
import GoalEditLightModal from './modals/GoalEditLightModal';
import { styles } from './BodyDashboardStyles';
import ExerciseProgressBanner from './components/ExerciseProgressBanner';

const SCREEN_WIDTH = Dimensions.get('window').width;
export const BANNER_WIDTH = SCREEN_WIDTH - 32; // 16px padding on each side

interface DashboardProps {
  onFlowStart?: () => void;
  onFlowStartWithPlan?: (planId: string) => void;
  onGoToSport?: (sportKey: string, exercises?: ExerciseDef[]) => void;
  onGoToBreathing?: () => void;
}

export default function BodyDashboard({ onFlowStart, onFlowStartWithPlan, onGoToSport, onGoToBreathing }: DashboardProps) {
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();
  const { userProfile, bodyGoals, bodyCheckins, exerciseLog, checkinHistory, bodyTrainingPlans,
    updateUserProfile, updateBodyGoal, addBodyGoal,
    upsertBodyCheckin, addWeight,
    updateBodyTrainingPlan } = useShallowStore(s => ({
    userProfile: s.userProfile,
    bodyGoals: s.bodyGoals,
    bodyCheckins: s.bodyCheckins,
    exerciseLog: s.exerciseLog,
    checkinHistory: s.checkinHistory,
    bodyTrainingPlans: s.bodyTrainingPlans,
    updateUserProfile: s.updateUserProfile,
    updateBodyGoal: s.updateBodyGoal,
    addBodyGoal: s.addBodyGoal,
    upsertBodyCheckin: s.upsertBodyCheckin,
    addWeight: s.addWeight,
    updateBodyTrainingPlan: s.updateBodyTrainingPlan,
  }));
  const profile = (userProfile ?? {}) as Record<string, unknown>;
  const { todayPlan, weekday: todayWeekday, todayOverride, hasOverride, todayExercises, dateStr: todayDateStr } = useTodayPlan();

  const [showAssessment, setShowAssessment] = useState(false);
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showWeightRecord, setShowWeightRecord] = useState(false);
  const [showWeightTrend, setShowWeightTrend] = useState(false);
  const [showQuickSwap, setShowQuickSwap] = useState(false);
  const [showAdjustExercise, setShowAdjustExercise] = useState(false);
  const [showDayAction, setShowDayAction] = useState(false);
  const [showGoalEditLight, setShowGoalEditLight] = useState(false);
  const [showDaySwapPicker, setShowDaySwapPicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Banner carousel state (no auto-rotate, user manual swipe)
  const [currentBanner, setCurrentBanner] = useState(0);
  const bannerScrollRef = useRef<ScrollView>(null);

  const activeGoal = useMemo(() => (bodyGoals ?? []).find((g: BodyGoal) => !g.deleted), [bodyGoals]);
  const activeTrainingPlan = useMemo(() => (bodyTrainingPlans ?? []).find((p: BodyTrainingPlan) => !p.deleted && p.status === 'active'), [bodyTrainingPlans]);

  // Compute training suggestions
  const suggestions = useMemo(() =>
    generateSuggestions(exerciseLog ?? [], bodyCheckins ?? [], activeTrainingPlan),
  [exerciseLog, bodyCheckins, activeTrainingPlan]);

  // Auto-mark expired plans as completed
  const expiredPlanIds = useMemo(() => {
    const today = dateStr();
    const ids: string[] = [];
    for (const plan of bodyTrainingPlans ?? []) {
      if (plan.status === 'active' && plan.endDate < today && !plan.deleted) {
        ids.push(plan.id);
      }
    }
    return ids;
  }, [bodyTrainingPlans]);

  useEffect(() => {
    if (expiredPlanIds.length === 0) return;
    for (const id of expiredPlanIds) {
      updateBodyTrainingPlan(id, { status: 'completed' });
    }
  }, [expiredPlanIds, updateBodyTrainingPlan]);

  // ── Celebration overlay ──
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebratedPlanId, setCelebratedPlanId] = useState<string | null>(null);
  const sevenDaysAgo = useMemo(() => dateStr(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)), []);

  // Detect newly completed plans
  const recentlyCompletedPlans = useMemo(() =>
    (bodyTrainingPlans ?? []).filter((p: BodyTrainingPlan) =>
      !p.deleted && p.status === 'completed' && p.endDate >= sevenDaysAgo
    ),
  [bodyTrainingPlans, sevenDaysAgo]);

  // Compute celebration data
  const celebrationData = useMemo(() => {
    const plan = recentlyCompletedPlans[0];
    if (!plan) return null;
    const planExercises = (exerciseLog ?? []).filter((e: ExerciseEntry) =>
      !e.deleted && e.planId === plan.id
    );
    const totalMin = Math.round(planExercises.reduce((s: number, e: ExerciseEntry) => s + (e.durationSec ?? 0), 0) / 60);
    const totalCal = planExercises.reduce((s: number, e: ExerciseEntry) => s + (e.calories ?? 0), 0);
    const completedDays = new Set(planExercises.map((e: ExerciseEntry) => dateStr(new Date(e.timestamp)))).size;
    const weeks = Math.max(1, Math.round((new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / 604800000));
    const totalDays = weeks * 7;

    return {
      planName: plan.name ?? '',
      totalDays,
      completedDays,
      totalDurationMin: totalMin,
      totalCalories: totalCal,
    };
  }, [recentlyCompletedPlans, exerciseLog]);

  // Show celebration once when a completed plan is detected
  const recentPlanId = recentlyCompletedPlans[0]?.id ?? null;
  useEffect(() => {
    if (celebrationData && recentPlanId && recentPlanId !== celebratedPlanId) {
      setCelebratedPlanId(recentPlanId);
      setShowCelebration(true);
    }
  }, [celebrationData, recentPlanId, celebratedPlanId]);

  // Calculate plan progress
  const planProgress = useMemo(() => {
    if (!activeTrainingPlan || !exerciseLog) return null;
    const today = new Date().getDay() || 7;
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekStartStr = dateStr(weekStart);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = dateStr(weekEnd);

    const planExercises = (exerciseLog ?? []).filter((e: ExerciseEntry) => !e.deleted && e.planId === activeTrainingPlan.id);
    const weekLogs = planExercises.filter((e: ExerciseEntry) => {
      const d = dateStr(new Date(e.timestamp));
      return d >= weekStartStr && d <= weekEndStr;
    });

    const activeTasks = activeTrainingPlan.tasks.filter(t => t.sportKey && t.sportKey !== 'rest');
    const weekDoneTasks = activeTasks.filter(t => weekLogs.some((l: ExerciseEntry) => l.planTaskWeekday === t.weekday));
    const todayDone = weekLogs.some((l: ExerciseEntry) => l.planTaskWeekday === today);

    return {
      weekComplete: weekDoneTasks.length,
      weekTotal: activeTasks.length,
      todayDone,
      totalDuration: Math.round(weekLogs.reduce((s: number, e: ExerciseEntry) => s + (e.durationSec ?? 0), 0) / 60),
      totalCal: weekLogs.reduce((s: number, e: ExerciseEntry) => s + (e.calories ?? 0), 0),
    };
  }, [activeTrainingPlan, exerciseLog]);

  // Recent exercises (last 3)
  const recentExercises = useMemo(() => {
    return (exerciseLog ?? [])
      .filter((e: ExerciseEntry) => !e.deleted)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 3);
  }, [exerciseLog]);

  // Latest body checkin for banner
  const latestCheckin = useMemo(() => {
    return (bodyCheckins ?? [])
      .filter(c => !c.deleted)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
  }, [bodyCheckins]);

  // Weight trend data for banner
  const weightTrend = useMemo(() => {
    const records = (checkinHistory ?? [])
      .filter(r => !r.deleted && r.weight != null && r.weight > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (records.length < 2) return null;
    const last = records[records.length - 1];
    const prev = records[records.length - 2];
    return {
      current: last.weight,
      diff: last.weight - prev.weight,
      date: last.date,
    };
  }, [checkinHistory]);

  // Resolve today's plan display
  const todayPlanDisplay = useMemo(() => {
    if (!todayPlan || !todayPlan.part || todayPlan.part === 'rest') return null;
    const mappedKey = PART_STRING_TO_KEY[todayPlan.part] ?? todayPlan.part;
    const cat = EXERCISE_CATEGORIES.find(c => c.key === mappedKey);
    return {
      icon: cat?.icon ?? '🏋️',
      label: cat ? T(cat.i18nKey) : todayPlan.part,
      note: todayPlan.note,
    };
  }, [todayPlan, T]);

  const handleSaveAssessment = useCallback((text: string, tags: string[]) => {
    updateUserProfile({ selfAssessment: text, bodyTags: tags });
  }, [updateUserProfile]);

  // Convert snake_case strategy to camelCase for i18n key
  const getStrategyLabel = useCallback((strategy: string) => {
    // 'lose_fat' -> 'LoseFat' -> 'bodyStrategyLoseFat'
    const camelCase = strategy.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
    return T(`bodyStrategy${camelCase}` as never) || strategy;
  }, [T]);

  const handleSaveGoal = useCallback((data: Partial<BodyGoal>) => {
    if (activeGoal) {
      updateBodyGoal(activeGoal.id, data);
    } else {
      addBodyGoal(data);
    }
  }, [activeGoal, updateBodyGoal, addBodyGoal]);

  const handleSaveCheckin = useCallback((data: { date: string; energy: number; pain: number; comfort: number; sleep: number; tags: string[]; note?: string }) => {
    upsertBodyCheckin(data);
  }, [upsertBodyCheckin]);

  const handleSaveWeight = useCallback((data: { date: string; weight: number; bodyFat?: number }) => {
    addWeight(data);
  }, [addWeight]);

  // ── Override handlers ──
  const setOverride = useCallback((date: string, override: DayOverride) => {
    if (!activeTrainingPlan) return;
    const newOverrides = { ...(activeTrainingPlan.overrides ?? {}), [date]: override };
    updateBodyTrainingPlan(activeTrainingPlan.id, { overrides: newOverrides });
  }, [activeTrainingPlan, updateBodyTrainingPlan]);

  const clearOverride = useCallback((date: string) => {
    if (!activeTrainingPlan) return;
    const newOverrides = { ...(activeTrainingPlan.overrides ?? {}) };
    delete newOverrides[date];
    updateBodyTrainingPlan(activeTrainingPlan.id, { overrides: newOverrides });
  }, [activeTrainingPlan, updateBodyTrainingPlan]);

  const handleSkipToday = useCallback(() => {
    setOverride(todayDateStr, { type: 'skip', createdAt: Date.now() });
  }, [setOverride, todayDateStr]);

  const handleUndoOverride = useCallback(() => {
    clearOverride(todayDateStr);
  }, [clearOverride, todayDateStr]);

  const handleSwapConfirm = useCallback((sportKey: string, exercises?: ExerciseDef[]) => {
    setOverride(todayDateStr, {
      type: exercises ? 'custom' : 'swap',
      swapSportKey: exercises ? undefined : sportKey,
      exercises,
      createdAt: Date.now(),
    });
  }, [setOverride, todayDateStr]);

  const handleAdjustConfirm = useCallback((adjustments: { exerciseId: string; sets: number; reps: number; durationSec?: number }[]) => {
    setOverride(todayDateStr, {
      type: 'adjust',
      exerciseAdjustments: adjustments,
      createdAt: Date.now(),
    });
  }, [setOverride, todayDateStr]);

  // Resolve selected day's state for DayActionSheet（必须在 handleDaySwap/handleDaySkip 之前定义）
  const selectedDayTask = selectedDay ? activeTrainingPlan?.tasks.find(t => t.weekday === selectedDay) : undefined;
  const selectedDayIsRest = selectedDayTask?.sportKey === 'rest' || !selectedDayTask?.sportKey;
  // Compute the date for the selected day (offset from today)
  const getSelectedDayDate = useCallback(() => {
    if (!selectedDay) return todayDateStr;
    const today = new Date();
    const todayDow = today.getDay() === 0 ? 7 : today.getDay();
    const diff = selectedDay - todayDow;
    const target = new Date(today);
    target.setDate(today.getDate() + diff);
    return dateStr(target);
  }, [selectedDay, todayDateStr]);
  const selectedDayDate = getSelectedDayDate();
  const selectedDayOverride = selectedDay ? activeTrainingPlan?.overrides?.[selectedDayDate] : undefined;

  const handleDaySwap = useCallback((sportKey: string, exercises?: ExerciseDef[]) => {
    if (!selectedDay) return;
    setOverride(selectedDayDate, {
      type: exercises ? 'custom' : 'swap',
      swapSportKey: exercises ? undefined : sportKey,
      exercises,
      createdAt: Date.now(),
    });
  }, [selectedDay, selectedDayDate, setOverride]);

  const handleDaySkip = useCallback(() => {
    if (!selectedDay) return;
    setOverride(selectedDayDate, { type: 'skip', createdAt: Date.now() });
  }, [selectedDay, selectedDayDate, setOverride]);

  const handleDaySwapConfirm = useCallback((targetDay: number) => {
    if (!selectedDay || !activeTrainingPlan || targetDay === selectedDay) return;
    const tasks = [...activeTrainingPlan.tasks];
    const srcIdx = tasks.findIndex(t => t.weekday === selectedDay);
    const dstIdx = tasks.findIndex(t => t.weekday === targetDay);
    if (srcIdx === -1 && dstIdx === -1) return;
    // Swap the two tasks (or move if one day has no task)
    const newTasks = tasks.map(t => ({ ...t }));
    const srcTask = newTasks.find(t => t.weekday === selectedDay);
    const dstTask = newTasks.find(t => t.weekday === targetDay);
    if (srcTask) srcTask.weekday = targetDay;
    if (dstTask) dstTask.weekday = selectedDay;
    updateBodyTrainingPlan(activeTrainingPlan.id, { tasks: newTasks, updatedAt: Date.now() });
    setShowDaySwapPicker(false);
    setShowDayAction(false);
  }, [selectedDay, activeTrainingPlan, updateBodyTrainingPlan]);

  const handleSaveGoalLight = useCallback((data: { strategy?: string; targetWeight?: number; targetBodyFat?: number; goalNote?: string }) => {
    if (activeTrainingPlan) {
      updateBodyTrainingPlan(activeTrainingPlan.id, data);
    }
  }, [activeTrainingPlan, updateBodyTrainingPlan]);

  // ── Workout flow state tracking ──
  const { flowState } = useBodyFlowState();
  const setBodyFlowState = useShallowStore(s => s.setBodyFlowState);
  const hasActiveFlow = flowState && flowState.startedAt && (Date.now() - flowState.startedAt < 24 * 60 * 60 * 1000);
  const allFlowDone = hasActiveFlow && flowState.exerciseCompleted && flowState.breathingCompleted && flowState.awarenessCompleted;

  // 凌晨重置：flowState 的日期不是今天时重置
  useEffect(() => {
    if (flowState?.startedAt) {
      const todayDate = dateStr();
      const flowDate = dateStr(new Date(flowState.startedAt));
      if (flowDate !== todayDate) {
        setBodyFlowState({ exerciseCompleted: false, breathingCompleted: false, awarenessCompleted: false, practiceCompleted: false, startedAt: Date.now() });
      }
    }
  }, []); // 只在挂载时检查


  return (
    <View>
      {/* ── Banner Carousel ── */}
      <View style={styles.bannerContainer}>
        <ScrollView
          ref={bannerScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / BANNER_WIDTH);
            setCurrentBanner(index);
          }}
          style={{ width: BANNER_WIDTH }}
        >
          {/* Banner 1: 今日方案 */}
          <View style={[styles.bannerCard, { backgroundColor: '#f59e0b' }]}>
            <View style={styles.bannerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>📋</Text>
                <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#fff' }}>{T('bodyTodayPlan')}</Text>
              </View>
              <TouchableOpacity
                onPress={() => nav.navigate('ExerciseHistory' as never)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
              >
                <Text style={{ fontSize: FONT_SMALL(), color: '#fff', fontWeight: '600' }}>{T('exerciseHistory')}</Text>
              </TouchableOpacity>
            </View>
            {/* Override status bar */}
            {hasOverride && todayOverride && (
              <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: 8, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: FONT_SMALL(), color: '#fff' }}>
                  {todayOverride.type === 'skip' ? T('bodyOverrideSkip')
                    : todayOverride.type === 'swap' ? T('bodyOverrideSwap')
                    : todayOverride.type === 'adjust' ? T('bodyOverrideAdjust')
                    : T('bodyOverrideCustom')}
                </Text>
                <TouchableOpacity onPress={handleUndoOverride} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: FONT_SMALL(), color: '#fff', fontWeight: '600', textDecorationLine: 'underline' }}>{T('bodyUndo')}</Text>
                </TouchableOpacity>
              </View>
            )}
            {todayOverride?.type === 'skip' ? (
              /* 跳过状态：显示已跳过 + 撤销，无开始按钮 */
              <View style={styles.bannerContent}>
                <View style={styles.bannerIconCircle}>
                  <Text style={{ fontSize: 24 }}>⏭️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: '#fff' }}>{T('bodyOverrideSkip')}</Text>
                  <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{T('bodyUndoHint')}</Text>
                </View>
              </View>
            ) : todayPlanDisplay ? (
              <>
                {/* ── Flow progress — 今日有计划即显示，不管 flowState 状态 ── */}
                {!allFlowDone && (
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 12, marginBottom: 10, gap: 8 }}>
                    {/* Step 1: 调身练习 */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: flowState?.exerciseCompleted ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 14 }}>{flowState?.exerciseCompleted ? '✅' : '🏃'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#fff' }} numberOfLines={1}>{T('bodyFlowPractice')}{todayPlanDisplay ? ` · ${todayPlanDisplay.label}` : ''}</Text>
                          {flowState?.exerciseCompleted && (
                            <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.7)' }}>
                              {flowState?.totalDurationSec ? `${Math.floor(flowState.totalDurationSec / 60)}:${String(flowState.totalDurationSec % 60).padStart(2, '0')}` : T('bodyFlowDone')}
                            </Text>
                          )}
                        </View>
                        {todayExercises && todayExercises.length > 0 && (
                          <View style={{ marginTop: 4 }}>
                            {todayExercises.slice(0, 5).map((e, i) => (
                              <Text key={i} style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.8)', lineHeight: 16 }}>
                                {e.icon} {e.nameZh}{e.defaultSets && e.defaultReps ? `  ${e.defaultSets}组×${e.defaultReps}次` : ''}
                              </Text>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                    {/* Separator */}
                    <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginLeft: 38 }} />
                    {/* Step 2: 调息安神 */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: flowState?.breathingCompleted ? 'rgba(255,255,255,0.3)' : !flowState?.exerciseCompleted ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 14 }}>{flowState?.breathingCompleted ? '✅' : flowState?.exerciseCompleted ? '🌬️' : '○'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: flowState?.exerciseCompleted ? '#fff' : 'rgba(255,255,255,0.5)' }}>{T('bodyFlowBreathing')}</Text>
                        {flowState?.breathingCompleted && (
                          <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                            {Math.floor((flowState?.breathingDurationMs ?? 0) / 60000)}{T('bodyMin')}
                          </Text>
                        )}
                        {!flowState?.breathingCompleted && flowState?.exerciseCompleted && (
                          <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{T('bodyFlowBreathingHint')}</Text>
                        )}
                      </View>
                    </View>
                    {/* Separator */}
                    <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginLeft: 38 }} />
                    {/* Step 3: 记录感受 */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: flowState?.awarenessCompleted ? 'rgba(255,255,255,0.3)' : flowState?.breathingCompleted ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 14 }}>{flowState?.awarenessCompleted ? '✅' : flowState?.breathingCompleted ? '🧠' : '○'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: flowState?.breathingCompleted ? '#fff' : 'rgba(255,255,255,0.5)' }}>{T('bodyFlowAwareness')}</Text>
                        {flowState?.awarenessCompleted && (
                          <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{T('bodyFlowDone')}</Text>
                        )}
                        {!flowState?.awarenessCompleted && flowState?.breathingCompleted && (
                          <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{T('bodyFlowAwarenessHint')}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                )}
                {allFlowDone && (
                  <View>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: 10, marginBottom: 10, alignItems: 'center' }}>
                      <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#fff' }}>{'✅ '}{T('bodyTodayComplete')}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        if (activeTrainingPlan?.id) {
                          onFlowStartWithPlan?.(activeTrainingPlan.id);
                        } else {
                          onFlowStart?.();
                        }
                      }}
                      activeOpacity={0.85}
                      style={styles.bannerButton}
                    >
                      <Play size={20} color="#f59e0b" />
                      <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#f59e0b' }}>{T('bodyRedo')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {!hasActiveFlow ? (
                  <TouchableOpacity
                    onPress={() => {
                      if (activeTrainingPlan?.id) {
                        onFlowStartWithPlan?.(activeTrainingPlan.id);
                      } else {
                        onFlowStart?.();
                      }
                    }}
                    activeOpacity={0.85}
                    style={styles.bannerButton}
                  >
                    <Play size={20} color="#f59e0b" />
                    <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#f59e0b' }}>{T('bodyStartToday')}</Text>
                  </TouchableOpacity>
                ) : !allFlowDone ? (
                  <TouchableOpacity
                    onPress={() => {
                      if (activeTrainingPlan?.id) {
                        onFlowStartWithPlan?.(activeTrainingPlan.id);
                      } else {
                        onFlowStart?.();
                      }
                    }}
                    activeOpacity={0.85}
                    style={styles.bannerButton}
                  >
                    <Play size={20} color="#f59e0b" />
                    <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#f59e0b' }}>
                      {!flowState.exerciseCompleted ? T('bodyStartToday')
                        : !flowState.breathingCompleted ? T('bodyFlowStartBreathing')
                        : T('bodyFlowAwareness')}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </>
            ) : (
              <>
                <View style={styles.bannerContent}>
                  <View style={styles.bannerIconCircle}>
                    <Text style={{ fontSize: 24 }}>😴</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: '#fff' }}>{T('bodyTodayPlanRest')}</Text>
                    <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
                      {T('bodyFlowChooseExercise')}
                    </Text>
                  </View>
                </View>
                {/* Rest day suggestions */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  {[
                    { icon: '🧘', label: T('bodyPartWalking') },
                    { icon: '🧘‍♀️', label: T('bodyPartYoga') },
                    { icon: '🌬️', label: T('bodyFlowBreathing') },
                  ].map((item, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => { if (activeTrainingPlan?.id) onFlowStartWithPlan?.(activeTrainingPlan.id); else onFlowStart?.(); }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                    >
                      <Text style={{ fontSize: 14 }}>{item.icon}</Text>
                      <Text style={{ fontSize: FONT_SMALL(), color: '#fff' }}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {/* Body awareness quick stats */}
                {latestCheckin && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 8 }}>
                    {[
                      { label: T('bodyEnergy'), value: latestCheckin.energy, color: '#fff' },
                      { label: T('bodyPain'), value: latestCheckin.pain, color: '#fff' },
                      { label: T('bodyComfort'), value: latestCheckin.comfort, color: '#fff' },
                    ].map((item, i) => (
                      <View key={i} style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: item.color }}>{String(item.value)}</Text>
                        <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.7)' }}>{item.label}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>

          {/* Banner 2: 身体档案 */}
          <View style={[styles.bannerCard, { backgroundColor: '#8b5cf6' }]}>
            <View style={styles.bannerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>📋</Text>
                <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#fff' }}>{T('bodyProfile')}</Text>
              </View>
            </View>
            <View style={styles.bannerContent}>
              <View style={{ flex: 1 }}>
                {/* Body metrics - card style */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12, gap: 4 }}>
                  {[
                    { value: profile.weight ? `${profile.weight}` : '-', unit: 'kg', label: T('bodyWeight') },
                    { value: profile.height ? `${profile.height}` : '-', unit: 'cm', label: T('bodyHeight') },
                    { value: profile.weight && profile.height ? `${(profile.weight / ((profile.height / 100) ** 2)).toFixed(1)}` : '-', unit: '', label: 'BMI' },
                    { value: profile.bodyFat ? `${profile.bodyFat}` : '-', unit: '%', label: T('bodyBodyFat') },
                  ].map((item, i) => (
                    <View key={i} style={{ flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 4 }}>
                      <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: '#fff' }}>{String(item.value)}<Text style={{ fontSize: FONT_SUB(), color: 'rgba(255,255,255,0.7)' }}>{item.unit}</Text></Text>
                      <Text style={{ fontSize: FONT_BODY(), color: 'rgba(255,255,255,0.7)', marginTop: 2, textAlign: 'center' }}>{item.label}</Text>
                    </View>
                  ))}
                </View>
                {/* Self assessment */}
                {profile.selfAssessment ? (
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 10 }}>
                    <Text style={{ fontSize: FONT_BODY(), color: 'rgba(255,255,255,0.9)', lineHeight: 20 }}>
                      {profile.selfAssessment}
                    </Text>
                    {(profile.bodyTags as string[] ?? []).length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                        {(profile.bodyTags as string[]).map((tag: string) => (
                          <View key={tag} style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                            <Text style={{ fontSize: FONT_BODY(), color: '#fff' }}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={{ fontSize: FONT_BODY(), color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>
                    {T('bodySelfAssessmentPlaceholder')}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setShowAssessment(true)}
              activeOpacity={0.85}
              style={[styles.bannerButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
            >
              <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#8b5cf6' }}>{T('bodySelfAssessment')}</Text>
            </TouchableOpacity>
          </View>

          {/* Banner 3: 身体觉知 */}
          <View style={[styles.bannerCard, { backgroundColor: '#10b981' }]}>
            <View style={styles.bannerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>🧘</Text>
                <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: '#fff' }}>{T('bodyAwareness')}</Text>
              </View>
              <TouchableOpacity
                onPress={() => nav.navigate('BodyCheckinHistory' as never)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}
              >
                <Text style={{ fontSize: FONT_SMALL(), color: '#fff' }}>{T('bodyAwarenessRecords')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.bannerContent}>
              <View style={{ flex: 1 }}>
                {latestCheckin ? (
                  <>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12, gap: 4 }}>
                      {[
                        { label: T('bodyEnergy'), value: latestCheckin.energy, color: '#fbbf24' },
                        { label: T('bodyPain'), value: latestCheckin.pain, color: '#f87171' },
                        { label: T('bodyComfort'), value: latestCheckin.comfort, color: '#34d399' },
                        { label: T('bodySleepQuality'), value: latestCheckin.sleep, color: '#60a5fa' },
                      ].map((item, i) => (
                        <View key={i} style={{ flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 4 }}>
                          <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: item.color }}>{String(item.value)}</Text>
                          <Text style={{ fontSize: FONT_BODY(), color: 'rgba(255,255,255,0.7)', marginTop: 2, textAlign: 'center' }}>{item.label}</Text>
                        </View>
                      ))}
                    </View>
                    {/* Tags */}
                    {latestCheckin.tags && latestCheckin.tags.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                        {latestCheckin.tags.map((tag: string) => (
                          <View key={tag} style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                            <Text style={{ fontSize: FONT_BODY(), color: '#fff' }}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {/* Note */}
                    {latestCheckin.note && (
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 8, marginBottom: 8 }}>
                        <Text style={{ fontSize: FONT_BODY(), color: 'rgba(255,255,255,0.9)', lineHeight: 20 }} numberOfLines={2}>
                          {latestCheckin.note}
                        </Text>
                      </View>
                    )}
                    <Text style={{ fontSize: FONT_BODY(), color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>
                      {latestCheckin.date}
                    </Text>
                  </>
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                    <Text style={{ fontSize: 24, marginBottom: 6 }}>🧘</Text>
                    <Text style={{ fontSize: FONT_BODY(), color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>
                      {T('bodyAwarenessNoData')}
                    </Text>
                    <Text style={{ fontSize: FONT_SUB(), color: 'rgba(255,255,255,0.5)', marginTop: 4, textAlign: 'center' }}>
                      {T('bodyFlowAwarenessHint')}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setShowCheckin(true)}
              activeOpacity={0.85}
              style={[styles.bannerButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
            >
              <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#10b981' }}>{T('bodyFlowAwareness')}</Text>
            </TouchableOpacity>
          </View>

          {/* Banner 4: 体重趋势 */}
          <View style={[styles.bannerCard, { backgroundColor: '#3b82f6' }]}>
            <View style={styles.bannerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>⚖️</Text>
                <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: '#fff' }}>{T('bodyWeightTrend')}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowWeightRecord(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
              >
                <Text style={{ fontSize: FONT_SMALL(), color: '#fff', fontWeight: '600' }}>{T('bodyRecordWeight')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.bannerContent}>
              <View style={{ flex: 1 }}>
                {weightTrend ? (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: '#fff' }}>
                        {`${weightTrend.current} kg`}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <TrendingUp size={18} color={weightTrend.diff > 0 ? '#fbbf24' : '#34d399'} style={weightTrend.diff < 0 ? { transform: [{ scaleY: -1 }] } : undefined} />
                        <Text style={{ fontSize: FONT_BODY(), color: weightTrend.diff > 0 ? '#fbbf24' : '#34d399', fontWeight: '600' }}>
                          {`${weightTrend.diff > 0 ? '+' : ''}${weightTrend.diff.toFixed(1)} kg`}
                        </Text>
                      </View>
                    </View>
                    {/* Line chart - last 7 days */}
                    <View style={{ height: 80, marginTop: 4 }}>
                      {(() => {
                        const records = (checkinHistory ?? [])
                          .filter(r => !r.deleted && r.weight != null && r.weight > 0)
                          .sort((a, b) => a.date.localeCompare(b.date))
                          .slice(-7);
                        if (records.length < 2) return null;
                        const weights = records.map(r => r.weight);
                        const minW = Math.min(...weights);
                        const maxW = Math.max(...weights);
                        const range = maxW - minW || 1;
                        const chartHeight = 50;
                        const labelHeight = 20;
                        const totalHeight = chartHeight + labelHeight;
                        const chartWidth = BANNER_WIDTH - 80;
                        const stepX = chartWidth / (records.length - 1);

                        return (
                          <View style={{ position: 'relative', height: totalHeight }}>
                            {/* Line segments */}
                            {records.map((r, i) => {
                              if (i === 0) return null;
                              const prevR = records[i - 1];
                              const x1 = (i - 1) * stepX;
                              const y1 = chartHeight - ((prevR.weight - minW) / range) * (chartHeight - 15);
                              const x2 = i * stepX;
                              const y2 = chartHeight - ((r.weight - minW) / range) * (chartHeight - 15);
                              const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
                              const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
                              return (
                                <View
                                  key={`line-${i}`}
                                  style={{
                                    position: 'absolute',
                                    left: x1,
                                    top: y1,
                                    width: length,
                                    height: 2,
                                    backgroundColor: 'rgba(255,255,255,0.8)',
                                    transform: [{ rotate: `${angle}deg` }],
                                    transformOrigin: '0 0',
                                  }}
                                />
                              );
                            })}
                            {/* Data points with weight labels */}
                            {records.map((r, i) => {
                              const x = i * stepX;
                              const y = chartHeight - ((r.weight - minW) / range) * (chartHeight - 15);
                              const isLast = i === records.length - 1;
                              return (
                                <React.Fragment key={`point-${i}`}>
                                  {/* Weight value above point */}
                                  <Text style={{
                                    position: 'absolute',
                                    left: x - 15,
                                    top: y - 18,
                                    fontSize: FONT_SMALL(),
                                    color: '#fff',
                                    fontWeight: isLast ? '700' : '500',
                                    width: 30,
                                    textAlign: 'center',
                                  }}>
                                    {String(r.weight)}
                                  </Text>
                                  {/* Point */}
                                  <View style={{
                                    position: 'absolute',
                                    left: x - 5,
                                    top: y - 5,
                                    width: isLast ? 12 : 8,
                                    height: isLast ? 12 : 8,
                                    borderRadius: isLast ? 6 : 4,
                                    backgroundColor: isLast ? '#fff' : 'rgba(255,255,255,0.7)',
                                  }} />
                                </React.Fragment>
                              );
                            })}
                            {/* Date labels at bottom */}
                            {records.map((r, i) => (
                              <Text
                                key={`label-${i}`}
                                style={{
                                  position: 'absolute',
                                  left: i * stepX - 12,
                                  top: chartHeight + 4,
                                  fontSize: FONT_SMALL(),
                                  color: 'rgba(255,255,255,0.8)',
                                  width: 24,
                                  textAlign: 'center',
                                }}
                              >
                                {r.date.slice(8)}
                              </Text>
                            ))}
                          </View>
                        );
                      })()}
                    </View>
                  </>
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                    <Text style={{ fontSize: 40, marginBottom: 8 }}>📊</Text>
                    <Text style={{ fontSize: FONT_BODY(), color: 'rgba(255,255,255,0.8)' }}>
                      {T('bodyWeightNoData')}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setShowWeightTrend(true)}
              activeOpacity={0.85}
              style={[styles.bannerButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
            >
              <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#3b82f6' }}>{T('bodyMoreWeightTrend')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Banner indicators */}
        <View style={styles.bannerIndicators}>
          {[0, 1, 2, 3].map(i => (
            <View
              key={i}
              style={[
                styles.bannerDot,
                { backgroundColor: i === currentBanner ? '#fff' : 'rgba(255,255,255,0.4)' }
              ]}
            />
          ))}
        </View>
        {/* Guide text */}
        <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, textAlign: 'center', marginTop: 6 }}>
          {T('bodySwipeHint')}
        </Text>
      </View>

      {/* ── 调身目标 ── */}
      <TouchableOpacity
        onPress={() => setShowGoalEdit(true)}
        activeOpacity={0.85}
        style={[styles.goalCard, { backgroundColor: TH.card }]}
      >
        <View style={styles.goalHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.goalIconCircle, { backgroundColor: '#8b5cf6' }]}>
              <Target size={18} color="#fff" />
            </View>
            <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text }}>{T('bodyGoal')}</Text>
          </View>
          <Text style={{ fontSize: FONT_SMALL(), color: '#8b5cf6' }}>{activeGoal ? T('bodyGoalEdit') : T('bodyGoalSet')}</Text>
        </View>
        {activeGoal ? (
          <View style={styles.goalContent}>
            <View style={styles.goalMetrics}>
              {activeGoal.targetWeight != null && (
                <View style={styles.goalMetricItem}>
                  <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: TH.text }}>{`${activeGoal.targetWeight}kg`}</Text>
                  <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T('bodyTargetWeight')}</Text>
                </View>
              )}
              {activeGoal.targetBodyFat != null && (
                <View style={styles.goalMetricItem}>
                  <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: TH.text }}>{`${activeGoal.targetBodyFat}%`}</Text>
                  <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T('bodyTargetBodyFat')}</Text>
                </View>
              )}
              {activeGoal.strategy && (
                <View style={styles.goalMetricItem}>
                  <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '600', color: '#8b5cf6' }}>
                    {getStrategyLabel(activeGoal.strategy)}
                  </Text>
                  <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T('bodyStrategyLabel')}</Text>
                </View>
              )}
            </View>
            {activeGoal.targetDate && (
              <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, marginTop: 8 }}>{T('bodyTargetDate')}: {activeGoal.targetDate}</Text>
            )}
          </View>
        ) : (
          <View style={styles.goalEmpty}>
            <Text style={{ fontSize: FONT_BODY(), color: TH.sub }}>{T('bodyGoalNotSet')}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* ── 我的训练计划 ── */}
      <TouchableOpacity
        onPress={() => nav.navigate('PlanManagement' as never)}
        activeOpacity={0.85}
        style={[styles.planCard, { backgroundColor: TH.card }]}
      >
        <View style={styles.planHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.planIconCircle, { backgroundColor: '#f59e0b' }]}>
              <Dumbbell size={18} color="#fff" />
            </View>
            <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text }}>{T('bodyPlanManagement')}</Text>
          </View>
          <Text style={{ fontSize: FONT_SMALL(), color: '#f59e0b' }}>{activeTrainingPlan ? T('bodyPlanEdit') : T('bodyPlanCreate')}</Text>
        </View>
        {activeTrainingPlan ? (
          <View style={styles.planContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: TH.text }}>{activeTrainingPlan.name}</Text>
              <View style={[styles.planBadge, { backgroundColor: '#10b98115' }]}>
                <Text style={{ fontSize: FONT_SMALL(), color: '#10b981', fontWeight: '600' }}>{T('bodyPlanActive')}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
              <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{activeTrainingPlan.startDate} ~ {activeTrainingPlan.endDate}</Text>
              <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{String(activeTrainingPlan.tasks.filter(t => t.sportKey && t.sportKey !== 'rest').length)}天/周</Text>
            </View>
            {planProgress && (
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T('bodyProgress')}</Text>
                  <Text style={{ fontSize: FONT_SMALL(), color: TH.text, fontWeight: '600' }}>{String(planProgress.weekComplete)}/{String(planProgress.weekTotal)}</Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: TH.border, height: 6 }]}>
                  <View style={[styles.progressBarFill, { backgroundColor: '#f59e0b', height: 6, width: `${planProgress.weekTotal > 0 ? (planProgress.weekComplete / planProgress.weekTotal) * 100 : 0}%` }]} />
                </View>
              </View>
            )}
            {/* 周计划任务 */}
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: TH.border }}>
              <Text style={{ fontSize: FONT_LABEL(), color: TH.sub, marginBottom: 10 }}>{T('bodyWeeklyPlan')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {activeTrainingPlan.tasks.map((task) => {
                  const exercises = task.exercises ?? [];
                  const isRest = !task.sportKey || task.sportKey === 'rest';
                  const weekdayKeys = ['bodyWeekMon', 'bodyWeekTue', 'bodyWeekWed', 'bodyWeekThu', 'bodyWeekFri', 'bodyWeekSat', 'bodyWeekSun'];
                  const formatEx = (e: ExerciseDef) => {
                    const sets = e.defaultSets;
                    const reps = e.defaultReps;
                    const dur = e.defaultDurationSec;
                    if (sets && reps) return `${sets}×${reps}`;
                    if (sets) return `${sets}组`;
                    if (dur) return `${Math.round(dur / 60)}分钟`;
                    return '';
                  };
                  return (
                    <View key={task.weekday} style={{ width: 'calc((100% - 24px) / 4)', minWidth: 72, borderRadius: 10, borderWidth: 1, borderColor: isRest ? TH.border : '#f59e0b30', backgroundColor: isRest ? TH.bg : '#f59e0b08', padding: 8 }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: isRest ? TH.border : '#f59e0b', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                        <Text style={{ fontSize: 10, color: isRest ? TH.sub : '#fff', fontWeight: '700' }}>{T(weekdayKeys[task.weekday - 1])}</Text>
                      </View>
                      {isRest ? (
                        <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, fontStyle: 'italic' }}>{T('bodyPlanRestDay')}</Text>
                      ) : exercises.length > 0 ? (
                        exercises.map((e, i) => (
                          <Text key={i} style={{ fontSize: 11, color: TH.text, lineHeight: 16 }}>
                            <Text style={{ fontWeight: '600' }}>{e.nameZh}</Text>
                            {formatEx(e) ? <Text style={{ color: TH.sub }}> {formatEx(e)}</Text> : null}
                          </Text>
                        ))
                      ) : (
                        <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>—</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.planEmpty}>
            <Text style={{ fontSize: FONT_BODY(), color: TH.sub }}>{T('bodyPlanNotSet')}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* ── 本周进度 ── */}
      {planProgress && (
        <View style={[styles.progressCard, { backgroundColor: TH.card }]}>
          <View style={styles.progressHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={18} color="#10b981" />
              <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text }}>{T('bodyWeeklyProgress')}</Text>
            </View>
            <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>
              {String(planProgress.weekComplete)}/{String(planProgress.weekTotal)}
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarBg, { backgroundColor: TH.border }]}>
              <View
                style={[styles.progressBarFill, {
                  width: `${planProgress.weekTotal > 0 ? (planProgress.weekComplete / planProgress.weekTotal) * 100 : 0}%`,
                  backgroundColor: '#10b981',
                }]}
              />
            </View>
          </View>
          <View style={styles.progressStats}>
            <View style={styles.progressStatItem}>
              <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: '#f59e0b' }}>{String(planProgress.totalDuration)}</Text>
              <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T('exerciseMin')}</Text>
            </View>
            <View style={styles.progressStatItem}>
              <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: '#ef4444' }}>{String(planProgress.totalCal)}</Text>
              <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>kcal</Text>
            </View>
            <View style={styles.progressStatItem}>
              <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: '#8b5cf6' }}>{String(planProgress.weekComplete)}</Text>
              <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T('bodyDayCompleted')}</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── 最近训练 ── */}
      {recentExercises.length > 0 && (
        <View style={[styles.recentCard, { backgroundColor: TH.card }]}>
          <View style={styles.recentHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Activity size={18} color="#f59e0b" />
              <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text }}>{T('exerciseRecentActivity')}</Text>
            </View>
            <TouchableOpacity onPress={() => nav.navigate('ExerciseHistory' as never)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: FONT_SMALL(), color: TH.primary }}>{T('exerciseHistory')}</Text>
              <ChevronRight size={14} color={TH.primary} />
            </TouchableOpacity>
          </View>
          {recentExercises.map((e, i) => {
            const cat = EXERCISE_CATEGORIES.find(c => c.key === e.sportKey);
            const sportLabel = e.sportKey === COMBO_WORKOUT_SPORT_KEY ? T('bodyComboTraining') : (cat ? T(cat.i18nKey) : e.sportKey);
            return (
            <View key={e.id} style={[styles.recentItem, { borderBottomWidth: i < recentExercises.length - 1 ? 1 : 0, borderBottomColor: TH.border }]}>
              <Text style={{ fontSize: 20 }}>{e.sportIcon}</Text>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: TH.text }}>{sportLabel}</Text>
                <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>
                  {String(Math.floor(e.durationSec / 60))}{T('bodyMin')} {e.calories ? `· ${e.calories}kcal` : ''}
                </Text>
              </View>
              <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>
                {new Date(e.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
            );
          })}
        </View>
      )}

      <AssessmentModal visible={showAssessment} TH={TH} T={T} profile={profile} onClose={() => setShowAssessment(false)} onSave={handleSaveAssessment} />
      <GoalEditModal visible={showGoalEdit} TH={TH} T={T} goal={activeGoal} profile={profile} onClose={() => setShowGoalEdit(false)} onSave={handleSaveGoal} />
      <BodyCheckinModal visible={showCheckin} TH={TH} T={T} todayPlan={todayPlan} onClose={() => setShowCheckin(false)} onSave={handleSaveCheckin} />
      <WeightRecordModal visible={showWeightRecord} TH={TH} T={T} currentWeight={profile.weight as number | undefined} currentBodyFat={profile.bodyFat as number | undefined} onClose={() => setShowWeightRecord(false)} onSave={handleSaveWeight} />
      <WeightTrendModal visible={showWeightTrend} TH={TH} T={T} checkins={checkinHistory ?? []} onClose={() => setShowWeightTrend(false)} />

      {/* Override modals */}
      <QuickSwapModal visible={showQuickSwap} onClose={() => setShowQuickSwap(false)} onConfirm={handleSwapConfirm} TH={TH} T={T} />
      {todayExercises && (
        <AdjustExerciseModal visible={showAdjustExercise} onClose={() => setShowAdjustExercise(false)} onConfirm={handleAdjustConfirm} exercises={todayExercises} TH={TH} T={T} />
      )}
      <DayActionSheet
        visible={showDayAction}
        onClose={() => setShowDayAction(false)}
        dayLabel={selectedDay ? T(`bodyWeek${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][selectedDay - 1]}`) : ''}
        isRest={selectedDayIsRest}
        hasOverride={!!selectedDayOverride}
        onSwap={() => { setShowDayAction(false); setShowQuickSwap(true); }}
        onSkip={handleDaySkip}
        onSwapDays={() => { setShowDayAction(false); setShowDaySwapPicker(true); }}
        onAdjust={() => { setShowDayAction(false); setShowAdjustExercise(true); }}
        TH={TH} T={T}
      />
      {activeTrainingPlan && (
        <GoalEditLightModal
          visible={showGoalEditLight}
          onClose={() => setShowGoalEditLight(false)}
          onConfirm={handleSaveGoalLight}
          initialStrategy={activeTrainingPlan.strategy}
          initialTargetWeight={activeTrainingPlan.targetWeight}
          initialTargetBodyFat={activeTrainingPlan.targetBodyFat}
          initialGoalNote={activeTrainingPlan.goalNote}
          TH={TH} T={T}
        />
      )}

      {/* Day swap picker modal */}
      <Modal visible={showDaySwapPicker} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24, width: '80%', maxWidth: 320 }}>
            <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text, marginBottom: 16, textAlign: 'center' }}>
              {T('bodySwapDays')}
            </Text>
            {[1,2,3,4,5,6,7].filter(d => d !== selectedDay).map(d => (
              <TouchableOpacity
                key={d}
                onPress={() => handleDaySwapConfirm(d)}
                style={{ paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, marginBottom: 8, backgroundColor: `${TH.primary}15`, borderWidth: 1, borderColor: `${TH.primary}30` }}
              >
                <Text style={{ fontSize: FONT_BODY(), color: TH.text, fontWeight: '600', textAlign: 'center' }}>
                  {T(`bodyWeek${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][d - 1]}`)}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setShowDaySwapPicker(false)}
              style={{ paddingVertical: 12, alignItems: 'center', marginTop: 8 }}
            >
              <Text style={{ fontSize: FONT_BODY(), color: TH.sub }}>{T('commonCancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {celebrationData && (
        <CelebrationOverlay
          visible={showCelebration}
          TH={TH} T={T}
          data={celebrationData}
          onDismiss={() => setShowCelebration(false)}
        />
      )}
    </View>
  );
}

