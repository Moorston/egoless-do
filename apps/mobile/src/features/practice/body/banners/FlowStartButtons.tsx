import { FONT_BODY, type BodyFlowPersistedState } from '@egoless-do/core';
import { Play } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';

import { styles } from '../BodyDashboardStyles';

export interface FlowStartButtonsProps {
  T: (key: string) => string;
  hasActiveFlow: boolean;
  allFlowDone: boolean;
  flowState: BodyFlowPersistedState | null;
  onFlowStart?: () => void;
  onFlowStartWithPlan?: (planId: string) => void;
  activeTrainingPlanId: string | undefined;
}

/**
 * Start / continue / redo button group — extracted from TodayPlanBanner (L195-229).
 * The `!hasActiveFlow ? ... : !allFlowDone ? ... : null` branch and the nested
 * `!flowState!.exerciseCompleted ? ... : ... : ...` label ternary count toward
 * THIS component's complexity, not the parent TodayPlanBanner's.
 */
export function FlowStartButtons({
  T,
  hasActiveFlow,
  allFlowDone,
  flowState,
  onFlowStart,
  onFlowStartWithPlan,
  activeTrainingPlanId,
}: FlowStartButtonsProps) {
  return (
    <>
      {!hasActiveFlow ? (
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
          <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#f59e0b' }}>{T('bodyStartToday')}</Text>
        </TouchableOpacity>
      ) : !allFlowDone ? (
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
          <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#f59e0b' }}>
            {!flowState!.exerciseCompleted ? T('bodyStartToday')
              : !flowState!.breathingCompleted ? T('bodyFlowStartBreathing')
              : T('bodyFlowAwareness')}
          </Text>
        </TouchableOpacity>
      ) : null}
    </>
  );
}
