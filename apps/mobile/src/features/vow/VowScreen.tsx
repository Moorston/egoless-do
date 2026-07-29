import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, dateStr, FONT_HERO } from '@egoless-do/core';
import type { Vision, VisionType, VisionStatus, VisionTimeFrame, Plan, PlanItem, Habit } from '@egoless-do/core';
import { Flag, Target, Plus, Star } from 'lucide-react-native';
import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT } from '../../components/UI';
import SimpleHeader from '../../navigation/SimpleHeader';
import { useRootNavigation } from '../../navigation/hooks';
import { useAppStore, useShallowStore } from '../../store/useAppStore';

import VisionCard from './components/VisionCard';
import VisionEditModal from './modals/VisionEditModal';

export default function VowScreen() {
  const TH = useTheme();
  const T = useT();
  const nav = useRootNavigation();
  const { plans: plansRaw, planItems: planItemsRaw, planItemCheckins, visions: visionsRaw, habits: habitsRaw,
    updateVision, addVision, achieveVision, archiveVision, removeVision,
    updatePlan, updateHabit } = useShallowStore(s => ({
    plans: s.plans,
    planItems: s.planItems,
    planItemCheckins: s.planItemCheckins,
    visions: s.visions,
    habits: s.habits,
    updateVision: s.updateVision,
    addVision: s.addVision,
    achieveVision: s.achieveVision,
    archiveVision: s.archiveVision,
    removeVision: s.removeVision,
    updatePlan: s.updatePlan,
    updateHabit: s.updateHabit,
  }));

  const [showModal, setShowModal] = useState(false);
  const [editingVision, setEditingVision] = useState<Vision | null>(null);
  const [filterStatus, setFilterStatus] = useState<VisionStatus | 'all'>('active');

  const plans = plansRaw ?? [];
  const planItems = planItemsRaw ?? [];
  const habits = habitsRaw ?? [];

  const visions = useMemo(() =>
    (visionsRaw ?? []).filter(v => !v.deleted && (filterStatus === 'all' || v.status === filterStatus)),
    [visionsRaw, filterStatus],
  );

  const grouped = useMemo(() => {
    const order: VisionType[] = ['lifetime', 'long', 'short'];
    const map = new Map<VisionType, Vision[]>();
    for (const t of order) map.set(t, []);
    for (const v of visions) map.get(v.type)?.push(v);
    return order.filter(t => (map.get(t)?.length ?? 0) > 0).map(t => ({ type: t, items: map.get(t)! }));
  }, [visions]);

  const activeCount = useMemo(() =>
    (visionsRaw ?? []).filter(v => !v.deleted && v.status === 'active').length,
    [visionsRaw],
  );

  const handleAdd = useCallback(() => {
    setEditingVision(null);
    setShowModal(true);
  }, []);

  const handleEdit = useCallback((v: Vision) => {
    setEditingVision(v);
    setShowModal(true);
  }, []);

  const handleSave = useCallback((data: { text: string; type?: VisionType; timeFrame?: VisionTimeFrame; startDate?: string; deadline?: string; linkedHabitIds: string[]; linkedPlanIds: string[] }) => {
    if (editingVision) {
      updateVision(editingVision.id, { text: data.text, timeFrame: data.timeFrame, startDate: data.startDate, deadline: data.deadline });
      // Sync linked plans: add new, remove unlinked
      const currentLinkedPlanIds = (plans ?? []).filter(
        (p: Plan) => p.visionId === editingVision.id
      ).map((p: Plan) => p.id);
      for (const pid of currentLinkedPlanIds) {
        if (!data.linkedPlanIds.includes(pid)) updatePlan(pid, { visionId: undefined });
      }
      for (const pid of data.linkedPlanIds) {
        if (!currentLinkedPlanIds.includes(pid)) updatePlan(pid, { visionId: editingVision.id });
      }
      // Sync linked habits: add new, remove unlinked
      const currentLinkedHabitIds = (habits ?? []).filter(
        (h: Habit) => h.visionId === editingVision.id
      ).map((h: Habit) => h.id);
      for (const hId of currentLinkedHabitIds) {
        if (!data.linkedHabitIds.includes(hId)) updateHabit(hId, { visionId: undefined });
      }
      for (const hId of data.linkedHabitIds) {
        if (!currentLinkedHabitIds.includes(hId)) updateHabit(hId, { visionId: editingVision.id });
      }
    } else {
      const visionType = data.type ?? 'short';
      const existing = (visionsRaw ?? []).filter(v => !v.deleted);
      const conflict = existing.find(v => v.type === visionType && v.status === 'active');
      if (conflict) {
        Alert.alert(
          T('vowTitle'),
          T('vowNeedArchive').replace('{type}', T(`vow${visionType === 'lifetime' ? 'Lifetime' : visionType === 'long' ? 'Long' : 'Short'}`)),
        );
        return;
      }
      const result = addVision({
        type: visionType,
        text: data.text,
        timeFrame: data.timeFrame,
        startDate: data.startDate ?? dateStr(),
        deadline: data.deadline,
      });
      if (result) {
        for (const pid of data.linkedPlanIds) {
          updatePlan(pid, { visionId: result.id });
        }
        for (const hId of data.linkedHabitIds) {
          updateHabit(hId, { visionId: result.id });
        }
      }
    }
    setShowModal(false);
    setEditingVision(null);
  }, [editingVision, visionsRaw, plans, habits, updateVision, addVision, updatePlan, updateHabit, T]);

  const handleAchieve = useCallback((id: string) => {
    Alert.alert(T('vowAchieve'), '', [
      { text: T('vowCancel'), style: 'cancel' },
      { text: T('vowAchieve'), onPress: () => achieveVision(id) },
    ]);
  }, [achieveVision, T]);

  const handleArchive = useCallback((id: string) => {
    Alert.alert(T('vowArchive'), '', [
      { text: T('vowCancel'), style: 'cancel' },
      { text: T('vowArchive'), onPress: () => archiveVision(id) },
    ]);
  }, [archiveVision, T]);

  const handleDelete = useCallback((id: string) => {
    Alert.alert(T('vowDelete'), '', [
      { text: T('vowCancel'), style: 'cancel' },
      { text: T('vowDelete'), style: 'destructive', onPress: () => removeVision(id) },
    ]);
  }, [removeVision, T]);

  const handleNavigateToPlan = useCallback((planId: string) => {
    nav.navigate('PlanDetail', { planId });
  }, [nav]);

  const handleModalClose = useCallback(() => {
    setShowModal(false);
    setEditingVision(null);
  }, []);

  // Pre-index plan items by planId for O(1) lookup per plan
  const planItemsByPlanId = useMemo(() => {
    const map = new Map<string, PlanItem[]>();
    for (const pi of planItems) {
      if (!pi.deleted) {
        const existing = map.get(pi.planId);
        if (existing) existing.push(pi);
        else map.set(pi.planId, [pi]);
      }
    }
    return map;
  }, [planItems]);

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: TH.bg }}>
      <SimpleHeader routeName="Vow" />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
        <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: TH.text }}>{T('vowTitle')}</Text>
        <TouchableOpacity onPress={handleAdd} style={{ backgroundColor: TH.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Plus size={16} color="#fff" />
          <Text style={{ color: '#fff', fontSize: FONT_SUB(), fontWeight: '700' }}>{T('commonAdd')}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Summary */}
        <View style={{
          backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 16,
          flexDirection: 'row', alignItems: 'center', gap: 12,
        }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: TH.primary + '20', alignItems: 'center', justifyContent: 'center' }}>
            <Flag size={22} color={TH.primary} />
          </View>
          <View>
            <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>{T('vowActive')}</Text>
            <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text }}>{String(activeCount)}</Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {(['active', 'achieved', 'archived', 'all'] as const).map(s => {
            const active = filterStatus === s;
            const labels: Record<string, string> = { active: T('vowActive'), achieved: T('vowAchieved'), archived: T('vowArchived'), all: T('allStatus') };
            return (
              <TouchableOpacity
                key={s}
                onPress={() => setFilterStatus(s)}
                style={{
                  paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20,
                  backgroundColor: active ? TH.primary : TH.card,
                }}
              >
                <Text style={{ fontSize: FONT_BADGE(), color: active ? '#fff' : TH.sub, fontWeight: active ? '600' : '400' }}>
                  {labels[s]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {grouped.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: FONT_HERO(), marginBottom: 12 }}>🎯</Text>
            <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text, marginBottom: 8 }}>{T('vowNoVision')}</Text>
            <Text style={{ fontSize: FONT_BODY(), color: TH.sub, textAlign: 'center', marginBottom: 24 }}>{T('vowLifetimeHint')}</Text>
            <TouchableOpacity onPress={handleAdd} style={{ backgroundColor: TH.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BODY() }}>✦ {T('vowCreate')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          grouped.map(({ type, items }) => (
            <View key={type} style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginLeft: 4 }}>
                {React.createElement(
                  type === 'lifetime' ? Star : type === 'long' ? Flag : Target,
                  { size: 16, color: type === 'lifetime' ? '#F59E0B' : type === 'long' ? '#8B5CF6' : '#10B981' }
                )}
                <Text style={{ fontSize: FONT_SUB(), fontWeight: '700', color: TH.text }}>
                  {T(type === 'lifetime' ? 'vowLifetime' : type === 'long' ? 'vowLong' : 'vowShort')}
                </Text>
                <Text style={{ fontSize: FONT_BADGE(), color: TH.sub }}>{items.length}</Text>
              </View>
              {items.map(v => {
                const linked = plans.filter((p: Plan) => !p.deleted && p.visionId === v.id);
                let pct = 0;
                let totalDone = 0;
                let totalItems = 0;
                if (linked.length > 0) {
                  for (const plan of linked) {
                    const pi = planItemsByPlanId.get(plan.id) ?? [];
                    totalDone += pi.filter((i: PlanItem) => i.status === 'completed').length;
                    totalItems += pi.length;
                  }
                  pct = totalItems > 0 ? Math.min(100, Math.round((totalDone / totalItems) * 100)) : 0;
                }
                const planDone = linked.filter((p: Plan) => p.status === 'completed').length;
                return (
                  <VisionCard
                    key={v.id}
                    vision={v}
                    TH={TH}
                    T={T}
                    pct={pct}
                    planDone={planDone}
                    planTotal={linked.length}
                    taskDone={totalDone}
                    taskTotal={totalItems}
                    onAchieve={handleAchieve}
                    onArchive={handleArchive}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    linkedPlans={linked}
                    planItems={planItems}
                    planItemCheckins={planItemCheckins}
                    onNavigateToPlan={handleNavigateToPlan}
                  />
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      <VisionEditModal
        visible={showModal}
        onClose={handleModalClose}
        onSave={handleSave}
        vision={editingVision}
        TH={TH}
        T={T}
      />
    </SafeAreaView>
  );
}