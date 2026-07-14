import { FONT_TITLE, ALL_SPORTS, type BodyPlanTask } from '@egoless-do/core';
import { useFocusEffect } from '@react-navigation/native';
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';

import { useTheme, useT } from '../../components/UI';
import SimpleHeader from '../../navigation/SimpleHeader';
import { useRootNavigation } from '../../navigation/hooks';
import { useAppStore, useShallowStore } from '../../store/useAppStore';

import BodyDashboard from './body/BodyDashboard';
import BodyFlow from './body/BodyFlow';
import BodyTodayPlanCard from './body/BodyTodayPlanCard';
import { useTodayPlan } from './body/hooks/useTodayPlan';

// ── Page state machine ──
type BodyPage = 'dashboard' | 'flow';

export default function BodyScreen() {
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();
  const { upsertBodyCheckin, bodyTrainingPlans } = useShallowStore(s => ({
    upsertBodyCheckin: s.upsertBodyCheckin,
    bodyTrainingPlans: s.bodyTrainingPlans,
  }));
  const [page, setPage] = useState<BodyPage>('dashboard');
  const { todayPlan, weekday: todayWeekday } = useTodayPlan();
  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  // Find today's training plan task
  const todayTrainingTask = useMemo(() => {
    if (!activePlanId) return null;
    const plan = (bodyTrainingPlans ?? []).find(p => p.id === activePlanId && !p.deleted && p.status === 'active');
    if (!plan) return null;
    const task = plan.tasks.find(t => t.weekday === todayWeekday);
    if (!task || task.sportKey === 'rest') return null;
    return { planId: plan.id, planName: plan.name, task };
  }, [activePlanId, bodyTrainingPlans, todayWeekday]);

  // Tick that BodyFlow uses to detect return from Sport/Breathing
  const [returnTick, setReturnTick] = useState(0);

  useFocusEffect(useCallback(() => {
    setReturnTick(t => t + 1);
  }, []));

  const handleGoToSport = useCallback((sportKey: string) => {
    const sport = ALL_SPORTS.find(s => s.key === sportKey || s.keyEn === sportKey);
    // Pass plan info to SportPage if we're in a training plan flow
    const navParams: Record<string, unknown> = {
      key: sportKey,
      icon: sport?.icon ?? '🏃',
      color: sport?.color ?? '#f59e0b',
    };
    if (activePlanId && todayTrainingTask) {
      navParams.planId = activePlanId;
      navParams.planTaskWeekday = todayTrainingTask.task.weekday;
    }
    nav.navigate('Sport' as never, navParams as never);
  }, [nav, activePlanId, todayTrainingTask]);

  const handleGoToBreathing = useCallback(() => {
    nav.navigate('Breathing' as never);
  }, [nav]);

  const startFlowWithPlan = useCallback((planId: string) => {
    setActivePlanId(planId);
    setPage('flow');
  }, []);

  if (page === 'flow') {
    return (
      <View style={{ flex: 1, backgroundColor: TH.bg }}>
        <SimpleHeader routeName="Body" />
        <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: TH.text, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>{T('bodySubtitle')}</Text>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <BodyFlow
            TH={TH}
            T={T}
            store={{ upsertBodyCheckin }}
            todayPlan={todayPlan}
            trainingPlanTask={todayTrainingTask}
            returnTick={returnTick}
            onGoToSport={handleGoToSport}
            onGoToBreathing={handleGoToBreathing}
            onExit={() => { setActivePlanId(null); setPage('dashboard'); }}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: TH.bg }}>
      <SimpleHeader routeName="Body" />
      <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: TH.text, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>{T('bodySubtitle')}</Text>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Today's plan — most important info for the user */}
        <BodyTodayPlanCard
          TH={TH}
          T={T}
          todayPlan={todayPlan}
          todayWeekday={todayWeekday}
          onStart={() => setPage('flow')}
        />
        <BodyDashboard onFlowStart={() => setPage('flow')} onFlowStartWithPlan={startFlowWithPlan} />
      </ScrollView>
    </View>
  );
}
