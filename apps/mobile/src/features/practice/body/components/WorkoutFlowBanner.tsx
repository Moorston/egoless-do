// ─── WorkoutFlowBanner ─────────────────────────────────────────
// 分步训练流程 Banner：运动 → 调息 → 觉知

import { FONT_BODY, FONT_SMALL, FONT_SUB, FONT_TITLE, type Theme } from '@egoless-do/core';
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import BodyCheckinInline from '../BodyCheckinInline';
import type { BodyCheckin } from '@egoless-do/core';

type Step = 'exercise' | 'breathing' | 'checkin' | 'done';
type StepStatus = 'pending' | 'completed' | 'skipped';

interface StepState {
  status: StepStatus;
}

interface Props {
  TH: Theme;
  T: (key: string) => string;
  isCombo: boolean;
  exerciseCompleted: boolean;
  breathingCompleted: boolean;
  awarenessCompleted: boolean;
  onStartExercise: () => void;
  onStartBreathing: () => void;
  onSkipStep: (step: string) => void;
  onCheckinComplete: (data: Omit<BodyCheckin, 'id' | 'updatedAt' | 'deleted' | 'synced'>) => void;
}

export default function WorkoutFlowBanner({
  TH, T, isCombo, exerciseCompleted, breathingCompleted, awarenessCompleted,
  onStartExercise, onStartBreathing, onSkipStep, onCheckinComplete,
}: Props) {
  const [showCheckin, setShowCheckin] = useState(false);

  // 计算当前步骤
  const currentStep: Step = exerciseCompleted
    ? (breathingCompleted ? (awarenessCompleted ? 'done' : 'checkin') : 'breathing')
    : 'exercise';

  const steps: { key: Step; label: string; status: StepStatus }[] = [
    { key: 'exercise', label: T('bodyFlowPractice') || '运动', status: exerciseCompleted ? 'completed' : 'pending' },
    { key: 'breathing', label: T('bodyFlowBreathing') || '调息', status: breathingCompleted ? 'completed' : (currentStep === 'breathing' ? 'pending' : 'skipped') },
    { key: 'checkin', label: T('bodyFlowAwareness') || '觉知', status: awarenessCompleted ? 'completed' : (currentStep === 'checkin' ? 'pending' : 'skipped') },
  ];

  if (showCheckin) {
    return (
      <View style={[styles.container, { backgroundColor: '#8b5cf615', borderColor: '#8b5cf630' }]}>
        <Text style={[styles.title, { color: TH.text }]}>{T('bodyFlowAwareness') || '身体觉知'}</Text>
        <BodyCheckinInline
          TH={TH}
          T={T}
          plan={undefined}
          onSave={(data) => {
            setShowCheckin(false);
            onCheckinComplete(data);
          }}
          onSkip={() => {
            setShowCheckin(false);
            onSkipStep('checkin');
          }}
        />
      </View>
    );
  }

  if (currentStep === 'done') {
    return (
      <View style={[styles.container, { backgroundColor: '#10b98115', borderColor: '#10b98130' }]}>
        <Text style={[styles.doneTitle, { color: '#10b981' }]}>{T('bodyTodayComplete') || '✅ 今日完成'}</Text>
        <View style={styles.doneSteps}>
          {steps.map(s => (
            <Text key={s.key} style={styles.doneStep}>
              {s.status === 'completed' ? '✅' : '⏭️'} {s.label}
            </Text>
          ))}
        </View>
      </View>
    );
  }

  const currentStepInfo = steps.find(s => s.key === currentStep)!;

  return (
    <View style={[styles.container, { backgroundColor: `${TH.primary}10`, borderColor: `${TH.primary}30` }]}>
      {/* Progress dots */}
      <View style={styles.progressRow}>
        {steps.map((s, i) => (
          <React.Fragment key={s.key}>
            <View style={[styles.dot, {
              backgroundColor: s.status === 'completed' ? '#10b981' : s.status === 'skipped' ? '#f59e0b' : `${TH.sub}40`,
            }]} />
            {i < steps.length - 1 && <View style={[styles.dotLine, { backgroundColor: `${TH.sub}20` }]} />}
          </React.Fragment>
        ))}
      </View>

      {/* Current step */}
      <Text style={[styles.title, { color: TH.text }]}>
        {currentStep === 'exercise' && (isCombo ? `${T('bodyComboTraining') || '组合训练'} · ${steps.length} ${T('bodyPlanUnitExercise') || '个动作'}` : T('bodyFlowPractice') || '运动')}
        {currentStep === 'breathing' && T('bodyFlowBreathing') || '调息'}
        {currentStep === 'checkin' && T('bodyFlowAwareness') || '觉知'}
      </Text>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => {
          if (currentStep === 'exercise') onStartExercise();
          else if (currentStep === 'breathing') onStartBreathing();
          else if (currentStep === 'checkin') setShowCheckin(true);
        }} style={[styles.startBtn, { backgroundColor: TH.primary }]}>
          <Text style={styles.startBtnText}>{T('bodyStart') || '开始'}</Text>
        </TouchableOpacity>
        {currentStep !== 'exercise' && (
          <TouchableOpacity onPress={() => onSkipStep(currentStep)} style={styles.skipBtn}>
            <Text style={[styles.skipBtnText, { color: TH.sub }]}>{T('bodyFlowSkip') || '跳过'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotLine: {
    width: 24,
    height: 2,
    borderRadius: 1,
  },
  title: {
    fontSize: FONT_TITLE(),
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    alignItems: 'center',
  },
  startBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  startBtnText: {
    color: '#fff',
    fontSize: FONT_BODY(),
    fontWeight: '700',
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  skipBtnText: {
    fontSize: FONT_SMALL(),
  },
  doneTitle: {
    fontSize: FONT_TITLE(),
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  doneSteps: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  doneStep: {
    fontSize: FONT_SMALL(),
  },
});