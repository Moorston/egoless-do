import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/types';
import { useAppStore, useShallowStore } from '../../store/useAppStore';
import { useRootNavigation } from '../../navigation/hooks';
import { COLORS, isPlanDelayed, statusToI18nKey, PLAN_STATUS_COLORS, FONT_TITLE, FONT_BADGE, dateStr } from '@egoless-do/core';
import { useTheme, useT } from '../../components/UI';
import { ChevronLeft } from 'lucide-react-native';
import PlanDetailContent from './PlanDetailContent';

export default function PlanDetailScreen() {
  const TH = useTheme();
  const T = useT();
  const { plans } = useShallowStore(s => ({ plans: s.plans }));
  const nav = useRootNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'PlanDetail'>>();
  const planId = route.params?.planId as string;
  const addReflectionId = route.params?.addReflectionId as string | undefined;
  const today = dateStr();

  const plan = useMemo(() => (plans ?? []).find(p => !p.deleted && p.id === planId), [plans, planId]);
  const delayed = plan ? isPlanDelayed(plan, today) : false;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 10 }}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <ChevronLeft size={24} color={TH.text} />
        </TouchableOpacity>
        <Text style={{ fontWeight: '700', fontSize: FONT_TITLE, color: TH.text, flex: 1 }} numberOfLines={1}>
          {plan?.name ?? T('planDetail')}
        </Text>
        {delayed && (
          <View style={{ backgroundColor: `${COLORS.ORANGE}20`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
            <Text style={{ fontSize: FONT_BADGE, fontWeight: '600', color: COLORS.ORANGE }}>{T('planStatusDelayed')}</Text>
          </View>
        )}
        {plan && (() => {
          const statusColor = PLAN_STATUS_COLORS[plan.status] ?? COLORS.GREEN;
          return (
            <View style={{ backgroundColor: `${statusColor}20`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ fontSize: FONT_BADGE, fontWeight: '600', color: statusColor }}>
                {T(statusToI18nKey(plan.status))}
              </Text>
            </View>
          );
        })()}
      </View>

      <PlanDetailContent planId={planId} onClose={() => nav.goBack()} addReflectionId={addReflectionId} />
    </SafeAreaView>
  );
}
