import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../../navigation/types';
import { useTheme, useT } from '../../../components/UI';
import { FONT_SMALL, FONT_BODY, FONT_TINY, computeExpectedDays, dateStr } from '@egoless-do/core';
import type { PlanItem, PlanItemCheckin } from '@egoless-do/core';
import { Trash2, Network } from 'lucide-react-native';

interface PlanTaskCardProps {
  planItem: PlanItem;
  checkins: PlanItemCheckin[];
  onPress: () => void;
  onDelete: () => void;
}

const PRIORITY_COLORS = { high: '#EF4444', medium: '#F59E0B', low: '#10B981' };
const PRIORITY_LABELS = { high: '高', medium: '中', low: '低' };

export function PlanTaskCard({ planItem, checkins, onPress, onDelete }: PlanTaskCardProps) {
  const TH = useTheme();
  const T = useT();
  const nav = useNavigation<StackNavigationProp<RootStackParamList>>();

  const doneCount = planItem.totalCheckinDays;
  const today = dateStr();
  const totalExpectedDays = computeExpectedDays(planItem.frequency, planItem.startDate, planItem.endDate, today);
  const progress = totalExpectedDays > 0 ? Math.min(doneCount / totalExpectedDays, 1) : 0;
  const isCompleted = planItem.status === 'completed';

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: TH.card, borderColor: TH.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={[styles.name, { color: TH.text }]} numberOfLines={1}>
          📌 {planItem.name}
        </Text>
        <View style={[styles.priorityBadge, { backgroundColor: `${PRIORITY_COLORS[planItem.priority]}20` }]}>
          <Text style={[styles.priorityText, { color: PRIORITY_COLORS[planItem.priority] }]}>
            {PRIORITY_LABELS[planItem.priority]}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => nav.navigate('RelationMap', { context: { type: 'planItem', id: planItem.id } })}
          style={{ padding: 4, marginLeft: 4 }}
        >
          <Network size={14} color={TH.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={{ padding: 4, marginLeft: 4 }}>
          <Trash2 size={14} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.progressRow}>
        <View style={[styles.progressBar, { backgroundColor: `${TH.primary}20` }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress * 100}%`, backgroundColor: isCompleted ? '#10B981' : TH.primary },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: TH.sub }]}>
          {T('trailPlanProgress').replace('{done}', String(doneCount)).replace('{total}', String(totalExpectedDays))}
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.dateText, { color: TH.sub }]}>
          {planItem.startDate} ~ {planItem.endDate}
        </Text>
        <Text style={[styles.statusText, { color: isCompleted ? '#10B981' : TH.primary }]}>
          {isCompleted ? T('trailPlanCompleted') : T('trailPlanInProgress')} →
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: FONT_BODY,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: FONT_TINY,
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: FONT_TINY,
    minWidth: 60,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: FONT_TINY,
  },
  statusText: {
    fontSize: FONT_TINY,
    fontWeight: '500',
  },
});
