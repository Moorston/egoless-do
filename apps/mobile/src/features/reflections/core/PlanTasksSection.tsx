import { FONT_SMALL } from '@egoless-do/core';
import type { PlanItem, PlanItemCheckin } from '@egoless-do/core';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { useTheme, useT } from '../../../components/UI';

import { PlanTaskCard } from './PlanTaskCard';

interface PlanTasksSectionProps {
  planItems: PlanItem[];
  checkins: PlanItemCheckin[];
  onNavigateToPlan: (planItemId: string) => void;
  onDeletePlanItem: (planItemId: string) => void;
  onCreatePlan: () => void;
}

export function PlanTasksSection({
  planItems,
  checkins,
  onNavigateToPlan,
  onDeletePlanItem,
  onCreatePlan,
}: PlanTasksSectionProps) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;

  // 无内容时隐藏
  if (planItems.length === 0) {
    return (
      <TouchableOpacity
        style={[styles.container, { backgroundColor: TH.card, borderColor: TH.border }]}
        onPress={onCreatePlan}
      >
        <Text style={[styles.createText, { color: P }]}>
          + {T('trailPlanCreate')}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: TH.card, borderColor: TH.border }]}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: TH.text }]}>📋 {T('trailPlanTitle')}</Text>
        <TouchableOpacity onPress={onCreatePlan}>
          <Text style={[styles.createText, { color: P }]}>+ {T('trailPlanCreate')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.list}>
        {planItems.map(item => (
          <PlanTaskCard
            key={item.id}
            planItem={item}
            checkins={checkins.filter(c => c.planItemId === item.id)}
            onPress={() => onNavigateToPlan(item.id)}
            onDelete={() => onDeletePlanItem(item.id)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: FONT_SMALL(),
    fontWeight: '600',
  },
  list: {
    gap: 6,
  },
  createText: {
    fontSize: FONT_SMALL(),
    fontWeight: '600',
  },
});
