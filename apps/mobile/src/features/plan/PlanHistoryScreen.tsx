import { PLAN_STATUS_COLORS, statusToI18nKey, getHistoryPlans, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE } from '@egoless-do/core';
import type { PlanStatus } from '@egoless-do/core';
import { ChevronLeft, ClipboardList, ChevronRight } from 'lucide-react-native';
import React, { useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, useTheme, useT } from '../../components/UI';
import { useRootNavigation } from '../../navigation/hooks';
import { useAppStore, useShallowStore } from '../../store/useAppStore';



export default function PlanHistoryScreen() {
  const TH = useTheme();
  const T = useT();
  const { plans } = useShallowStore(s => ({ plans: s.plans }));
  const nav = useRootNavigation();

  const historyPlans = useMemo(() => getHistoryPlans(plans ?? []), [plans]);

  const statusLabel = (s: PlanStatus) => T(statusToI18nKey(s));

  const keyExtractor = useCallback((item: typeof historyPlans[number]) => item.id, []);

  const renderPlanItem = useCallback(({ item: plan }: { item: typeof historyPlans[number] }) => (
    <TouchableOpacity
      onPress={() => nav.navigate('PlanDetail', { planId: plan.id })}
      activeOpacity={0.7}
    >
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <ClipboardList size={24} color={TH.text} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text, marginBottom: 4 }} numberOfLines={1}>
            {plan.name}
          </Text>
          <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>
            {plan.startDate} ~ {plan.endDate}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View style={{ backgroundColor: `${PLAN_STATUS_COLORS[plan.status]}20`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
            <Text style={{ fontSize: FONT_BADGE, fontWeight: '600', color: PLAN_STATUS_COLORS[plan.status] }}>{statusLabel(plan.status)}</Text>
          </View>
          <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{plan.progress}%</Text>
        </View>
        <ChevronRight size={16} color={TH.sub} />
      </Card>
    </TouchableOpacity>
  ), [nav, TH, statusLabel]);

  const renderEmpty = useCallback(() => (
    <Card style={{ alignItems: 'center', padding: 32 }}>
      <ClipboardList size={32} color={TH.sub} style={{ marginBottom: 8 }} />
      <Text style={{ fontSize: FONT_BODY, color: TH.sub }}>{T('planNoHistory')}</Text>
    </Card>
  ), [TH, T]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 10 }}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <ChevronLeft size={24} color={TH.text} />
        </TouchableOpacity>
        <Text style={{ fontWeight: '700', fontSize: FONT_TITLE, color: TH.text }}>{T('planHistory')}</Text>
      </View>

      <FlatList
        data={historyPlans}
        renderItem={renderPlanItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        removeClippedSubviews
        ListEmptyComponent={renderEmpty}
      />
    </SafeAreaView>
  );
}
