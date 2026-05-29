import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { THEMES, COLORS, getPlanItems, computePlanProgress, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE } from '@egoless-do/core';
import type { Plan, PlanItem, PlanItemCheckin, PlanStatus } from '@egoless-do/core';
import { Card, useTheme, useT } from '../../components/UI';
import { ChevronLeft } from 'lucide-react-native';

const STATUS_COLORS: Record<PlanStatus, string> = {
  not_started: COLORS.GRAY, in_progress: COLORS.GREEN, paused: COLORS.YELLOW,
  completed: COLORS.BLUE, cancelled: COLORS.RED, delayed: COLORS.ORANGE,
};

function StatusLabel({ status, T }: { status: PlanStatus; T: (k: string) => string }) {
  const key = `planStatus${status.charAt(0).toUpperCase() + status.slice(1).replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())}`;
  return (
    <View style={{ backgroundColor: `${STATUS_COLORS[status]}20`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
      <Text style={{ fontSize: FONT_BADGE, fontWeight: '600', color: STATUS_COLORS[status] }}>{T(key)}</Text>
    </View>
  );
}

function Heatmap({ checkins, items, plan, TH }: { checkins: PlanItemCheckin[]; items: PlanItem[]; plan: Plan; TH: any }) {
  const days: { date: string; rate: number }[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const end = new Date(plan.endDate > today ? today : plan.endDate);
  const start = new Date(end);
  start.setDate(start.getDate() - 29);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    const activeItems = items.filter(i => !i.deleted && dateStr >= i.startDate && dateStr <= i.endDate);
    if (activeItems.length === 0) {
      days.push({ date: dateStr, rate: -1 });
    } else {
      const done = activeItems.filter(i => checkins.some(c => c.planItemId === i.id && c.date === dateStr && c.done)).length;
      days.push({ date: dateStr, rate: done / activeItems.length });
    }
  }

  const color = (rate: number) => {
    if (rate < 0) return TH.border;
    if (rate >= 0.8) return COLORS.GREEN;
    if (rate >= 0.5) return COLORS.YELLOW;
    if (rate > 0) return COLORS.RED;
    return `${TH.border}80`;
  };

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
      {days.map((d, i) => (
        <View key={i} style={{ width: 16, height: 16, borderRadius: 3, backgroundColor: color(d.rate) }} />
      ))}
    </View>
  );
}

export default function PlanDetailScreen() {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const store = useAppStore();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const planId = route.params?.planId as string;
  const today = new Date().toISOString().slice(0, 10);

  const plan = useMemo(() => (store.plans ?? []).find(p => p.id === planId), [store.plans, planId]);
  const items = useMemo(() => getPlanItems(store.planItems ?? [], planId), [store.planItems, planId]);
  const checkins = store.planItemCheckins ?? [];
  const progress = plan ? computePlanProgress(plan, items) : 0;

  if (!plan) {
    return (
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 10 }}>
          <TouchableOpacity onPress={() => nav.goBack()}>
            <ChevronLeft size={24} color={TH.text} />
          </TouchableOpacity>
          <Text style={{ fontWeight: '700', fontSize: FONT_TITLE, color: TH.text }}>{T('planDetail')}</Text>
        </View>
        <Card style={{ alignItems: 'center', padding: 32 }}>
          <Text style={{ color: TH.sub }}>计划不存在</Text>
        </Card>
      </SafeAreaView>
    );
  }

  const totalDays = Math.round((new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / 86400000) + 1;
  const elapsed = Math.max(0, Math.round((new Date(today > plan.endDate ? plan.endDate : today).getTime() - new Date(plan.startDate).getTime()) / 86400000) + 1);

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 10 }}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <ChevronLeft size={24} color={TH.text} />
        </TouchableOpacity>
        <Text style={{ fontWeight: '700', fontSize: FONT_TITLE, color: TH.text, flex: 1 }} numberOfLines={1}>{plan.name}</Text>
        <StatusLabel status={plan.status} T={T} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Plan info */}
        <Card>
          {plan.slogan ? <Text style={{ fontSize: FONT_SUB, color: TH.sub, fontStyle: 'italic', marginBottom: 8 }}>&ldquo;{plan.slogan}&rdquo;</Text> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <View style={{ flex: 1, height: 6, backgroundColor: TH.border, borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: 6, width: `${progress}%`, backgroundColor: P, borderRadius: 3 }} />
            </View>
            <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.text }}>{progress}%</Text>
          </View>
          <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>
            {T('planStartDate')}: {plan.startDate} | {T('planEndDate')}: {plan.endDate} | {elapsed}/{totalDays} {T('planDays')}
          </Text>
        </Card>

        {/* Goal */}
        <Card>
          <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.sub, marginBottom: 4 }}>{T('planGoal')}</Text>
          <Text style={{ fontSize: FONT_SUB, color: TH.text }}>{plan.goal}</Text>
        </Card>

        {/* Items */}
        <Card>
          <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.text, marginBottom: 12 }}>{T('planItems')}</Text>
          {items.length === 0 ? (
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, textAlign: 'center', padding: 12 }}>{T('planNoItems')}</Text>
          ) : (
            items.map(item => {
              const itemCheckins = checkins.filter(c => c.planItemId === item.id && c.done);
              return (
                <View key={item.id} style={{
                  padding: 12, marginBottom: 8, borderRadius: 10,
                  backgroundColor: `${TH.card}80`, borderWidth: 1, borderColor: TH.border,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.text, flex: 1 }}>{item.name}</Text>
                    <StatusLabel status={item.status} T={T} />
                  </View>
                  {item.description ? <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 4 }}>{item.description}</Text> : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ flex: 1, height: 4, backgroundColor: TH.border, borderRadius: 2, overflow: 'hidden' }}>
                      <View style={{ height: 4, width: `${item.progress}%`, backgroundColor: P, borderRadius: 2 }} />
                    </View>
                    <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{item.progress}%</Text>
                    <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{T('planCheckinDays')}: {itemCheckins.length}</Text>
                  </View>
                </View>
              );
            })
          )}
        </Card>

        {/* Heatmap */}
        <Card>
          <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.text, marginBottom: 12 }}>{T('planHeatmap')}</Text>
          <Heatmap checkins={checkins} items={items} plan={plan} TH={TH} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
