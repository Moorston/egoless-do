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
  const route = useRoute<RouteProp<{ Body: { sportResult?: { completed: boolean; durationSec: number; calories: number; reps: number; sportKey: string; isCombo?: boolean; exercises?: { sportKey: string; icon: string; durationSec: number; calories: number; reps: number; timestamp: number }[] }; breathingResult?: { completed: boolean; durationMs: number } } }, 'Body'>>();
  const TH = useTheme();
  const T = useT();
  const { upsertBodyCheckin, bodyTrainingPlans, setBodyFlowState } = useShallowStore(s => ({
    upsertBodyCheckin: s.upsertBodyCheckin,
    bodyTrainingPlans: s.bodyTrainingPlans,
    setBodyFlowState: s.setBodyFlowState,
  }));
  const [page, setPage] = useState<BodyPage>('dashboard');
  const { todayPlan, weekday: todayWeekday, todayOverride, todayExercises, activeTrainingPlan } = useTodayPlan();
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const transitioningRef = useRef(false);
  const { flowState } = useBodyFlowState();

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

  // 检测组合模式
  const isComboMode = !!todayExercises && todayExercises.length > 1;

  // 当 flowState 显示运动完成时，自动进入 breathing 步骤
  useEffect(() => {
    if (flowState?.exerciseCompleted && page === 'flow') {
      // 运动已完成，BodyDashboard Banner 会显示下一步
    }
  }, [flowState?.exerciseCompleted, page]);

  useFocusEffect(useCallback(() => {
    // 不再依赖 returnTick，直接读取 flowState
    if (flowState?.breathingCompleted) {
      // 调息已完成
    }
  }, [flowState, nav, route]));

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
    } else if (activePlanId && todayTrainingTask) {
      // 单运动模式
      navParams.planId = activePlanId;
      navParams.planTaskWeekday = todayTrainingTask.task.weekday;
    }

    nav.navigate('Sport' as never, navParams as never);
  }, [nav, activePlanId, todayTrainingTask, todayExercises, isComboMode, activeTrainingPlan]);

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
