import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { THEMES, COLORS, getActivePlan, getPlanItems, getTodayItems, computePlanProgress, canEditPlan, canDeletePlan, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_BADGE, FONT_LABEL, FONT_EMPTY } from '@egoless-do/core';
import type { PlanStatus } from '@egoless-do/core';
import { Card, useTheme, useT } from '../../components/UI';
import PlanTodoListModal from './PlanTodoListModal';
import { ClipboardList, CheckCircle2 } from 'lucide-react-native';

const STATUS_COLORS: Record<PlanStatus, string> = {
  not_started: COLORS.GRAY, in_progress: COLORS.GREEN, paused: COLORS.YELLOW,
  completed: COLORS.BLUE, cancelled: COLORS.RED, delayed: COLORS.ORANGE,
};

export default function PlanScreen() {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const store = useAppStore();
  const nav = useNavigation<any>();
  const today = new Date().toISOString().slice(0, 10);

  const [showTodoList, setShowTodoList] = useState(false);

  useEffect(() => {
    store.checkAutoStatus();
    store.autoSyncPlanItems();
  }, []);

  const activePlan = useMemo(() => getActivePlan(store.plans ?? []), [store.plans]);
  const planItems = useMemo(() => activePlan ? getPlanItems(store.planItems ?? [], activePlan.id) : [], [store.planItems, activePlan]);
  const todayItems = useMemo(() => activePlan ? getTodayItems(store.planItems ?? [], activePlan, today) : [], [store.planItems, activePlan, today]);
  const checkins = store.planItemCheckins ?? [];
  const progress = activePlan ? computePlanProgress(activePlan, planItems) : 0;
  const todayDone = todayItems.filter(i => checkins.some(c => c.planItemId === i.id && c.date === today && c.done)).length;

  const statusLabel = (s: PlanStatus) => {
    const key = `planStatus${s.charAt(0).toUpperCase() + s.slice(1).replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())}`;
    return T(key);
  };

  const handleDelete = () => {
    if (!activePlan) return;
    Alert.alert(T('planDelete'), T('planConfirmDelete'), [
      { text: T('commonCancel'), style: 'cancel' },
      { text: T('planDelete'), style: 'destructive', onPress: () => store.deletePlan(activePlan.id) },
    ]);
  };

  const handleComplete = () => {
    if (!activePlan) return;
    Alert.alert(T('planComplete'), T('planConfirmComplete'), [
      { text: T('commonCancel'), style: 'cancel' },
      { text: T('planComplete'), onPress: () => store.completePlan(activePlan.id) },
    ]);
  };

  const handleCancel = () => {
    if (!activePlan) return;
    Alert.alert(T('planCancelPlan'), T('planConfirmCancel'), [
      { text: T('commonCancel'), style: 'cancel' },
      { text: T('planCancelPlan'), style: 'destructive', onPress: () => store.cancelPlan(activePlan.id) },
    ]);
  };

  // Empty state
  if (!activePlan) {
    return (
      <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: TH.bg }}>
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
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Plan header */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <ClipboardList size={20} color={TH.text} />
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text, flex: 1 }} numberOfLines={1}>{activePlan.name}</Text>
            <View style={{ backgroundColor: `${STATUS_COLORS[activePlan.status]}20`, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 }}>
              <Text style={{ fontSize: FONT_BADGE, fontWeight: '600', color: STATUS_COLORS[activePlan.status] }}>{statusLabel(activePlan.status)}</Text>
            </View>
          </View>

          {activePlan.slogan ? (
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, fontStyle: 'italic', marginBottom: 8 }}>
              &ldquo;{activePlan.slogan}&rdquo;
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <View style={{ flex: 1, height: 6, backgroundColor: TH.border, borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: 6, width: `${progress}%`, backgroundColor: P, borderRadius: 3 }} />
            </View>
            <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.text }}>{progress}%</Text>
          </View>

          <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>
            {activePlan.startDate} ~ {activePlan.endDate}
          </Text>
        </Card>

        {/* Goal */}
        <Card>
          <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.sub, marginBottom: 4 }}>{T('planGoal')}</Text>
          <Text style={{ fontSize: FONT_SUB, color: TH.text }}>{activePlan.goal}</Text>
        </Card>

        {/* Items summary */}
        <Card>
          <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.text, marginBottom: 12 }}>{T('planItems')}</Text>
          {planItems.length === 0 ? (
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, textAlign: 'center', padding: 12 }}>{T('planNoItems')}</Text>
          ) : (
            planItems.map(item => (
              <View key={item.id} style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                padding: 10, marginBottom: 6, borderRadius: 8,
                backgroundColor: `${TH.card}80`, borderWidth: 1, borderColor: TH.border,
              }}>
                <Text style={{ fontSize: FONT_SUB, fontWeight: '500', color: TH.text, flex: 1 }} numberOfLines={1}>{item.name}</Text>
                <View style={{ backgroundColor: `${STATUS_COLORS[item.status]}20`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ fontSize: FONT_BADGE, fontWeight: '600', color: STATUS_COLORS[item.status] }}>{statusLabel(item.status)}</Text>
                </View>
                <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{item.progress}%</Text>
              </View>
            ))
          )}
        </Card>

        {/* TodoList entry */}
        <TouchableOpacity
          onPress={() => setShowTodoList(true)}
          activeOpacity={0.7}
          style={{
            backgroundColor: `${P}10`, borderWidth: 1, borderColor: `${P}30`,
            borderRadius: 16, padding: 16, marginBottom: 12,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <CheckCircle2 size={18} color={P} />
          <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: P }}>{T('planTodoList')}</Text>
          {todayItems.length > 0 && (
            <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>({todayDone}/{todayItems.length})</Text>
          )}
        </TouchableOpacity>

        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          {canEditPlan(activePlan.status) && (
            <TouchableOpacity
              onPress={() => nav.navigate('PlanCreate', { planId: activePlan.id })}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: `${P}40`, backgroundColor: `${P}10`, alignItems: 'center' }}
            >
              <Text style={{ color: P, fontSize: FONT_SUB, fontWeight: '600' }}>{T('planEdit')}</Text>
            </TouchableOpacity>
          )}

          {activePlan.status === 'not_started' && (
            <TouchableOpacity
              onPress={() => store.startPlan(activePlan.id)}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.GREEN, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontSize: FONT_SUB, fontWeight: '600' }}>{T('planStart')}</Text>
            </TouchableOpacity>
          )}

          {activePlan.status === 'in_progress' && (
            <>
              <TouchableOpacity
                onPress={() => store.pausePlan(activePlan.id)}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: `${COLORS.YELLOW}40`, backgroundColor: `${COLORS.YELLOW}10`, alignItems: 'center' }}
              >
                <Text style={{ color: COLORS.YELLOW, fontSize: FONT_SUB, fontWeight: '600' }}>{T('planPause')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleComplete}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.BLUE, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: FONT_SUB, fontWeight: '600' }}>{T('planComplete')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCancel}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: `${COLORS.RED}40`, backgroundColor: `${COLORS.RED}10`, alignItems: 'center' }}
              >
                <Text style={{ color: COLORS.RED, fontSize: FONT_SUB, fontWeight: '600' }}>{T('planCancelPlan')}</Text>
              </TouchableOpacity>
            </>
          )}

          {activePlan.status === 'paused' && (
            <TouchableOpacity
              onPress={() => store.resumePlan(activePlan.id)}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.GREEN, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontSize: FONT_SUB, fontWeight: '600' }}>{T('planResume')}</Text>
            </TouchableOpacity>
          )}

          {activePlan.status === 'delayed' && (
            <>
              <TouchableOpacity
                onPress={() => nav.navigate('PlanCreate', { planId: activePlan.id })}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: `${P}40`, backgroundColor: `${P}10`, alignItems: 'center' }}
              >
                <Text style={{ color: P, fontSize: FONT_SUB, fontWeight: '600' }}>{T('planEdit')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleComplete}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.BLUE, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: FONT_SUB, fontWeight: '600' }}>{T('planComplete')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCancel}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: `${COLORS.RED}40`, backgroundColor: `${COLORS.RED}10`, alignItems: 'center' }}
              >
                <Text style={{ color: COLORS.RED, fontSize: FONT_SUB, fontWeight: '600' }}>{T('planCancelPlan')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {canDeletePlan(activePlan.status) && (
          <TouchableOpacity
            onPress={handleDelete}
            style={{
              paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: `${COLORS.RED}40`,
              alignItems: 'center', marginBottom: 8,
            }}
          >
            <Text style={{ color: COLORS.RED, fontSize: FONT_SUB, fontWeight: '600' }}>{T('planDelete')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {showTodoList && <PlanTodoListModal onClose={() => setShowTodoList(false)} />}
    </SafeAreaView>
  );
}
