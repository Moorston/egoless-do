import {FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, FONT_TINY, MS_PER_WEEK , getMoodIcon , scaleFontSize, FONT_STAT_CARD} from '@egoless-do/core';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, ChevronRight, Check, Calendar, Heart, Lightbulb } from 'lucide-react-native';
import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT } from '../../../components/UI';
import { useAppStore, useShallowStore } from '../../../store/useAppStore';


type Step = 'mood' | 'insight' | 'action';

const MOOD_KEYS = ['great', 'good', 'tough', 'hard'] as const;
const MOOD_EMOJIS: Record<(typeof MOOD_KEYS)[number], string> = { great: '😊', good: '🌿', tough: '😰', hard: '😢' };
const MOOD_LABEL_KEYS: Record<(typeof MOOD_KEYS)[number], string> = { great: 'reviewMoodGreat', good: 'reviewMoodOkay', tough: 'reviewMoodTough', hard: 'reviewMoodHard' };

export default function ReviewScreen() {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const { reflections: rawReflections } = useShallowStore(s => ({
    reflections: s.reflections,
  }));
  const nav = useNavigation();

  const [step, setStep] = useState<Step>('mood');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [insight, setInsight] = useState('');
  const [action, setAction] = useState('');

  const reflections = useMemo(() =>
    (rawReflections ?? []).filter(r => !r.deleted),
    [rawReflections]
  );

  const weekReflections = useMemo(() => {
    const weekAgo = Date.now() - MS_PER_WEEK;
    return reflections.filter(r => r.timestamp > weekAgo);
  }, [reflections]);

  const moodStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of weekReflections) {
      if (r.mood) {
        counts[r.mood] = (counts[r.mood] ?? 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([mood, count]) => ({ mood, count }))
      .sort((a, b) => b.count - a.count);
  }, [weekReflections]);

  const handleNext = useCallback(() => {
    if (step === 'mood') setStep('insight');
    else if (step === 'insight') setStep('action');
    else {
      // Save review and go back
      // TODO: Save to store
      nav.goBack();
    }
  }, [step, nav]);

  const handleBack = useCallback(() => {
    if (step === 'insight') setStep('mood');
    else if (step === 'action') setStep('insight');
    else nav.goBack();
  }, [step, nav]);

  const canProceed = useMemo(() => {
    if (step === 'mood') return selectedMood !== null;
    if (step === 'insight') return insight.trim().length > 0;
    if (step === 'action') return action.trim().length > 0;
    return false;
  }, [step, selectedMood, insight, action]);

  const renderMoodStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Calendar size={24} color={P} />
        <Text style={[styles.stepTitle, { color: TH.text }]}>{T('reviewWeekJourney')}</Text>
      </View>

      <Text style={[styles.stepDescription, { color: TH.sub }]}>
        {T('reviewReflectionCount').replace('{count}', String(weekReflections.length))}
      </Text>

      {/* Mood distribution */}
      {moodStats.length > 0 && (
        <View style={[styles.moodDistribution, { backgroundColor: TH.card, borderColor: TH.border }]}>
          <Text style={[styles.moodLabel, { color: TH.sub }]}>{T('reviewMoodDistribution')}</Text>
          <View style={styles.moodRow}>
            {moodStats.map(({ mood, count }) => (
              <Text key={mood} style={styles.moodEmoji}>
                {getMoodIcon(mood)}
              </Text>
            ))}
          </View>
        </View>
      )}

      <Text style={[styles.question, { color: TH.text }]}>{T('reviewMoodQuestion')}</Text>

      <View style={styles.moodOptions}>
        {MOOD_KEYS.map((key) => (
          <TouchableOpacity
            key={key}
            onPress={() => setSelectedMood(key)}
            style={[
              styles.moodOption,
              {
                backgroundColor: selectedMood === key ? `${P}20` : TH.card,
                borderColor: selectedMood === key ? P : TH.border,
              },
            ]}
          >
            <Text style={styles.moodOptionEmoji}>{MOOD_EMOJIS[key]}</Text>
            <Text style={[styles.moodOptionLabel, { color: TH.text }]}>{T(MOOD_LABEL_KEYS[key])}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderInsightStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Heart size={24} color={P} />
        <Text style={[styles.stepTitle, { color: TH.text }]}>{T('reviewKeyShift')}</Text>
      </View>

      <Text style={[styles.stepDescription, { color: TH.sub }]}>
        {T('reviewKeyShiftQuestion')}
      </Text>

      <Text style={[styles.question, { color: TH.text }]}>
        {T('reviewKeyShiftInsight')}
      </Text>

      <TextInput
        value={insight}
        onChangeText={setInsight}
        placeholder={T('reviewEnterReflection')}
        placeholderTextColor={TH.sub}
        multiline
        numberOfLines={4}
        style={[styles.textInput, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
      />
    </View>
  );

  const renderActionStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Lightbulb size={24} color={P} />
        <Text style={[styles.stepTitle, { color: TH.text }]}>{T('reviewCarryForward')}</Text>
      </View>

      <Text style={[styles.stepDescription, { color: TH.sub }]}>
        {T('reviewCarryForwardDesc')}
      </Text>

      <Text style={[styles.question, { color: TH.text }]}>
        {T('reviewCarryForwardQuestion')}
      </Text>

      <TextInput
        value={action}
        onChangeText={setAction}
        placeholder={T('reviewEnterPlan')}
        placeholderTextColor={TH.sub}
        multiline
        numberOfLines={4}
        style={[styles.textInput, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
      />
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color={TH.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: TH.text }]}>{T('reviewThisWeek')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          {(['mood', 'insight', 'action'] as Step[]).map((s, idx) => (
            <View key={s} style={styles.progressItem}>
              <View
                style={[
                  styles.progressDot,
                  {
                    backgroundColor: step === s ? P : idx < ['mood', 'insight', 'action'].indexOf(step) ? P : TH.border,
                  },
                ]}
              >
                {idx < ['mood', 'insight', 'action'].indexOf(step) && (
                  <Check size={12} color="#fff" />
                )}
              </View>
              {idx < 2 && (
                <View
                  style={[
                    styles.progressLine,
                    {
                      backgroundColor: idx < ['mood', 'insight', 'action'].indexOf(step) ? P : TH.border,
                    },
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        {/* Content */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {step === 'mood' && renderMoodStep()}
          {step === 'insight' && renderInsightStep()}
          {step === 'action' && renderActionStep()}
        </ScrollView>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            onPress={handleNext}
            style={[
              styles.actionButton,
              { backgroundColor: canProceed ? P : TH.border },
            ]}
            disabled={!canProceed}
          >
            <Text style={[styles.actionButtonText, { color: canProceed ? '#fff' : TH.sub }]}>
              {step === 'action' ? T('reviewFinish') : T('reviewNextStep')}
            </Text>
            {step !== 'action' && <ChevronRight size={20} color={canProceed ? '#fff' : TH.sub} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_TITLE(),
    fontWeight: '700',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 16,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
  },
  stepContainer: {
    padding: 16,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: FONT_TITLE(),
    fontWeight: '700',
  },
  stepDescription: {
    fontSize: FONT_BODY(),
    marginBottom: 24,
    lineHeight: 22,
  },
  question: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
    marginBottom: 16,
  },
  moodDistribution: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  moodLabel: {
    fontSize: FONT_SMALL(),
    marginBottom: 8,
  },
  moodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  moodEmoji: {
    fontSize: FONT_STAT_CARD(),
  },
  moodOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  moodOption: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  moodOptionEmoji: {
    fontSize: scaleFontSize(32),
  },
  moodOptionLabel: {
    fontSize: FONT_BODY(),
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: FONT_BODY(),
    minHeight: 120,
    textAlignVertical: 'top',
  },
  actionContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
  },
});
