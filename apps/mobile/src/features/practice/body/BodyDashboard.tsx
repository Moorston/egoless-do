import React, { useState, useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { useAppStore } from '../../../store/useAppStore';
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
  const store = useAppStore();
  const profile = store.userProfile ?? {};
  const { todayPlan } = useTodayPlan();

  const [showAssessment, setShowAssessment] = useState(false);
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [showPlanEdit, setShowPlanEdit] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showWeightRecord, setShowWeightRecord] = useState(false);

  const activeGoal = useMemo(() => (store.bodyGoals ?? []).find((g: BodyGoal) => !g.deleted), [store.bodyGoals]);
  const activePlans = useMemo(() => (store.bodyPlans ?? []).filter((p: BodyPlan) => !p.deleted), [store.bodyPlans]);

  const handleSaveAssessment = useCallback((text: string, tags: string[]) => {
    store.updateUserProfile({ selfAssessment: text, bodyTags: tags });
  }, [store]);

  const handleSaveGoal = useCallback((data: Partial<BodyGoal>) => {
    if (activeGoal) {
      store.updateBodyGoal(activeGoal.id, data);
    } else {
      store.addBodyGoal(data);
    }
  }, [activeGoal, store]);

  const handleSavePlans = useCallback((newPlans: BodyPlan[]) => {
    for (const p of activePlans) {
      store.removeBodyPlan(p.id);
    }
    for (const p of newPlans) {
      store.addBodyPlan({ weekday: p.weekday, part: p.part, sportKey: p.sportKey, note: p.note, goalId: activeGoal?.id });
    }
  }, [activePlans, activeGoal, store]);

  const handlePressSport = useCallback((sportKey: string) => {
    const sport = ALL_SPORTS.find(s => s.key === sportKey || s.keyEn === sportKey);
    (nav as any).navigate('Sport', {
      key: sportKey,
      icon: sport?.icon ?? '🏃',
      color: sport?.color ?? '#f59e0b',
    });
  }, [nav]);

  const handleSaveCheckin = useCallback((data: { date: string; energy: number; pain: number; comfort: number; sleep: number; tags: string[]; note?: string }) => {
    store.upsertBodyCheckin(data);
  }, [store]);

  const handleSaveWeight = useCallback((data: { date: string; weight: number; bodyFat?: number }) => {
    store.addWeight(data);
  }, [store]);

  const handlePickAgeBracket = useCallback((bracket: AgeBracket) => {
    store.updateUserProfile({ ageBracket: bracket });
  }, [store]);

  return (
    <View>
      <BodyProfileCard
        TH={TH} T={T}
        profile={profile}
        onEditAssessment={() => setShowAssessment(true)}
        onRecordWeight={() => setShowWeightRecord(true)}
        onPickAgeBracket={handlePickAgeBracket}
      />

      <BodyAwarenessCard TH={TH} T={T} checkins={store.bodyCheckins ?? []} onRecordPress={() => setShowCheckin(true)} />
      <GoalCard TH={TH} T={T} goal={activeGoal} profile={profile} onEdit={() => setShowGoalEdit(true)} />
      <BodyWeekPlanCard
        TH={TH} T={T}
        plans={activePlans}
        exerciseLog={store.exerciseLog ?? []}
        onEdit={() => setShowPlanEdit(true)}
        onPressSport={handlePressSport}
      />
      <WeightTrendChart TH={TH} T={T} weightRecords={store.weightRecords ?? []} />

      <AssessmentModal visible={showAssessment} TH={TH} T={T} profile={profile} onClose={() => setShowAssessment(false)} onSave={handleSaveAssessment} />
      <GoalEditModal visible={showGoalEdit} TH={TH} T={T} goal={activeGoal} profile={profile} onClose={() => setShowGoalEdit(false)} onSave={handleSaveGoal} />
      <PlanEditModal visible={showPlanEdit} TH={TH} T={T} plans={activePlans} onClose={() => setShowPlanEdit(false)} onSave={handleSavePlans} />
      <BodyCheckinModal visible={showCheckin} TH={TH} T={T} todayPlan={todayPlan} onClose={() => setShowCheckin(false)} onSave={handleSaveCheckin} />
      <WeightRecordModal visible={showWeightRecord} TH={TH} T={T} currentWeight={profile.weight} currentBodyFat={profile.bodyFat} onClose={() => setShowWeightRecord(false)} onSave={handleSaveWeight} />
    </View>
  );
}
