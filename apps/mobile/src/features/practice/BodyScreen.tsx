import { FONT_TITLE, FONT_SUB, FONT_SMALL, ALL_SPORTS, type BodyPlanTask } from '@egoless-do/core';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView } from 'react-native';

import { useTheme, useT } from '../../components/UI';
import SimpleHeader from '../../navigation/SimpleHeader';
import { useRootNavigation } from '../../navigation/hooks';
import { useAppStore, useShallowStore } from '../../store/useAppStore';

import BodyDashboard from './body/BodyDashboard';
import { useTodayPlan } from './body/hooks/useTodayPlan';
import { useBodyFlowState } from './body/hooks/useBodyFlowState';

// ── Page ──
export default function BodyScreen() {
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();
  const { bodyTrainingPlans, setBodyFlowState } = useShallowStore(s => ({
    bodyTrainingPlans: s.bodyTrainingPlans,
    setBodyFlowState: s.setBodyFlowState,
  }));
  const { todayPlan, weekday: todayWeekday, todayOverride, todayExercises, activeTrainingPlan } = useTodayPlan();
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const { flowState } = useBodyFlowState();

  // 检测组合模式
  const isComboMode = !!todayExercises && todayExercises.length > 1;

  const handleGoToSport = useCallback((sportKey: string) => {
    const sport = ALL_SPORTS.find(s => s.key === sportKey || s.keyEn === sportKey);
    const navParams: Record<string, unknown> = {
      key: sportKey,
      icon: sport?.icon ?? '🏃',
      color: sport?.color ?? '#f59e0b',
    };

    // 组合模式：传递全部动作到 SportPage
    if (isComboMode && todayExercises) {
      navParams.exercises = todayExercises;
      navParams.comboPlanId = activePlanId ?? undefined;
    } else if (activePlanId) {
      const plan = (bodyTrainingPlans ?? []).find(p => p.id === activePlanId && !p.deleted && p.status === 'active');
      const task = plan?.tasks.find(t => t.weekday === todayWeekday);
      if (task) {
        navParams.planId = activePlanId;
        navParams.planTaskWeekday = task.weekday;
      }
    }

    nav.navigate('Sport' as never, navParams as never);
  }, [nav, activePlanId, todayExercises, todayWeekday, bodyTrainingPlans, isComboMode]);

  const handleGoToBreathing = useCallback(() => {
    nav.navigate('Breathing' as never);
  }, [nav]);

  const startFlowWithPlan = useCallback((planId: string) => {
    setActivePlanId(planId);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: TH.bg }}>
      <SimpleHeader routeName="Body" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <BodyDashboard
          onFlowStart={() => {}}
          onFlowStartWithPlan={startFlowWithPlan}
          onGoToSport={handleGoToSport}
          onGoToBreathing={handleGoToBreathing}
        />
      </ScrollView>
    </View>
  );
}
