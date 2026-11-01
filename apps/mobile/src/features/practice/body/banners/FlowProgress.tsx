import { FONT_BODY, type BodyFlowPersistedState } from '@egoless-do/core';
import { Play } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { styles } from '../BodyDashboardStyles';

import { FlowSteps } from './FlowSteps';

interface TodayExercise {
  icon: string;
  nameZh: string;
  defaultSets?: number;
  defaultReps?: number;
}

export interface FlowProgressProps {
  T: (key: string) => string;
  todayPlanDisplay: { icon: string; label: string; note?: string } | null;
  flowState: BodyFlowPersistedState | null;
  allFlowDone: boolean;
  todayExercises: TodayExercise[] | undefined;
  onFlowStart?: () => void;
  onFlowStartWithPlan?: (planId: string) => void;
  activeTrainingPlanId: string | undefined;
}

/**
 * Flow progress + completion + redo button — extracted from TodayPlanBanner (L108-194).
 * The 3-step tracker is further delegated to FlowSteps; only the `!allFlowDone &&`
 * guard and the `allFlowDone &&` completion block remain here.
 */
export function FlowProgress({
  T,
  todayPlanDisplay,
  flowState,
  allFlowDone,
  todayExercises,
  onFlowStart,
  onFlowStartWithPlan,
  activeTrainingPlanId,
}: FlowProgressProps) {
  return (
    <>
      {/* ── Flow progress — 今日有计划即显示，不管 flowState 状态 ── */}
      {!allFlowDone && (
        <FlowSteps
          T={T}
          todayPlanDisplay={todayPlanDisplay}
          flowState={flowState}
          todayExercises={todayExercises}
        />
      )}
      {allFlowDone && (
        <View>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: 10, marginBottom: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#fff' }}>{'✅ '}{T('bodyTodayComplete')}</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              if (activeTrainingPlanId) {
                onFlowStartWithPlan?.(activeTrainingPlanId);
              } else {
                onFlowStart?.();
              }
            }}
            activeOpacity={0.85}
            style={styles.bannerButton}
          >
            <Play size={20} color="#f59e0b" />
            <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#f59e0b' }}>{T('bodyRedo')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}
