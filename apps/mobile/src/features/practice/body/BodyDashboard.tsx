import React, { useState, useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { useAppStore, useShallowStore } from '../../../store/useAppStore';
import { useT, useTheme } from '../../../components/UI';
import { useRootNavigation } from '../../../navigation/hooks';
import { ALL_SPORTS, type AgeBracket, type BodyGoal, type BodyPlan } from '@egoless-do/core';
import BodyProfileCard from './BodyProfileCard';
import GoalCard from './GoalCard';
import BodyWeekPlanCard from './BodyWeekPlanCard';
import BodyAwarenessCard from './BodyAwarenessCard';
import WeightTrendChart from './WeightTrendChart';
import AssessmentModal from './modals/AssessmentModal';
import GoalEditModal from './modals/GoalEditModal';
import PlanEditModal from './modals/PlanEditModal';
import BodyCheckinModal from './modals/BodyCheckinModal';
import WeightRecordModal from './modals/WeightRecordModal';
import { useTodayPlan } from './hooks/useTodayPlan';

interface DashboardProps {
  onFlowStart?: () => void;
}

export default function BodyDashboard({ onFlowStart }: DashboardProps) {
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();
  const { userProfile, bodyGoals, bodyPlans, bodyCheckins, exerciseLog, weightRecords,
    updateUserProfile, updateBodyGoal, addBodyGoal, removeBodyPlan, addBodyPlan,
    upsertBodyCheckin, addWeight } = useShallowStore(s => ({
    userProfile: s.userProfile,
    bodyGoals: s.bodyGoals,
    bodyPlans: s.bodyPlans,
    bodyCheckins: s.bodyCheckins,
    exerciseLog: s.exerciseLog,
    weightRecords: s.weightRecords,
    updateUserProfile: s.updateUserProfile,
    updateBodyGoal: s.updateBodyGoal,
    addBodyGoal: s.addBodyGoal,
    removeBodyPlan: s.removeBodyPlan,
    addBodyPlan: s.addBodyPlan,
    upsertBodyCheckin: s.upsertBodyCheckin,
    addWeight: s.addWeight,
  }));
  const profile = (userProfile ?? {}) as Record<string, unknown>;
  const { todayPlan } = useTodayPlan();

  const [showAssessment, setShowAssessment] = useState(false);
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [showPlanEdit, setShowPlanEdit] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showWeightRecord, setShowWeightRecord] = useState(false);

  const activeGoal = useMemo(() => (bodyGoals ?? []).find((g: BodyGoal) => !g.deleted), [bodyGoals]);
  const activePlans = useMemo(() => (bodyPlans ?? []).filter((p: BodyPlan) => !p.deleted), [bodyPlans]);

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
    nav.navigate('Sport' as any, {
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

  return (
    <View>
      <BodyProfileCard
        TH={TH} T={T}
        profile={profile}
        onEditAssessment={() => setShowAssessment(true)}
        onRecordWeight={() => setShowWeightRecord(true)}
        onPickAgeBracket={handlePickAgeBracket}
      />

      <BodyAwarenessCard TH={TH} T={T} checkins={bodyCheckins ?? []} onRecordPress={() => setShowCheckin(true)} />
      <GoalCard TH={TH} T={T} goal={activeGoal} profile={profile} onEdit={() => setShowGoalEdit(true)} />
      <BodyWeekPlanCard
        TH={TH} T={T}
        plans={activePlans}
        exerciseLog={exerciseLog ?? []}
        onEdit={() => setShowPlanEdit(true)}
        onPressSport={handlePressSport}
      />
      <WeightTrendChart TH={TH} T={T} weightRecords={weightRecords ?? []} />

      <AssessmentModal visible={showAssessment} TH={TH} T={T} profile={profile} onClose={() => setShowAssessment(false)} onSave={handleSaveAssessment} />
      <GoalEditModal visible={showGoalEdit} TH={TH} T={T} goal={activeGoal} profile={profile} onClose={() => setShowGoalEdit(false)} onSave={handleSaveGoal} />
      <PlanEditModal visible={showPlanEdit} TH={TH} T={T} plans={activePlans} onClose={() => setShowPlanEdit(false)} onSave={handleSavePlans} />
      <BodyCheckinModal visible={showCheckin} TH={TH} T={T} todayPlan={todayPlan} onClose={() => setShowCheckin(false)} onSave={handleSaveCheckin} />
      <WeightRecordModal visible={showWeightRecord} TH={TH} T={T} currentWeight={profile.weight as number | undefined} currentBodyFat={profile.bodyFat as number | undefined} onClose={() => setShowWeightRecord(false)} onSave={handleSaveWeight} />
    </View>
  );
}
