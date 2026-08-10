// ─── ComboReportPage ─────────────────────────────────────────
// 组合训练汇总报告页：展示总时长、总卡路里、各动作完成列表

import {FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, FONT_STAT_CARD, scaleFontSize, type Theme} from '@egoless-do/core';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, ChevronRight, Clock, Flame, List } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ExerciseResult } from './ComboProgressHeader';

interface ComboReportProps {
  totalDurationSec: number;
  totalCalories: number;
  exercises: ExerciseResult[];
  TH: Theme;
  T: (key: string, params?: Record<string, string | number>) => string;
  onFinish: () => void;
}

export default function ComboReportPage({ totalDurationSec, totalCalories, exercises, TH, T, onFinish }: ComboReportProps) {
  const insets = useSafeAreaInsets();
  const totalMin = Math.floor(totalDurationSec / 60);
  const totalSec = totalDurationSec % 60;

  return (
    <View style={{ flex: 1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}>
        {/* Header */}
        <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text, textAlign: 'center', marginBottom: 20 }}>
          {T('bodyComboReport')}
        </Text>

        {/* Summary card */}
        <View style={[styles.summaryCard, { backgroundColor: TH.card, borderColor: TH.border }]}>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryItem, { borderRightWidth: 1, borderRightColor: TH.border }]}>
              <Clock size={20} color={TH.primary} />
              <Text style={[styles.summaryValue, { color: TH.text }]}>
                {totalMin}:{totalSec.toString().padStart(2, '0')}
              </Text>
              <Text style={[styles.summaryLabel, { color: TH.sub }]}>{T('bodyComboTotalDuration')}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Flame size={20} color="#f59e0b" />
              <Text style={[styles.summaryValue, { color: TH.text }]}>
                {totalCalories}
              </Text>
              <Text style={[styles.summaryLabel, { color: TH.sub }]}>{T('bodyComboTotalCalories')}</Text>
            </View>
          </View>
          <View style={[styles.summaryFooter, { borderTopWidth: 1, borderTopColor: TH.border }]}>
            <List size={16} color={TH.sub} />
            <Text style={[styles.summaryFooterText, { color: TH.sub }]}>
              {exercises.length} {T('bodyPlanUnitExercise')}
            </Text>
          </View>
        </View>

        {/* Exercise list */}
        <Text style={{ fontSize: FONT_SUB(), fontWeight: '600', color: TH.sub, marginBottom: 12, marginTop: 8 }}>
          {T('bodyComboExercises')}
        </Text>
        {exercises.map((ex, i) => {
          const exMin = Math.floor(ex.durationSec / 60);
          const exSec = ex.durationSec % 60;
          return (
            <View key={i} style={[styles.exerciseRow, { backgroundColor: TH.card, borderColor: TH.border }]}>
              <View style={styles.exerciseLeft}>
                <Text style={styles.exerciseIcon}>{ex.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.exerciseName, { color: TH.text }]} numberOfLines={1}>
                    {ex.nameZh}
                  </Text>
                  {ex.reps > 0 && (
                    <Text style={[styles.exerciseMeta, { color: TH.sub }]}>
                      {ex.reps} {T('bodyPlanUnitReps') || 'reps'}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.exerciseRight}>
                <Text style={[styles.exerciseTime, { color: TH.text }]}>
                  {exMin}:{exSec.toString().padStart(2, '0')}
                </Text>
                <Text style={[styles.exerciseCal, { color: TH.sub }]}>
                  {ex.calories} kcal
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Finish button */}
      <View style={[styles.finishContainer, { paddingBottom: insets.bottom, backgroundColor: TH.bg }]}>
        <TouchableOpacity onPress={onFinish} style={styles.finishBtn}>
          <LinearGradient colors={['#10b981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.finishGradient}>
            <CheckCircle2 size={20} color="#fff" />
            <Text style={styles.finishText}>{T('bodyComboReturn')}</Text>
            <ChevronRight size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  summaryValue: {
    fontSize: FONT_STAT_CARD(),
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: FONT_SMALL(),
    fontWeight: '500',
  },
  summaryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  summaryFooterText: {
    fontSize: FONT_SMALL(),
    fontWeight: '500',
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  exerciseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  exerciseIcon: {
    fontSize: scaleFontSize(24),
  },
  exerciseName: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
  },
  exerciseMeta: {
    fontSize: FONT_SMALL(),
    marginTop: 2,
  },
  exerciseRight: {
    alignItems: 'flex-end',
  },
  exerciseTime: {
    fontSize: FONT_BODY(),
    fontWeight: '700',
  },
  exerciseCal: {
    fontSize: FONT_SMALL(),
    marginTop: 2,
  },
  finishContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  finishBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  finishGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  finishText: {
    fontSize: FONT_BODY(),
    fontWeight: '700',
    color: '#fff',
  },
});