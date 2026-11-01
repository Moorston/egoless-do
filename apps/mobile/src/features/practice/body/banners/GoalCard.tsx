import { type BodyGoal, FONT_BODY, FONT_SMALL, FONT_STAT_CARD } from '@egoless-do/core';
import { Target } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { styles } from '../BodyDashboardStyles';

export interface GoalCardProps {
  T: (key: string) => string;
  TH: { text: string; sub: string; card: string; border: string };
  activeGoal: BodyGoal | undefined;
  getStrategyLabel: (strategy: string) => string;
  onEdit: () => void;
}

/**
 * Card: 调身目标
 *
 * Extracted from BodyDashboard via move-only JSX extraction (L244-292).
 * The nested `activeGoal ? ... : ...` ternary and the three `&&`-guarded
 * metric items count toward THIS component's complexity, not the parent's.
 */
export function GoalCard({ T, TH, activeGoal, getStrategyLabel, onEdit }: GoalCardProps) {
  return (
    <TouchableOpacity
      onPress={onEdit}
      activeOpacity={0.85}
      style={[styles.goalCard, { backgroundColor: TH.card }]}
    >
      <View style={styles.goalHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.goalIconCircle, { backgroundColor: '#8b5cf6' }]}>
            <Target size={18} color="#fff" />
          </View>
          <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text }}>{T('bodyGoal')}</Text>
        </View>
        <Text style={{ fontSize: FONT_SMALL(), color: '#8b5cf6' }}>{activeGoal ? T('bodyGoalEdit') : T('bodyGoalSet')}</Text>
      </View>
      {activeGoal ? (
        <View style={styles.goalContent}>
          <View style={styles.goalMetrics}>
            {activeGoal.targetWeight != null && (
              <View style={styles.goalMetricItem}>
                <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: TH.text }}>{`${activeGoal.targetWeight}kg`}</Text>
                <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T('bodyTargetWeight')}</Text>
              </View>
            )}
            {activeGoal.targetBodyFat != null && (
              <View style={styles.goalMetricItem}>
                <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: TH.text }}>{`${activeGoal.targetBodyFat}%`}</Text>
                <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T('bodyTargetBodyFat')}</Text>
              </View>
            )}
            {activeGoal.strategy && (
              <View style={styles.goalMetricItem}>
                <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '600', color: '#8b5cf6' }}>
                  {getStrategyLabel(activeGoal.strategy)}
                </Text>
                <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T('bodyStrategyLabel')}</Text>
              </View>
            )}
          </View>
          {activeGoal.targetDate && (
            <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, marginTop: 8 }}>{T('bodyTargetDate')}: {activeGoal.targetDate}</Text>
          )}
        </View>
      ) : (
        <View style={styles.goalEmpty}>
          <Text style={{ fontSize: FONT_BODY(), color: TH.sub }}>{T('bodyGoalNotSet')}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
