import React, { useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useRootNavigation } from '../../navigation/hooks';
import { COLORS, getActivePlan, FONT_BODY, FONT_BUTTON, FONT_HERO } from '@egoless-do/core';
import { useTheme, useT } from '../../components/UI';
import SimpleHeader from '../../navigation/SimpleHeader';
import { ClipboardList } from 'lucide-react-native';
import PlanDetailContent from './PlanDetailContent';

export default function PlanScreen() {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const { checkAutoStatus, autoSyncPlanItems, plans } = useAppStore(useShallow(s => ({ checkAutoStatus: s.checkAutoStatus, autoSyncPlanItems: s.autoSyncPlanItems, plans: s.plans })));
  const nav = useRootNavigation();

  useEffect(() => {
    checkAutoStatus();
    autoSyncPlanItems();
  }, []);

  const activePlan = useMemo(() => getActivePlan(plans ?? []), [plans]);
  const handleNoop = useCallback(() => {}, []);

  // Empty state
  if (!activePlan) {
    return (
      <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: TH.bg }}>
        <SimpleHeader routeName="Plan" />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
          <ClipboardList size={48} color={TH.sub} style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 20, textAlign: 'center' }}>{T('planEmpty')}</Text>
          <TouchableOpacity
            onPress={() => nav.navigate('PlanCreate')}
            style={{ backgroundColor: P, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 }}
          >
            <Text style={{ color: '#fff', fontSize: FONT_BUTTON, fontWeight: '600' }}>{T('planCreateBtn')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: TH.bg }}>
      <SimpleHeader routeName="Plan" />
      <PlanDetailContent planId={activePlan.id} onClose={handleNoop} />
    </SafeAreaView>
  );
}
