import { FONT_TITLE, FONT_SUB, FONT_SMALL, ALL_SPORTS, type BodyPlanTask } from '@egoless-do/core';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, Animated } from 'react-native';

import { useTheme, useT } from '../../components/UI';
import SimpleHeader from '../../navigation/SimpleHeader';
import { useRootNavigation } from '../../navigation/hooks';
import { useAppStore, useShallowStore } from '../../store/useAppStore';

import BodyDashboard from './body/BodyDashboard';
import BodyFlow from './body/BodyFlow';
import { useTodayPlan } from './body/hooks/useTodayPlan';
import { useBodyFlowState } from './body/hooks/useBodyFlowState';

// ── Page state machine ──
type BodyPage = 'dashboard' | 'flow';

const FADE_DURATION = 350;

export default function BodyScreen() {
  const nav = useRootNavigation();
  const route = useRoute<RouteProp<{ Body: { sportResult?: { completed: boolean; durationSec: number; calories: number; reps: number; sportKey: string }; breathingResult?: { completed: boolean; durationMs: number } } }, 'Body'>>();
  const TH = useTheme();
  const T = useT();
  const { upsertBodyCheckin, bodyTrainingPlans, setBodyFlowState } = useShallowStore(s => ({
    upsertBodyCheckin: s.upsertBodyCheckin,
    bodyTrainingPlans: s.bodyTrainingPlans,
    setBodyFlowState: s.setBodyFlowState,
  }));
  const [page, setPage] = useState<BodyPage>('dashboard');
  const { todayPlan, weekday: todayWeekday } = useTodayPlan();
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
    if (!task || task.sportKey === 'rest') return null;
    return { planId: plan.id, planName: plan.name, task };
  }, [activePlanId, bodyTrainingPlans, todayWeekday]);

  // Tick that BodyFlow uses to detect return from Sport/Breathing (fallback)
  const [returnTick, setReturnTick] = useState(0);

  useFocusEffect(useCallback(() => {
    // 只在有结果参数时才 tick，避免无关心跳误触发
    const sr = route.params?.sportResult as { completed?: boolean; durationSec?: number } | undefined;
    if (sr?.completed) {
      setReturnTick(t => t + 1);
      setBodyFlowState({ practiceCompleted: true, practiceDurationSec: sr.durationSec ?? 0 });
      nav.setParams({ sportResult: undefined });
    }
    const br = route.params?.breathingResult as { completed?: boolean; durationMs?: number } | undefined;
    if (br?.completed) {
      setReturnTick(t => t + 1);
      setBodyFlowState({ breathingCompleted: true, breathingDurationMs: br.durationMs ?? 0 });
      nav.setParams({ breathingResult: undefined });
    }
  }, [setBodyFlowState, nav, route]));

  const handleGoToSport = useCallback((sportKey: string) => {
    const sport = ALL_SPORTS.find(s => s.key === sportKey || s.keyEn === sportKey);
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
              returnTick={returnTick}
              onGoToSport={handleGoToSport}
              onGoToBreathing={handleGoToBreathing}
              onExit={() => { setActivePlanId(null); transitionTo('dashboard'); }}
            />
          ) : (
            <BodyDashboard onFlowStart={() => transitionTo('flow')} onFlowStartWithPlan={startFlowWithPlan} />
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}
