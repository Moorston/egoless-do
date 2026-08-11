import { ALL_SPORTS, type ExerciseDef } from '@egoless-do/core';
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, ScrollView, Animated } from 'react-native';

import { useTheme, useT } from '../../components/UI';
import SimpleHeader from '../../navigation/SimpleHeader';
import { useRootNavigation } from '../../navigation/hooks';
import { useShallowStore } from '../../store/useAppStore';

import BodyDashboard from './body/BodyDashboard';
import BodyFlow from './body/BodyFlow';
import { useTodayPlan } from './body/hooks/useTodayPlan';

// ── Page state machine ──
type BodyPage = 'dashboard' | 'flow';

const FADE_DURATION = 350;

export default function BodyScreen() {
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();
  const { bodyTrainingPlans, upsertBodyCheckin } = useShallowStore(s => ({
    bodyTrainingPlans: s.bodyTrainingPlans,
    upsertBodyCheckin: s.upsertBodyCheckin,
  }));
  const [page, setPage] = useState<BodyPage>('dashboard');
  const { todayPlan, weekday: todayWeekday, todayOverride, todayExercises } = useTodayPlan();
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const transitioningRef = useRef(false);

  // Animated page transition
  const transitionTo = useCallback((target: BodyPage, extra?: () => void) => {
    if (transitioningRef.current) return;
    transitioningRef.current = true;
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: FADE_DURATION / 2,
      useNativeDriver: true,
    }).start(() => {
      setPage(target);
      extra?.();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: FADE_DURATION / 2,
        useNativeDriver: true,
      }).start(() => {
        transitioningRef.current = false;
      });
    });
  }, [fadeAnim]);

  // Find today's training plan task
  const todayTrainingTask = useMemo(() => {
    if (!activePlanId) return null;
    const plan = (bodyTrainingPlans ?? []).find(p => p.id === activePlanId && !p.deleted && p.status === 'active');
    if (!plan) return null;
    const task = plan.tasks.find(t => t.weekday === todayWeekday);
    if (!task) return null;
    return { planId: plan.id, planName: plan.name, task };
  }, [activePlanId, bodyTrainingPlans, todayWeekday]);

  const handleGoToSport = useCallback((sportKey: string, exercises?: ExerciseDef[]) => {
    const sport = ALL_SPORTS.find(s => s.key === sportKey || s.keyEn === sportKey);
    const navParams: Record<string, unknown> = {
      key: sportKey,
      icon: sport?.icon ?? '🏃',
      color: sport?.color ?? '#f59e0b',
    };

    // 组合模式：传递全部动作到 SportPage
    if (exercises && exercises.length > 1) {
      navParams.exercises = exercises;
      navParams.comboPlanId = activePlanId ?? undefined;
    } else if (activePlanId) {
      const plan = (bodyTrainingPlans ?? []).find(p => p.id === activePlanId && !p.deleted && p.status === 'active');
      const task = plan?.tasks.find(t => t.weekday === todayWeekday);
      if (task) {
        navParams.planId = activePlanId;
        navParams.planTaskWeekday = task.weekday;
      }
    }

    (nav.navigate as (route: string, params: Record<string, unknown>) => void)('Sport', navParams);
  }, [nav, activePlanId, todayWeekday, bodyTrainingPlans]);

  const handleGoToBreathing = useCallback(() => {
    nav.navigate('Breathing' as never);
  }, [nav]);

  const startFlowWithPlan = useCallback((planId: string) => {
    setActivePlanId(planId);
    transitionTo('flow');
  }, [transitionTo]);

  return (
    <View style={{ flex: 1, backgroundColor: TH.bg }}>
      <SimpleHeader routeName="Body" />
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {page === 'flow' ? (
            <BodyFlow
              TH={TH}
              T={T}
              store={{ upsertBodyCheckin }}
              todayPlan={todayPlan}
              trainingPlanTask={todayTrainingTask}
              todayOverride={todayOverride}
              todayExercises={todayExercises}
              onGoToSport={handleGoToSport}
              onGoToBreathing={handleGoToBreathing}
              onExit={() => { setActivePlanId(null); transitionTo('dashboard'); }}
            />
          ) : (
            <BodyDashboard
              onFlowStart={() => transitionTo('flow')}
              onFlowStartWithPlan={startFlowWithPlan}
              onGoToSport={handleGoToSport}
              onGoToBreathing={handleGoToBreathing}
            />
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}
