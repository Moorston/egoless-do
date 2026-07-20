import { FONT_TITLE, FONT_BODY, FONT_SMALL, FONT_LABEL, BODY_STRATEGIES, type BodyTrainingPlan, type BodyPlanTask } from '@egoless-do/core';
import { X } from 'lucide-react-native';
import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

import { useTheme, useT } from '../../../../components/UI';

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

interface Props {
  visible: boolean;
  plan: BodyTrainingPlan | null;
  onClose: () => void;
}

export default function PlanDetailModal({ visible, plan, onClose }: Props) {
  const TH = useTheme();
  const T = useT();

  if (!plan) return null;

  const strategyLabel = plan.strategy
    ? BODY_STRATEGIES.find(s => s.key === plan.strategy)
      ? T(BODY_STRATEGIES.find(s => s.key === plan.strategy)!.nameKey)
      : plan.strategy
    : '';

  const totalDays = Math.max(1, Math.round((new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / 86400000));
  const activeTaskCount = plan.tasks.filter((t: BodyPlanTask) => t.sportKey && t.sportKey !== 'rest').length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: TH.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text, flex: 1 }}>{T('bodyPlanDetailTitle')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color={TH.sub} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
            {/* Plan name */}
            <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text, marginBottom: 16 }}>{plan.name}</Text>

            {/* Date range */}
            <View style={[styles.infoRow, { borderColor: TH.border }]}>
              <Text style={{ fontSize: FONT_LABEL(), color: TH.sub }}>{T('bodyPlanDateRange')}</Text>
              <Text style={{ fontSize: FONT_BODY(), color: TH.text, fontWeight: '600' }}>{plan.startDate} ~ {plan.endDate}</Text>
            </View>

            {/* Strategy */}
            {strategyLabel ? (
              <View style={[styles.infoRow, { borderColor: TH.border }]}>
                <Text style={{ fontSize: FONT_LABEL(), color: TH.sub }}>{T('bodyStrategyLabel')}</Text>
                <Text style={{ fontSize: FONT_BODY(), color: TH.text, fontWeight: '600' }}>{strategyLabel}</Text>
              </View>
            ) : null}

            {/* Status */}
            <View style={[styles.infoRow, { borderColor: TH.border }]}>
              <Text style={{ fontSize: FONT_LABEL(), color: TH.sub }}>{T('bodyProgress')}</Text>
              <Text style={{ fontSize: FONT_BODY(), color: '#f59e0b', fontWeight: '600' }}>
                {plan.status === 'active' ? (T('bodyPlanActive') || '进行中') : plan.status === 'completed' ? (T('bodyPlanCompleted') || '已完成') : (T('bodyPlanCancelled') || '已暂停')}
              </Text>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: TH.bg }]}>
                <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: '#f59e0b' }}>{totalDays}</Text>
                <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T('bodyPlanDays') || '天'}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: TH.bg }]}>
                <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: '#f59e0b' }}>{activeTaskCount}</Text>
                <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T('bodyPlanDays') || '训练日'}</Text>
              </View>
            </View>

            {/* Weekly schedule */}
            <Text style={{ fontSize: FONT_LABEL(), color: TH.sub, marginBottom: 10, marginTop: 8 }}>{T('bodyWeeklyPlan')}</Text>
            {plan.tasks.map((task: BodyPlanTask) => {
              const exCount = task.exercises?.length ?? 0;
              const isRest = !task.sportKey || task.sportKey === 'rest';
              return (
                <View key={task.weekday} style={[styles.dayRow, { backgroundColor: TH.bg, borderColor: TH.border }]}>
                  <View style={[styles.dayBadge, { backgroundColor: isRest ? TH.border : '#f59e0b20' }]}>
                    <Text style={{ fontSize: FONT_SMALL(), color: isRest ? TH.sub : '#f59e0b', fontWeight: '600' }}>{WEEKDAY_LABELS[task.weekday - 1]}</Text>
                  </View>
                  <Text style={{ fontSize: FONT_BODY(), color: TH.text, flex: 1 }}>
                    {isRest ? (T('bodyPlanRestDay') || '休息') : exCount > 0 ? T('bodyPlanExercisesCount').replace('{}', String(exCount)) : (T('bodyPlanNoExercises'))}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          {/* Close button */}
          <TouchableOpacity onPress={onClose} style={[styles.footerBtn, { backgroundColor: '#f59e0b' }]}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BODY() }}>{T('bodyPlanClose')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingTop: 16 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,.06)' },
  closeBtn: { padding: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  statsRow: { flexDirection: 'row', gap: 12, marginVertical: 16 },
  statCard: { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center' },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1 },
  footerBtn: { margin: 20, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  dayBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
