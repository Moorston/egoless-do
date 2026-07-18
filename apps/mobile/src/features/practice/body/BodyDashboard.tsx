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
                <Text style={{ fontSize: FONT_SMALL(), color: '#fff', fontWeight: '600' }}>{T('exerciseHistory') || '锻炼记录'}</Text>
              </TouchableOpacity>
            </View>
            {/* Override status bar */}
            {hasOverride && todayOverride && (
              <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: 8, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: FONT_SMALL(), color: '#fff' }}>
                  {todayOverride.type === 'skip' ? (T('bodyOverrideSkip') || '已标记跳过')
                    : todayOverride.type === 'swap' ? (T('bodyOverrideSwap') || '已换动作')
                    : todayOverride.type === 'adjust' ? (T('bodyOverrideAdjust') || '已调整组数')
                    : (T('bodyOverrideCustom') || '已自定义')}
                </Text>
                <TouchableOpacity onPress={handleUndoOverride} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: FONT_SMALL(), color: '#fff', fontWeight: '600', textDecorationLine: 'underline' }}>{T('bodyUndo') || '撤销'}</Text>
                </TouchableOpacity>
              </View>
            )}
            {todayPlanDisplay ? (
              <>
                <View style={styles.bannerContent}>
                  <View style={styles.bannerIconCircle}>
                    <Text style={{ fontSize: 24 }}>{todayPlanDisplay.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: '#fff' }}>{todayPlanDisplay.label}</Text>
                    {todayPlanDisplay.note && (
                      <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.8)', marginTop: 2 }} numberOfLines={1}>
                        {todayPlanDisplay.note}
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => onFlowStart?.()}
                  activeOpacity={0.85}
                  style={styles.bannerButton}
                >
                  <Play size={20} color="#f59e0b" />
                  <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#f59e0b' }}>{T('bodyStartToday')}</Text>
                </TouchableOpacity>
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
                      {T('bodyFlowChooseExercise') || '也可以选择其他运动'}
                    </Text>
                  </View>
                </View>
                {/* Rest day suggestions */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  {[
                    { icon: '🧘', label: T('bodyPartWalking') || '散步行禅' },
                    { icon: '🧘‍♀️', label: T('bodyPartYoga') || '拉伸/瑜伽' },
                    { icon: '🌬️', label: T('bodyFlowBreathing') || '呼吸引导' },
                  ].map((item, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => onFlowStart?.()}
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
                      { label: T('bodyEnergy') || '能量', value: latestCheckin.energy, color: '#fff' },
                      { label: T('bodyPain') || '疼痛', value: latestCheckin.pain, color: '#fff' },
                      { label: T('bodyComfort') || '舒适', value: latestCheckin.comfort, color: '#fff' },
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
                <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#fff' }}>{T('bodyProfile') || '身体档案'}</Text>
              </View>
            </View>
            <View style={styles.bannerContent}>
              <View style={{ flex: 1 }}>
                {/* Body metrics - single row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  {[
                    { value: profile.weight ? `${profile.weight}` : '-', unit: 'kg', label: T('bodyWeight') || '体重' },
                    { value: profile.height ? `${profile.height}` : '-', unit: 'cm', label: T('bodyHeight') || '身高' },
                    { value: profile.weight && profile.height ? `${(profile.weight / ((profile.height / 100) ** 2)).toFixed(1)}` : '-', unit: '', label: 'BMI' },
                    { value: profile.bodyFat ? `${profile.bodyFat}` : '-', unit: '%', label: T('bodyBodyFat') || '体脂' },
                  ].map((item, i) => (
                    <View key={i} style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: '#fff' }}>{String(item.value)}{item.unit}</Text>
                      <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.7)' }}>{item.label}</Text>
                    </View>
                  ))}
                </View>
                {/* Self assessment full content */}
                {profile.selfAssessment ? (
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 10 }}>
                    <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.9)', lineHeight: 18 }}>
                      🗣️ {profile.selfAssessment}
                    </Text>
                    {(profile.bodyTags as string[] ?? []).length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {(profile.bodyTags as string[]).map((tag: string) => (
                          <View key={tag} style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                            <Text style={{ fontSize: FONT_SMALL(), color: '#fff' }}>#{tag}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.7)' }}>
                    {T('bodySelfAssessmentPlaceholder') || '记录你的身体状态和感受...'}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setShowAssessment(true)}
              activeOpacity={0.85}
              style={[styles.bannerButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
            >
              <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#8b5cf6' }}>{T('bodySelfAssessment') || '自我评估'}</Text>
            </TouchableOpacity>
          </View>

          {/* Banner 3: 身体觉知 */}
          <View style={[styles.bannerCard, { backgroundColor: '#10b981' }]}>
            <View style={styles.bannerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>🧘</Text>
                <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#fff' }}>{T('bodyAwareness') || '身体觉知'}</Text>
              </View>
              <TouchableOpacity
                onPress={() => nav.navigate('BodyCheckinHistory' as never)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}
              >
                <Text style={{ fontSize: FONT_SMALL(), color: '#fff' }}>{T('bodyAwarenessRecords') || '记录'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.bannerContent}>
              <View style={{ flex: 1 }}>
                {latestCheckin ? (
                  <>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                      {[
                        { label: T('bodyEnergy') || '能量', value: latestCheckin.energy, color: '#fff' },
                        { label: T('bodyPain') || '疼痛', value: latestCheckin.pain, color: '#fff' },
                        { label: T('bodyComfort') || '舒适', value: latestCheckin.comfort, color: '#fff' },
                        { label: T('bodySleepQuality') || '睡眠', value: latestCheckin.sleep, color: '#fff' },
                      ].map((item, i) => (
                        <View key={i} style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: item.color }}>{String(item.value)}</Text>
                          <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.7)' }}>{item.label}</Text>
                        </View>
                      ))}
                    </View>
                    {/* Tags */}
                    {latestCheckin.tags && latestCheckin.tags.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                        {latestCheckin.tags.map((tag: string) => (
                          <View key={tag} style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                            <Text style={{ fontSize: FONT_SMALL(), color: '#fff' }}>#{tag}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {/* Note */}
                    {latestCheckin.note && (
                      <Text style={{ fontSize: FONT_BODY(), color: 'rgba(255,255,255,0.8)', marginBottom: 4 }} numberOfLines={2}>
                        📝 {latestCheckin.note}
                      </Text>
                    )}
                    <Text style={{ fontSize: FONT_BODY(), color: 'rgba(255,255,255,0.6)' }}>
                      {latestCheckin.date}
                    </Text>
                  </>
                ) : (
                  <Text style={{ fontSize: FONT_BODY(), color: 'rgba(255,255,255,0.8)' }}>
                    {T('bodyAwarenessNoData') || '暂无觉知记录'}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setShowCheckin(true)}
              activeOpacity={0.85}
              style={[styles.bannerButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
            >
              <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#10b981' }}>{T('bodyFlowAwareness') || '记录觉知'}</Text>
            </TouchableOpacity>
          </View>

          {/* Banner 4: 体重趋势 */}
          <View style={[styles.bannerCard, { backgroundColor: '#3b82f6' }]}>
            <View style={styles.bannerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>⚖️</Text>
                <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#fff' }}>{T('bodyWeightTrend') || '体重趋势'}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowWeightRecord(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
              >
                <Text style={{ fontSize: FONT_SMALL(), color: '#fff', fontWeight: '600' }}>{T('bodyRecordWeight') || '记录体重'}</Text>
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
                        <TrendingUp size={16} color={weightTrend.diff > 0 ? '#fbbf24' : '#34d399'} style={weightTrend.diff < 0 ? { transform: [{ scaleY: -1 }] } : undefined} />
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
                      {T('bodyWeightNoData') || '暂无体重记录'}
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
              <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#3b82f6' }}>{T('bodyMoreWeightTrend') || '更多体重趋势'}</Text>
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
          ← 左右滑动查看更多 →
        </Text>
      </View>

      
      {/* ── 快捷操作 ── */}
      <View style={styles.quickActions}>
        {[
          { icon: <Scale size={20} color={TH.primary} />, label: T('bodyRecordWeight') || '记录体重', onPress: () => setShowWeightRecord(true) },
          { icon: <History size={20} color={TH.primary} />, label: T('exerciseHistory') || '锻炼记录', onPress: () => nav.navigate('ExerciseHistory' as never) },
          { icon: <Dumbbell size={20} color={TH.primary} />, label: T('bodyPlanManagement') || '计划管理', onPress: () => nav.navigate('PlanManagement' as never) },
          { icon: <Target size={20} color={TH.primary} />, label: T('bodyGoal') || '目标设定', onPress: () => setShowGoalEdit(true) },
        ].map((item, i) => (
          <TouchableOpacity key={i} onPress={item.onPress} style={[styles.quickActionItem, { backgroundColor: TH.card }]}>
            {item.icon}
            <Text style={{ fontSize: FONT_SMALL(), color: TH.text, marginTop: 4 }}>{item.label}</Text>
          </TouchableOpacity>
        ))}
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
            <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text }}>{T('bodyGoal') || '调身目标'}</Text>
          </View>
          <Text style={{ fontSize: FONT_SMALL(), color: '#8b5cf6' }}>{activeGoal ? T('bodyGoalEdit') : T('bodyGoalSet')}</Text>
        </View>
        {activeGoal ? (
          <View style={styles.goalContent}>
            <View style={styles.goalMetrics}>
              {activeGoal.targetWeight && (
                <View style={styles.goalMetricItem}>
                  <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: TH.text }}>{`${activeGoal.targetWeight}kg`}</Text>
                  <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T('bodyTargetWeight')}</Text>
                </View>
              )}
              {activeGoal.targetBodyFat && (
                <View style={styles.goalMetricItem}>
                  <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: TH.text }}>{`${activeGoal.targetBodyFat}%`}</Text>
                  <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T('bodyTargetBodyFat')}</Text>
                </View>
              )}
              {activeGoal.strategy && (
                <View style={styles.goalMetricItem}>
                  <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: '#8b5cf6' }}>
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
            <Text style={{ fontSize: FONT_BODY(), color: TH.sub }}>{T('bodyGoalNotSet') || '设定目标，开始调身之旅'}</Text>
          </View>
        )}
      </TouchableOpacity>

      
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
