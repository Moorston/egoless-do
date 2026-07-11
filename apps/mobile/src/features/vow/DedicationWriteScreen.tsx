import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_STAT_CARD, dateStr } from '@egoless-do/core';
import type { DedicationType } from '@egoless-do/core';
import { LinearGradient } from 'expo-linear-gradient';
import { Save, ArrowLeft } from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT, ProgressBar } from '../../components/UI';
import { useAppStore, useShallowStore } from '../../store/useAppStore';

import { useVowProgress } from './useVowProgress';

interface Props {
  onBack: () => void;
}

export default function DedicationWriteScreen({ onBack }: Props) {
  const TH = useTheme();
  const T = useT();
  const { dedicationSettings, addDedication } = useShallowStore(s => ({ dedicationSettings: s.dedicationSettings, addDedication: s.addDedication }));
  const progress = useVowProgress();

  const [insight, setInsight] = useState('');
  const [adjustment, setAdjustment] = useState('');

  const settings = dedicationSettings;
  const { dedicationStats } = progress;
  const { practiceDays, totalDays, habitStats, planProgress, visionProgressData } = dedicationStats;

  const periodLabel = useMemo(() => {
    const now = new Date();
    const today = dateStr(now);
    const map: Record<DedicationType, string> = {
      weekly: `${T('vowDedWeekly')} · ${today}`,
      biweekly: `${T('vowDedBiweekly')} · ${today}`,
      monthly: `${T('vowDedMonthly')} · ${today}`,
      custom: `${T('vowDedCustom')} · ${today}`,
    };
    return map[settings.frequency] ?? today;
  }, [settings.frequency, T]);

  const practicePct = totalDays > 0 ? Math.round((practiceDays / totalDays) * 100) : 0;

  const handleSave = () => {
    addDedication({
      date: dateStr(),
      periodLabel,
      type: settings.frequency,
      practiceDays,
      totalDays,
      habitStats,
      planProgress,
      visionProgress: visionProgressData,
      insight: insight.trim() || undefined,
      adjustment: adjustment.trim() || undefined,
    });
    Alert.alert('', T('vowDedSave'), [{ text: 'OK', onPress: onBack }]);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: TH.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <ArrowLeft size={20} color={TH.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: TH.text }]}>
            {T('vowDedWrite')}
          </Text>
        </View>

        {/* Period info */}
        <View style={styles.gradientCard}>
          <LinearGradient
            colors={['#7C3AED', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientPadding}
          >
            <Text style={styles.gradientSub}>
              {T('vowDedPeriod')}
            </Text>
            <Text style={styles.gradientTitle}>
              {periodLabel}
            </Text>
          </LinearGradient>
        </View>

        {/* Auto-generated summary */}
        <View style={[styles.summaryCard, { backgroundColor: TH.card, borderColor: TH.border }]}>
          <View style={styles.summaryTitleRow}>
            <Text style={[styles.summaryTitle, { color: TH.text }]}>
              {T('vowDedSummary')}
            </Text>
          </View>
          <Text style={[styles.autoHint, { color: TH.sub }]}>
            {T('vowDedAutoHint')}
          </Text>

          {/* Practice days */}
          <View style={styles.sectionWrapper}>
            <View style={styles.habitPlanRow}>
              <Text style={[styles.bodyText, { color: TH.text }]}>{T('vowDedDays')}</Text>
              <Text style={styles.practiceDays}>{practiceDays}/{totalDays}</Text>
            </View>
            <ProgressBar pct={practicePct} color="#8B5CF6" />
          </View>

          {/* Habit stats */}
          {habitStats.length > 0 && (
            <View style={styles.sectionWrapper}>
              <Text style={[styles.sectionTitle, { color: TH.text }]}>
                {T('vowProgressHabitDone')}
              </Text>
              {habitStats.map(h => (
                <View key={h.habitId} style={styles.habitPlanRow}>
                  <Text style={[styles.bodyText, { color: TH.text }]}>{h.name}</Text>
                  <View style={styles.statCountRow}>
                    <Text style={styles.completedCount}>
                      {h.completed}/{h.total}
                    </Text>
                    {h.prevCompleted !== undefined && h.completed > h.prevCompleted && (
                      <Text style={styles.prevDelta}>
                        +{h.completed - h.prevCompleted}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Plan progress */}
          {planProgress.length > 0 && (
            <View style={styles.sectionWrapper}>
              <Text style={[styles.sectionTitle, { color: TH.text }]}>
                {T('vowProgressPlanDone')}
              </Text>
              {planProgress.map(p => (
                <View key={p.planId} style={styles.habitPlanRow}>
                  <Text style={[styles.bodyText, { color: TH.text }]}>{p.name}</Text>
                  <Text style={styles.completedCount}>
                    +{p.progressDelta}%
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Vision progress */}
          {visionProgressData.length > 0 && (
            <View>
              <Text style={[styles.sectionTitle, { color: TH.text }]}>
                {T('vowProgress')}
              </Text>
              {visionProgressData.map(v => {
                const vision = progress.visionProgress.find(vp => vp.vision.id === v.visionId)?.vision;
                return (
                  <View key={v.visionId} style={styles.habitPlanRow}>
                    <Text style={[styles.bodyText, { color: TH.text }]} numberOfLines={1}>
                      {vision?.text ?? v.visionId}
                    </Text>
                    <Text style={styles.prevDelta}>
                      {v.before}% → {v.after}%
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Insight input */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, { color: TH.text }]}>
            {T('vowDedInsight')}
          </Text>
          <TextInput
            value={insight}
            onChangeText={setInsight}
            placeholder={T('vowDedInsightPlaceholder')}
            placeholderTextColor={TH.sub}
            multiline
            maxLength={1000}
            style={[styles.insightInput, { backgroundColor: TH.card, color: TH.text, borderColor: TH.border }]}
          />
        </View>

        {/* Adjustment input */}
        <View style={styles.adjustmentSection}>
          <Text style={[styles.inputLabel, { color: TH.text }]}>
            {T('vowDedAdjustment')}
          </Text>
          <TextInput
            value={adjustment}
            onChangeText={setAdjustment}
            placeholder={T('vowDedAdjustmentPlaceholder')}
            placeholderTextColor={TH.sub}
            multiline
            maxLength={1000}
            style={[styles.adjustmentInput, { backgroundColor: TH.card, color: TH.text, borderColor: TH.border }]}
          />
        </View>

        {/* Save button */}
        <TouchableOpacity
          onPress={handleSave}
          style={styles.saveButton}
        >
          <Save size={18} color="#fff" />
          <Text style={styles.saveButtonText}>
            {T('vowDedSave')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: FONT_STAT_CARD,
    fontWeight: '800',
  },
  gradientCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  gradientPadding: {
    padding: 16,
  },
  gradientSub: {
    fontSize: FONT_SUB,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  gradientTitle: {
    fontSize: FONT_TITLE,
    fontWeight: '700',
    color: '#fff',
  },
  summaryCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: FONT_SUB,
    fontWeight: '700',
  },
  autoHint: {
    fontSize: FONT_BADGE,
    marginBottom: 12,
  },
  sectionWrapper: {
    marginBottom: 12,
  },
  habitPlanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  bodyText: {
    fontSize: FONT_BODY,
  },
  practiceDays: {
    fontSize: FONT_BODY,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  statCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionTitle: {
    fontSize: FONT_BADGE,
    fontWeight: '600',
    marginBottom: 6,
  },
  completedCount: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    color: '#10B981',
  },
  prevDelta: {
    fontSize: FONT_BADGE,
    color: '#F59E0B',
  },
  inputSection: {
    marginBottom: 16,
  },
  adjustmentSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: FONT_SUB,
    fontWeight: '600',
    marginBottom: 8,
  },
  insightInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: FONT_BODY,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
  },
  adjustmentInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: FONT_BODY,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    padding: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: FONT_BODY,
    fontWeight: '700',
  },
});
