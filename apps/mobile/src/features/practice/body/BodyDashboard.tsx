import { ALL_SPORTS, dateStr, type AgeBracket, type BodyGoal, type BodyPlan, type BodyTrainingPlan, type ExerciseEntry } from '@egoless-do/core';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View } from 'react-native';

import { useT, useTheme } from '../../../components/UI';
import { useRootNavigation } from '../../../navigation/hooks';
import { useAppStore, useShallowStore } from '../../../store/useAppStore';

import BodyAwarenessCard from './BodyAwarenessCard';
import BodyProfileCard from './BodyProfileCard';
import BodyTodayPlanCard from './BodyTodayPlanCard';
import BodyTrainingPlanSection from './components/BodyTrainingPlanSection';
import BodyWeekPlanCard from './BodyWeekPlanCard';
import GoalCard from './GoalCard';
import WeightTrendChart from './WeightTrendChart';
import CollapsibleSection from './components/CollapsibleSection';
import CelebrationOverlay from './screens/CelebrationOverlay';
import { useTodayPlan } from './hooks/useTodayPlan';
import AssessmentModal from './modals/AssessmentModal';
import BodyCheckinModal from './modals/BodyCheckinModal';
import GoalEditModal from './modals/GoalEditModal';
import PlanEditModal from './modals/PlanEditModal';
import WeightRecordModal from './modals/WeightRecordModal';

interface DashboardProps {
  onFlowStart?: () => void;
  onFlowStartWithPlan?: (planId: string) => void;
}

export default function BodyDashboard({ onFlowStart, onFlowStartWithPlan }: DashboardProps) {
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();
  const { userProfile, bodyGoals, bodyPlans, bodyCheckins, exerciseLog, weightRecords, bodyTrainingPlans,
    updateUserProfile, updateBodyGoal, addBodyGoal, removeBodyPlan, addBodyPlan,
    upsertBodyCheckin, addWeight,
    updateBodyTrainingPlan } = useShallowStore(s => ({
    userProfile: s.userProfile,
    bodyGoals: s.bodyGoals,
    bodyPlans: s.bodyPlans,
    bodyCheckins: s.bodyCheckins,
    exerciseLog: s.exerciseLog,
    weightRecords: s.weightRecords,
    bodyTrainingPlans: s.bodyTrainingPlans,
    updateUserProfile: s.updateUserProfile,
    updateBodyGoal: s.updateBodyGoal,
    addBodyGoal: s.addBodyGoal,
    removeBodyPlan: s.removeBodyPlan,
    addBodyPlan: s.addBodyPlan,
    upsertBodyCheckin: s.upsertBodyCheckin,
    addWeight: s.addWeight,
    updateBodyTrainingPlan: s.updateBodyTrainingPlan,
  }));
  const profile = (userProfile ?? {}) as Record<string, unknown>;
  const { todayPlan, weekday: todayWeekday } = useTodayPlan();

  const [showAssessment, setShowAssessment] = useState(false);
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [showPlanEdit, setShowPlanEdit] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showWeightRecord, setShowWeightRecord] = useState(false);

  const activeGoal = useMemo(() => (bodyGoals ?? []).find((g: BodyGoal) => !g.deleted), [bodyGoals]);
  const activePlans = useMemo(() => (bodyPlans ?? []).filter((p: BodyPlan) => !p.deleted), [bodyPlans]);
  const activeTrainingPlan = useMemo(() => (bodyTrainingPlans ?? []).find((p: BodyTrainingPlan) => !p.deleted && p.status === 'active'), [bodyTrainingPlans]);

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

  // Detect newly completed plans
  const recentlyCompletedPlans = useMemo(() =>
    (bodyTrainingPlans ?? []).filter((p: BodyTrainingPlan) =>
      !p.deleted && p.status === 'completed' && p.endDate >= dateStr(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    ),
  [bodyTrainingPlans]);

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
    const totalTasks = plan.tasks.filter(t => t.sportKey && t.sportKey !== 'rest').length;
    const weeks = Math.max(1, Math.round((new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / 604800000));
    const totalDays = weeks * 7;

    return {
      planName: plan.name,
      totalDays,
      completedDays,
      totalDurationMin: totalMin,
      totalCalories: totalCal,
    };
  }, [recentlyCompletedPlans, exerciseLog]);

  // Show celebration once when a completed plan is detected
  useEffect(() => {
    if (celebrationData && recentlyCompletedPlans[0]?.id !== celebratedPlanId) {
      setCelebratedPlanId(recentlyCompletedPlans[0].id);
      setShowCelebration(true);
    }
  }, [celebrationData, recentlyCompletedPlans, celebratedPlanId]);

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

  const handleSaveAssessment = useCallback((text: string, tags: string[]) => {
    updateUserProfile({ selfAssessment: text, bodyTags: tags });
  }, [updateUserProfile]);

  const handleSaveGoal = useCallback((data: Partial<BodyGoal>) => {
    if (activeGoal) {
      updateBodyGoal(activeGoal.id, data);
    } else {
      addBodyGoal(data);
    }
  }, [activeGoal, updateBodyGoal, addBodyGoal]);

  const handleSavePlans = useCallback((newPlans: BodyPlan[]) => {
    for (const p of activePlans) {
      removeBodyPlan(p.id);
    }
    for (const p of newPlans) {
      addBodyPlan({ weekday: p.weekday, part: p.part, sportKey: p.sportKey, note: p.note, goalId: activeGoal?.id });
    }
  }, [activePlans, activeGoal, removeBodyPlan, addBodyPlan]);

  const handlePressSport = useCallback((sportKey: string) => {
    const sport = ALL_SPORTS.find(s => s.key === sportKey || s.keyEn === sportKey);
    (nav as { navigate: (name: string, params?: Record<string, unknown>) => void }).navigate('Sport', {
      key: sportKey,
      icon: sport?.icon ?? '🏃',
      color: sport?.color ?? '#f59e0b',
    });
  }, [nav]);

  const handleSaveCheckin = useCallback((data: { date: string; energy: number; pain: number; comfort: number; sleep: number; tags: string[]; note?: string }) => {
    upsertBodyCheckin(data);
  }, [upsertBodyCheckin]);

  const handleSaveWeight = useCallback((data: { date: string; weight: number; bodyFat?: number }) => {
    addWeight(data);
  }, [addWeight]);

  const handlePickAgeBracket = useCallback((bracket: AgeBracket) => {
    updateUserProfile({ ageBracket: bracket });
  }, [updateUserProfile]);

  // Compute collapsible badges
  const trainingBadge = planProgress
    ? `${planProgress.weekComplete}/${planProgress.weekTotal}`
    : activeTrainingPlan ? '0/0' : undefined;

  return (
    <View>
      {/* ── Section 1: 今日训练 ── */}
      <CollapsibleSection title={T('bodyToday')} icon="📋" color="#f59e0b" TH={TH} defaultExpanded>
        <BodyTodayPlanCard
          TH={TH} T={T}
          todayPlan={todayPlan}
          todayWeekday={todayWeekday}
          onStart={() => onFlowStart?.()}
        />
      </CollapsibleSection>

      {/* ── Section 2: 身体档案 ── */}
      <CollapsibleSection title={T('bodyProfile')} icon="📋" color="#d97706" TH={TH} defaultExpanded>
        <BodyProfileCard
          TH={TH} T={T}
          profile={profile}
          onEditAssessment={() => setShowAssessment(true)}
          onRecordWeight={() => setShowWeightRecord(true)}
          onPickAgeBracket={handlePickAgeBracket}
        />
        <GoalCard TH={TH} T={T} goal={activeGoal} profile={profile} onEdit={() => setShowGoalEdit(true)} />
      </CollapsibleSection>

      {/* ── Section 3: 训练计划 ── */}
      <CollapsibleSection title={T('bodyPlan')} icon="💪" color="#8b5cf6" TH={TH} defaultExpanded badge={trainingBadge}>
        <BodyTrainingPlanSection
          TH={TH} T={T}
          plan={activeTrainingPlan}
          progress={planProgress}
          onEdit={() => nav.navigate('BodyPlanEditor' as never, { planId: activeTrainingPlan?.id } as never)}
          onStart={(planId) => onFlowStartWithPlan?.(planId)}
        />
        <BodyWeekPlanCard
          TH={TH} T={T}
          plans={activePlans}
          exerciseLog={exerciseLog ?? []}
          onEdit={() => setShowPlanEdit(true)}
          onPressSport={handlePressSport}
        />
      </CollapsibleSection>

      {/* ── Section 4: 数据趋势 ── */}
      <CollapsibleSection title={T('bodyWeightTrend')} icon="📊" color="#10b981" TH={TH} defaultExpanded={false}>
        <BodyAwarenessCard TH={TH} T={T} checkins={bodyCheckins ?? []} onRecordPress={() => setShowCheckin(true)} />
        <WeightTrendChart TH={TH} T={T} weightRecords={weightRecords ?? []} />
      </CollapsibleSection>

      <AssessmentModal visible={showAssessment} TH={TH} T={T} profile={profile} onClose={() => setShowAssessment(false)} onSave={handleSaveAssessment} />
      <GoalEditModal visible={showGoalEdit} TH={TH} T={T} goal={activeGoal} profile={profile} onClose={() => setShowGoalEdit(false)} onSave={handleSaveGoal} />
      <PlanEditModal visible={showPlanEdit} TH={TH} T={T} plans={activePlans} onClose={() => setShowPlanEdit(false)} onSave={handleSavePlans} />
      <BodyCheckinModal visible={showCheckin} TH={TH} T={T} todayPlan={todayPlan} onClose={() => setShowCheckin(false)} onSave={handleSaveCheckin} />
      <WeightRecordModal visible={showWeightRecord} TH={TH} T={T} currentWeight={profile.weight as number | undefined} currentBodyFat={profile.bodyFat as number | undefined} onClose={() => setShowWeightRecord(false)} onSave={handleSaveWeight} />

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
