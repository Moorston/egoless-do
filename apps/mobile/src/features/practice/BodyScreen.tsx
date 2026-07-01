import React, { useState, useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { useRootNavigation } from '../../navigation/hooks';
import { useTheme, useT } from '../../components/UI';
import { useAppStore } from '../../store/useAppStore';
import type { BodyPlan } from '@egoless-do/core';
import BodyDashboard from './body/BodyDashboard';
import BodyFlow from './body/BodyFlow';
import SimpleHeader from '../../navigation/SimpleHeader';

// ── Page state machine ──
type BodyPage = 'dashboard' | 'flow';

// ── Main Page ──
export default function BodyScreen() {
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();
  const store = useAppStore();
  const [page, setPage] = useState<BodyPage>('dashboard');

  // Get today's plan
  const todayPlan = useMemo(() => {
    const today = new Date().getDay(); // 0=Sun, 1=Mon, ...
    const weekday = today === 0 ? 7 : today; // Convert to 1-7 (Mon-Sun)
    const plans = (store.bodyPlans ?? []).filter((p: BodyPlan) => !p.deleted);
    return plans.find((p: BodyPlan) => p.weekday === weekday);
  }, [store.bodyPlans]);

  if (page === 'flow') {
    return (
      <View style={{ flex: 1, backgroundColor: TH.bg }}>
        <SimpleHeader routeName="Body" />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <BodyFlow
            TH={TH}
            T={T}
            nav={nav}
            store={store}
            todayPlan={todayPlan}
            onExit={() => setPage('dashboard')}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: TH.bg }}>
      <SimpleHeader routeName="Body" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <BodyDashboard onFlowStart={() => setPage('flow')} />
      </ScrollView>
    </View>
  );
}
