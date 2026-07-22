// ─── ExerciseProgressBanner ─────────────────────────────────────
// 顶部进度条：显示今日训练各步骤进度

import { FONT_BODY, FONT_SMALL, FONT_SUB, type Theme } from '@egoless-do/core';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export type StepStatus = 'pending' | 'completed' | 'skipped';

export interface Step {
  key: string;
  label: string;
  status: StepStatus;
}

interface Props {
  steps: Step[];
  TH: Theme;
  T: (key: string) => string;
  readOnly?: boolean;
  onStartStep?: (key: string) => void;
  onSkipStep?: (key: string) => void;
}

export default function ExerciseProgressBanner({ steps, TH, T, readOnly = false, onStartStep, onSkipStep }: Props) {
  return (
    <View style={[styles.container, { backgroundColor: TH.card, borderColor: TH.border }]}>
      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {steps.map((step, i) => (
          <React.Fragment key={step.key}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor:
                    step.status === 'completed' ? '#10b981'
                    : step.status === 'skipped' ? '#f59e0b'
                    : `${TH.sub}40`,
                },
              ]}
            />
            {i < steps.length - 1 && (
              <View
                style={[
                  styles.dotLine,
                  {
                    backgroundColor: step.status === 'completed' ? '#10b981' : `${TH.sub}20`,
                  },
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Step details */}
      <View style={styles.stepsRow}>
        {steps.map(step => (
          <View key={step.key} style={styles.stepItem}>
            <Text style={[styles.stepLabel, { color: step.status === 'completed' ? '#10b981' : step.status === 'skipped' ? '#f59e0b' : TH.text }]}>
              {step.label}
            </Text>
            {step.status === 'pending' && !readOnly && (
              <View style={styles.stepActions}>
                <TouchableOpacity onPress={() => onStartStep?.(step.key)} style={[styles.stepBtn, { backgroundColor: `${TH.primary}15` }]}>
                  <Text style={[styles.stepBtnText, { color: TH.primary }]}>{T('bodyStart') || '开始'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onSkipStep?.(step.key)} style={styles.skipBtn}>
                  <Text style={[styles.skipText, { color: TH.sub }]}>{T('bodyFlowSkip') || '跳过'}</Text>
                </TouchableOpacity>
              </View>
            )}
            {step.status === 'pending' && readOnly && (
              <Text style={[styles.statusText, { color: TH.sub }]}>···</Text>
            )}
            {step.status === 'completed' && (
              <Text style={[styles.statusText, { color: '#10b981' }]}>✅</Text>
            )}
            {step.status === 'skipped' && !readOnly && (
              <TouchableOpacity onPress={() => onStartStep?.(step.key)}>
                <Text style={[styles.statusText, { color: '#f59e0b' }]}>⏭️ {T('bodyRedo') || '重做'}</Text>
              </TouchableOpacity>
            )}
            {step.status === 'skipped' && readOnly && (
              <Text style={[styles.statusText, { color: '#f59e0b' }]}>⏭️</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotLine: {
    width: 20,
    height: 2,
    borderRadius: 1,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepLabel: {
    fontSize: FONT_SMALL(),
    fontWeight: '600',
    marginBottom: 4,
  },
  stepActions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  stepBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stepBtnText: {
    fontSize: 10,
    fontWeight: '600',
  },
  skipBtn: {
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  skipText: {
    fontSize: 10,
  },
  statusText: {
    fontSize: FONT_SMALL(),
    marginTop: 2,
  },
});