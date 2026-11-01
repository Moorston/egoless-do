import { COMBO_WORKOUT_SPORT_KEY, EXERCISE_CATEGORIES, FONT_BODY, FONT_SMALL, type ExerciseEntry } from '@egoless-do/core';
import { Activity, ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { styles } from '../BodyDashboardStyles';

export interface RecentExercisesCardProps {
  T: (key: string) => string;
  TH: { text: string; sub: string; card: string; border: string; primary: string };
  recentExercises: ExerciseEntry[];
  onNavigateHistory: () => void;
}

/**
 * Card: 最近训练
 *
 * Extracted from BodyDashboard via move-only JSX extraction (L418-450).
 * The `recentExercises.length > 0 &&` guard moves to the call site (rendered
 * as a bare component returning null otherwise). The `.map(e => {...})`
 * callback and its inline ternary have their own complexity budget.
 */
export function RecentExercisesCard({ T, TH, recentExercises, onNavigateHistory }: RecentExercisesCardProps) {
  if (recentExercises.length === 0) return null;
  return (
    <View style={[styles.recentCard, { backgroundColor: TH.card }]}>
      <View style={styles.recentHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Activity size={18} color="#f59e0b" />
          <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text }}>{T('exerciseRecentActivity')}</Text>
        </View>
        <TouchableOpacity onPress={onNavigateHistory} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: FONT_SMALL(), color: TH.primary }}>{T('exerciseHistory')}</Text>
          <ChevronRight size={14} color={TH.primary} />
        </TouchableOpacity>
      </View>
      {recentExercises.map((e, i) => {
        const cat = EXERCISE_CATEGORIES.find(c => c.key === e.sportKey);
        const sportLabel = e.sportKey === COMBO_WORKOUT_SPORT_KEY ? T('bodyComboTraining') : (cat ? T(cat.i18nKey) : e.sportKey);
        return (
        <View key={e.id} style={[styles.recentItem, { borderBottomWidth: i < recentExercises.length - 1 ? 1 : 0, borderBottomColor: TH.border }]}>
          <Text style={{ fontSize: 20 }}>{e.sportIcon}</Text>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: TH.text }}>{sportLabel}</Text>
            <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>
              {String(Math.floor(e.durationSec / 60))}{T('bodyMin')} {e.calories ? `· ${e.calories}kcal` : ''}
            </Text>
          </View>
          <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>
            {new Date(e.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
        );
      })}
    </View>
  );
}
