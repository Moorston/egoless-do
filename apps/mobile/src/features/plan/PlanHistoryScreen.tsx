import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { THEMES, COLORS, getHistoryPlans, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE } from '@egoless-do/core';
import type { PlanStatus } from '@egoless-do/core';
import { Card, useTheme, useT } from '../../components/UI';
import { ChevronLeft, ClipboardList, ChevronRight } from 'lucide-react-native';

const STATUS_COLORS: Record<PlanStatus, string> = {
  not_started: COLORS.GRAY, in_progress: COLORS.GREEN, paused: COLORS.YELLOW,
  completed: COLORS.BLUE, cancelled: COLORS.RED, delayed: COLORS.ORANGE,
};

export default function PlanHistoryScreen() {
  const TH = useTheme();
  const T = useT();
  const store = useAppStore();
  const nav = useNavigation<any>();

  const historyPlans = useMemo(() => getHistoryPlans(store.plans ?? []), [store.plans]);

  const statusLabel = (s: PlanStatus) => {
    const key = `planStatus${s.charAt(0).toUpperCase() + s.slice(1).replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())}`;
    return T(key);
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 10 }}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <ChevronLeft size={24} color={TH.text} />
        </TouchableOpacity>
        <Text style={{ fontWeight: '700', fontSize: FONT_TITLE, color: TH.text }}>{T('planHistory')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {historyPlans.length === 0 ? (
          <Card style={{ alignItems: 'center', padding: 32 }}>
            <ClipboardList size={32} color={TH.sub} style={{ marginBottom: 8 }} />
            <Text style={{ fontSize: FONT_BODY, color: TH.sub }}>暂无历史计划</Text>
          </Card>
        ) : (
          historyPlans.map(plan => (
            <TouchableOpacity
              key={plan.id}
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
                  <View style={{ backgroundColor: `${STATUS_COLORS[plan.status]}20`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: FONT_BADGE, fontWeight: '600', color: STATUS_COLORS[plan.status] }}>{statusLabel(plan.status)}</Text>
                  </View>
                  <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{plan.progress}%</Text>
                </View>
                <ChevronRight size={16} color={TH.sub} />
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
