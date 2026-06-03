import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { useRootNavigation } from '../../navigation/hooks';
import { THEMES, COLORS, isPlanDelayed, FONT_TITLE, FONT_BADGE } from '@egoless-do/core';
import { useTheme, useT } from '../../components/UI';
import { ChevronLeft } from 'lucide-react-native';
import PlanDetailContent from './PlanDetailContent';

export default function PlanDetailScreen() {
  const TH = useTheme();
  const T = useT();
  const store = useAppStore();
  const nav = useRootNavigation();
  const route = useRoute<any>();
  const planId = route.params?.planId as string;
  const today = new Date().toISOString().slice(0, 10);

  const plan = useMemo(() => (store.plans ?? []).find(p => p.id === planId), [store.plans, planId]);
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
        {plan && (
          <View style={{ backgroundColor: `${COLORS.GREEN}20`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
            <Text style={{ fontSize: FONT_BADGE, fontWeight: '600', color: COLORS.GREEN }}>
              {T(`planStatus${plan.status.charAt(0).toUpperCase() + plan.status.slice(1).replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())}`)}
            </Text>
          </View>
        )}
      </View>

      <PlanDetailContent planId={planId} onClose={() => nav.goBack()} />
    </SafeAreaView>
  );
}
