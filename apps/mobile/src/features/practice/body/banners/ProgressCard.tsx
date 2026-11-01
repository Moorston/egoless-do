import { FONT_BODY, FONT_SMALL, FONT_STAT_CARD } from '@egoless-do/core';
import { TrendingUp } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

import { styles } from '../BodyDashboardStyles';

interface PlanProgress {
  weekComplete: number;
  weekTotal: number;
  totalDuration: number;
  totalCal: number;
  todayDone?: boolean;
}

export interface ProgressCardProps {
  T: (key: string) => string;
  TH: { text: string; sub: string; card: string; border: string };
  planProgress: PlanProgress | null;
}

/**
 * Card: 本周进度
 *
 * Extracted from BodyDashboard via move-only JSX extraction (L379-416).
 * The `planProgress &&` guard at the call site replaces the inline conditional;
 * the progress-bar ternary lives here now.
 */
export function ProgressCard({ T, TH, planProgress }: ProgressCardProps) {
  if (!planProgress) return null;
  return (
    <View style={[styles.progressCard, { backgroundColor: TH.card }]}>
      <View style={styles.progressHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={18} color="#10b981" />
          <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text }}>{T('bodyWeeklyProgress')}</Text>
        </View>
        <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>
          {String(planProgress.weekComplete)}/{String(planProgress.weekTotal)}
        </Text>
      </View>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarBg, { backgroundColor: TH.border }]}>
          <View
            style={[styles.progressBarFill, {
              width: `${planProgress.weekTotal > 0 ? (planProgress.weekComplete / planProgress.weekTotal) * 100 : 0}%`,
              backgroundColor: '#10b981',
            }]}
          />
        </View>
      </View>
      <View style={styles.progressStats}>
        <View style={styles.progressStatItem}>
          <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: '#f59e0b' }}>{String(planProgress.totalDuration)}</Text>
          <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T('exerciseMin')}</Text>
        </View>
        <View style={styles.progressStatItem}>
          <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: '#ef4444' }}>{String(planProgress.totalCal)}</Text>
          <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>kcal</Text>
        </View>
        <View style={styles.progressStatItem}>
          <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: '#8b5cf6' }}>{String(planProgress.weekComplete)}</Text>
          <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T('bodyDayCompleted')}</Text>
        </View>
      </View>
    </View>
  );
}
