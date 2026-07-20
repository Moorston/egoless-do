import { FONT_TITLE, FONT_BODY, FONT_SMALL, dateStr, type BodyTrainingPlan } from '@egoless-do/core';
import { ChevronLeft, Play, Pause, Trash2, Clock, Pencil, Eye } from 'lucide-react-native';
import React, { useMemo, useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT } from '../../../../components/UI';
import { useRootNavigation } from '../../../../navigation/hooks';
import { useShallowStore } from '../../../../store/useAppStore';
import PlanDetailModal from '../modals/PlanDetailModal';

const STATUS_CONFIG = {
  active: { icon: '🟢', color: '#10b981', labelKey: 'bodyPlanActive' },
  completed: { icon: '✅', color: '#6366f1', labelKey: 'bodyPlanCompleted' },
  cancelled: { icon: '⏸️', color: '#f59e0b', labelKey: 'bodyPlanCancelled' },
} as const;

export default function PlanManagementScreen() {
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();
  const { bodyTrainingPlans, updateBodyTrainingPlan, removeBodyTrainingPlan } = useShallowStore(s => ({
    bodyTrainingPlans: s.bodyTrainingPlans,
    updateBodyTrainingPlan: s.updateBodyTrainingPlan,
    removeBodyTrainingPlan: s.removeBodyTrainingPlan,
  }));
  const [detailPlan, setDetailPlan] = useState<BodyTrainingPlan | null>(null);

  const plans = useMemo(() =>
    (bodyTrainingPlans ?? [])
      .filter(p => !p.deleted)
      .sort((a, b) => {
        // Active first, then by start date desc
        const order = { active: 0, completed: 1, cancelled: 2 };
        const diff = order[a.status] - order[b.status];
        return diff !== 0 ? diff : b.startDate.localeCompare(a.startDate);
      }),
  [bodyTrainingPlans]);

  const handleActivate = useCallback((plan: BodyTrainingPlan) => {
    // Deactivate all other active plans first
    for (const p of plans) {
      if (p.status === 'active' && p.id !== plan.id) {
        updateBodyTrainingPlan(p.id, { status: 'cancelled' });
      }
    }
    updateBodyTrainingPlan(plan.id, { status: 'active' });
  }, [plans, updateBodyTrainingPlan]);

  const handlePause = useCallback((plan: BodyTrainingPlan) => {
    updateBodyTrainingPlan(plan.id, { status: 'cancelled' });
  }, [updateBodyTrainingPlan]);

  const handleDelete = useCallback((plan: BodyTrainingPlan) => {
    Alert.alert(
      T('bodyPlanDeleteConfirm') || '确认删除',
      T('bodyPlanDeleteMsg') || `删除计划「${plan.name}」？此操作不可撤销。`,
      [
        { text: T('bodyCancel') || '取消', style: 'cancel' },
        { text: T('bodyDelete') || '删除', style: 'destructive', onPress: () => removeBodyTrainingPlan(plan.id) },
      ]
    );
  }, [T, removeBodyTrainingPlan]);

  const getProgress = (plan: BodyTrainingPlan) => {
    const today = dateStr();
    const start = plan.startDate;
    const end = plan.endDate;
    const totalDays = Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000));
    const elapsed = Math.max(0, Math.round((new Date(today).getTime() - new Date(start).getTime()) / 86400000));
    return Math.min(100, Math.round((elapsed / totalDays) * 100));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={TH.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text, flex: 1 }}>{T('bodyPlanManagement') || '我的训练计划'}</Text>
        <TouchableOpacity onPress={() => nav.navigate('BodyPlanEditor' as never)} style={styles.addBtn}>
          <Text style={{ fontSize: FONT_SMALL(), color: '#f59e0b', fontWeight: '600' }}>+ {T('bodyPlanCreate')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {plans.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
            <Text style={{ fontSize: FONT_BODY(), color: TH.sub, textAlign: 'center' }}>{T('bodyPlanNotSet')}</Text>
          </View>
        ) : (
          plans.map(plan => {
            const config = STATUS_CONFIG[plan.status];
            const progress = getProgress(plan);
            const isActive = plan.status === 'active';
            const weeks = Math.max(1, Math.round((new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / 604800000));
            const activeDays = plan.tasks.filter(t => t.sportKey && t.sportKey !== 'rest').length;

            return (
              <View key={plan.id} style={[styles.planCard, {
                backgroundColor: TH.card,
                borderColor: isActive ? '#f59e0b30' : config.color + '20',
                borderLeftWidth: 4,
                borderLeftColor: config.color,
                shadowColor: isActive ? '#f59e0b' : '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isActive ? 0.15 : 0.05,
                shadowRadius: 8,
                elevation: isActive ? 4 : 1,
              }]}>
                {/* Status badge */}
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: config.color + '15', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 22 }}>{config.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text }} numberOfLines={1}>{plan.name}</Text>
                      <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, marginTop: 2 }}>{plan.startDate} ~ {plan.endDate}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${config.color}15`, borderWidth: 1, borderColor: `${config.color}30` }]}>
                      <Text style={{ fontSize: FONT_SMALL(), color: config.color, fontWeight: '600' }}>{T(config.labelKey)}</Text>
                    </View>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T('bodyProgress') || '进度'}</Text>
                    <Text style={{ fontSize: FONT_SMALL(), color: TH.text, fontWeight: '600' }}>{progress}%</Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: TH.border, borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ height: 6, width: `${progress}%`, backgroundColor: isActive ? '#f59e0b' : config.color, borderRadius: 3 }} />
                  </View>
                </View>

                {/* Stats */}
                <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Clock size={14} color={TH.sub} />
                    <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T('bodyPlanSummary').replace('{}', String(weeks)).replace('{}', String(activeDays))}</Text>
                  </View>
                  {plan.strategy && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T(`bodyStrategy${plan.strategy.charAt(0).toUpperCase() + plan.strategy.slice(1)}` as never) || plan.strategy}</Text>
                    </View>
                  )}
                </View>

                {/* Actions */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {isActive ? (
                    <TouchableOpacity onPress={() => handlePause(plan)} style={[styles.actionBtn, { backgroundColor: TH.border }]}>
                      <Pause size={14} color={TH.text} />
                      <Text style={{ fontSize: FONT_SMALL(), color: TH.text, fontWeight: '600' }}>{T('bodyPlanPause') || '暂停'}</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => handleActivate(plan)} style={[styles.actionBtn, { backgroundColor: '#10b981' }]}>
                      <Play size={14} color="#fff" />
                      <Text style={{ fontSize: FONT_SMALL(), color: '#fff', fontWeight: '600' }}>{T('bodyPlanActivate') || '激活'}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => nav.navigate('BodyPlanEditor' as never, { planId: plan.id } as never)} style={[styles.actionBtn, { backgroundColor: '#f59e0b20' }]}>
                    <Pencil size={14} color="#f59e0b" />
                    <Text style={{ fontSize: FONT_SMALL(), color: '#f59e0b', fontWeight: '600' }}>{T('bodyPlanEdit')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setDetailPlan(plan)} style={[styles.actionBtn, { backgroundColor: '#6366f120' }]}>
                    <Eye size={14} color="#6366f1" />
                    <Text style={{ fontSize: FONT_SMALL(), color: '#6366f1', fontWeight: '600' }}>{T('bodyPlanDetail')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(plan)} style={[styles.actionBtn, { backgroundColor: '#ef444420' }]}>
                    <Trash2 size={14} color="#ef4444" />
                    <Text style={{ fontSize: FONT_SMALL(), color: '#ef4444', fontWeight: '600' }}>{T('bodyDelete') || '删除'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <PlanDetailModal
        visible={detailPlan !== null}
        plan={detailPlan}
        onClose={() => setDetailPlan(null)}
      />

      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,.06)',
  },
  backBtn: {
    marginRight: 12,
  },
  addBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f59e0b15',
  },
  planCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeader: {
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
