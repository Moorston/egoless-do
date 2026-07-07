import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_STAT_CARD, dateStr } from '@egoless-do/core';
import type { DedicationType } from '@egoless-do/core';
import { LinearGradient } from 'expo-linear-gradient';
import { Save, ArrowLeft } from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
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
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          paddingTop: 8, paddingBottom: 16,
        }}>
          <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
            <ArrowLeft size={20} color={TH.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '800', color: TH.text }}>
            {T('vowDedWrite')}
          </Text>
        </View>

        {/* Period info */}
        <View style={{
          borderRadius: 16, overflow: 'hidden', marginBottom: 16,
        }}>
          <LinearGradient
            colors={['#7C3AED', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 16 }}
          >
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
              {T('vowDedPeriod')}
            </Text>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: '#fff' }}>
              {periodLabel}
            </Text>
          </LinearGradient>
        </View>

        {/* Auto-generated summary */}
        <View style={{
          backgroundColor: TH.card, borderRadius: 16, padding: 16,
          marginBottom: 16, borderWidth: 1, borderColor: TH.border,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Text style={{ fontSize: FONT_SUB, fontWeight: '700', color: TH.text }}>
              {T('vowDedSummary')}
            </Text>
          </View>
          <Text style={{ fontSize: FONT_BADGE, color: TH.sub, marginBottom: 12 }}>
            {T('vowDedAutoHint')}
          </Text>

          {/* Practice days */}
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: FONT_BODY, color: TH.text }}>{T('vowDedDays')}</Text>
              <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: '#8B5CF6' }}>
                {practiceDays}/{totalDays}
              </Text>
            </View>
            <ProgressBar pct={practicePct} color="#8B5CF6" />
          </View>

          {/* Habit stats */}
          {habitStats.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: FONT_BADGE, fontWeight: '600', color: TH.text, marginBottom: 6 }}>
                {T('vowProgressHabitDone')}
              </Text>
              {habitStats.map(h => (
                <View key={h.habitId} style={{
                  flexDirection: 'row', justifyContent: 'space-between',
                  paddingVertical: 4,
                }}>
                  <Text style={{ fontSize: FONT_BODY, color: TH.text }}>{h.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: '#10B981' }}>
                      {h.completed}/{h.total}
                    </Text>
                    {h.prevCompleted !== undefined && h.completed > h.prevCompleted && (
                      <Text style={{ fontSize: FONT_BADGE, color: '#F59E0B' }}>
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
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: FONT_BADGE, fontWeight: '600', color: TH.text, marginBottom: 6 }}>
                {T('vowProgressPlanDone')}
              </Text>
              {planProgress.map(p => (
                <View key={p.planId} style={{
                  flexDirection: 'row', justifyContent: 'space-between',
                  paddingVertical: 4,
                }}>
                  <Text style={{ fontSize: FONT_BODY, color: TH.text }}>{p.name}</Text>
                  <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: '#10B981' }}>
                    +{p.progressDelta}%
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Vision progress */}
          {visionProgressData.length > 0 && (
            <View>
              <Text style={{ fontSize: FONT_BADGE, fontWeight: '600', color: TH.text, marginBottom: 6 }}>
                {T('vowProgress')}
              </Text>
              {visionProgressData.map(v => {
                const vision = progress.visionProgress.find(vp => vp.vision.id === v.visionId)?.vision;
                return (
                  <View key={v.visionId} style={{
                    flexDirection: 'row', justifyContent: 'space-between',
                    paddingVertical: 4,
                  }}>
                    <Text style={{ fontSize: FONT_BODY, color: TH.text }} numberOfLines={1}>
                      {vision?.text ?? v.visionId}
                    </Text>
                    <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: '#F59E0B' }}>
                      {v.before}% → {v.after}%
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Insight input */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.text, marginBottom: 8 }}>
            {T('vowDedInsight')}
          </Text>
          <TextInput
            value={insight}
            onChangeText={setInsight}
            placeholder={T('vowDedInsightPlaceholder')}
            placeholderTextColor={TH.sub}
            multiline
            maxLength={1000}
            style={{
              backgroundColor: TH.card, borderRadius: 12, padding: 14,
              color: TH.text, fontSize: FONT_BODY,
              minHeight: 100, textAlignVertical: 'top',
              borderWidth: 1, borderColor: TH.border,
            }}
          />
        </View>

        {/* Adjustment input */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.text, marginBottom: 8 }}>
            {T('vowDedAdjustment')}
          </Text>
          <TextInput
            value={adjustment}
            onChangeText={setAdjustment}
            placeholder={T('vowDedAdjustmentPlaceholder')}
            placeholderTextColor={TH.sub}
            multiline
            maxLength={1000}
            style={{
              backgroundColor: TH.card, borderRadius: 12, padding: 14,
              color: TH.text, fontSize: FONT_BODY,
              minHeight: 80, textAlignVertical: 'top',
              borderWidth: 1, borderColor: TH.border,
            }}
          />
        </View>

        {/* Save button */}
        <TouchableOpacity
          onPress={handleSave}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            backgroundColor: '#8B5CF6', borderRadius: 14, padding: 16,
          }}
        >
          <Save size={18} color="#fff" />
          <Text style={{ color: '#fff', fontSize: FONT_BODY, fontWeight: '700' }}>
            {T('vowDedSave')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
