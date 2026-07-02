import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, useT } from '../../components/UI';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/useAppStore';
import { useRootNavigation } from '../../navigation/hooks';
import { FONT_TITLE, ALL_SPORTS } from '@egoless-do/core';
import BodyDashboard from './body/BodyDashboard';
import BodyFlow from './body/BodyFlow';
import BodyTodayPlanCard from './body/BodyTodayPlanCard';
import SimpleHeader from '../../navigation/SimpleHeader';
import { useTodayPlan } from './body/hooks/useTodayPlan';

// ── Page state machine ──
type BodyPage = 'dashboard' | 'flow';

// ── Main Page ──
export default function BodyScreen() {
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();
  const { upsertBodyCheckin } = useAppStore(useShallow(s => ({
    upsertBodyCheckin: s.upsertBodyCheckin,
  })));
  const [page, setPage] = useState<BodyPage>('dashboard');
  const { todayPlan, weekday: todayWeekday } = useTodayPlan();

  // Tick that BodyFlow uses to detect return from Sport/Breathing
  const [returnTick, setReturnTick] = useState(0);

  useFocusEffect(useCallback(() => {
    setReturnTick(t => t + 1);
  }, []));

  const handleGoToSport = useCallback((sportKey: string) => {
    const sport = ALL_SPORTS.find(s => s.key === sportKey || s.keyEn === sportKey);
    nav.navigate('Sport', {
      key: sportKey,
      icon: sport?.icon ?? '🏃',
      color: sport?.color ?? '#f59e0b',
    });
  }, [nav]);

  const handleGoToBreathing = useCallback(() => {
    nav.navigate('Breathing' as never);
  }, [nav]);

  if (page === 'flow') {
    return (
      <View style={{ flex: 1, backgroundColor: TH.bg }}>
        <SimpleHeader routeName="Body" />
        <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: TH.text, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>{T('bodySubtitle')}</Text>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <BodyFlow
            TH={TH}
            T={T}
            store={{ upsertBodyCheckin }}
            todayPlan={todayPlan}
            returnTick={returnTick}
            onGoToSport={handleGoToSport}
            onGoToBreathing={handleGoToBreathing}
            onExit={() => setPage('dashboard')}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: TH.bg }}>
      <SimpleHeader routeName="Body" />
      <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: TH.text, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>{T('bodySubtitle')}</Text>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Today's plan — most important info for the user */}
        <BodyTodayPlanCard
          TH={TH}
          T={T}
          todayPlan={todayPlan}
          todayWeekday={todayWeekday}
          onStart={() => setPage('flow')}
        />
        <BodyDashboard onFlowStart={() => setPage('flow')} />
      </ScrollView>
    </View>
  );
}
