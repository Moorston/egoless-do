import { dateStr, type AgeBracket, type BodyGoal, type BodyTrainingPlan, type ExerciseEntry, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, FONT_STAT_CARD, FONT_STAT_SECTION, FONT_BADGE, generateSuggestions, EXERCISE_CATEGORIES, PART_STRING_TO_KEY, BODY_TAGS_PRESET, type DayOverride, type ExerciseDef } from '@egoless-do/core';
import { ChevronRight, Play, Calendar, Target, Dumbbell, TrendingUp, Activity, Scale, History, Settings, ChevronLeft, ChevronDown } from 'lucide-react-native';
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Animated, Alert } from 'react-native';

import { useT, useTheme } from '../../../components/UI';
import { useRootNavigation } from '../../../navigation/hooks';
import { useShallowStore } from '../../../store/useAppStore';

import CelebrationOverlay from './screens/CelebrationOverlay';
import { useTodayPlan } from './hooks/useTodayPlan';
import AssessmentModal from './modals/AssessmentModal';
import BodyCheckinModal from './modals/BodyCheckinModal';
import GoalEditModal from './modals/GoalEditModal';
import WeightRecordModal from './modals/WeightRecordModal';
import WeightTrendModal from './modals/WeightTrendModal';
import QuickSwapModal from './modals/QuickSwapModal';
import AdjustExerciseModal from './modals/AdjustExerciseModal';
import DayActionSheet from './modals/DayActionSheet';
import GoalEditLightModal from './modals/GoalEditLightModal';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BANNER_WIDTH = SCREEN_WIDTH - 32; // 16px padding on each side

interface DashboardProps {
  onFlowStart?: () => void;
  onFlowStartWithPlan?: (planId: string) => void;
}

export default function BodyDashboard({ onFlowStart, onFlowStartWithPlan }: DashboardProps) {
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
  useEffect(() => {
    const today = dateStr();
    for (const plan of bodyTrainingPlans ?? []) {
      if (plan.status === 'active' && plan.endDate < today && !plan.deleted) {
        updateBodyTrainingPlan(plan.id, { status: 'completed' });
      }
    }
  }, [bodyTrainingPlans, updateBodyTrainingPlan]);

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

  const handleSaveGoalLight = useCallback((data: { strategy?: string; targetWeight?: number; targetBodyFat?: number; goalNote?: string }) => {
    if (activeTrainingPlan) {
      updateBodyTrainingPlan(activeTrainingPlan.id, data);
    }
  }, [activeTrainingPlan, updateBodyTrainingPlan]);

  // Open DayActionSheet for a specific day
  const openDayAction = useCallback((day: number) => {
    setSelectedDay(day);
    setShowDayAction(true);
  }, []);

  // Resolve selected day's state for DayActionSheet
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
  const selectedDayOverride = activeTrainingPlan?.overrides?.[selectedDayDate];

  return (
    <View>
      <Text style={{fontSize: 20, color: TH.text, padding: 10}}>
        BodyDashboard v5 - sections below
      </Text>
      {null}
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    marginBottom: 12,
    alignItems: 'center',
  },
  bannerCard: {
    width: BANNER_WIDTH,
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  bannerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bannerIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  bannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickActionItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  progressCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressStatItem: {
    alignItems: 'center',
  },
  recentCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  goalCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalContent: {
    marginBottom: 4,
  },
  goalMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  goalMetricItem: {
    alignItems: 'center',
  },
  goalEmpty: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  planCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planContent: {
    marginBottom: 4,
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  planEmpty: {
    alignItems: 'center',
    paddingVertical: 16,
  },
});
