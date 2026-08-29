import { FONT_BODY, FONT_SMALL, type BodyFlowPersistedState } from '@egoless-do/core';
import React from 'react';
import { Text, View } from 'react-native';

interface TodayExercise {
  icon: string;
  nameZh: string;
  defaultSets?: number;
  defaultReps?: number;
}

interface StepProps {
  T: (key: string) => string;
  flowState: BodyFlowPersistedState | null;
}

interface Step1Props extends StepProps {
  todayPlanDisplay: { icon: string; label: string; note?: string } | null;
  todayExercises: TodayExercise[] | undefined;
}

/** Step 1: 调身练习 — extracted from FlowSteps as an independent function
 *  so its `flowState?.X` branches count toward THIS function's complexity. */
function Step1({ T, flowState, todayPlanDisplay, todayExercises }: Step1Props) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: flowState?.exerciseCompleted ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 14 }}>{flowState?.exerciseCompleted ? '✅' : '🏃'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#fff' }} numberOfLines={1}>{T('bodyFlowPractice')}{todayPlanDisplay ? ` · ${todayPlanDisplay.label}` : ''}</Text>
          {flowState?.exerciseCompleted && (
            <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.7)' }}>
              {flowState?.totalDurationSec ? `${Math.floor(flowState.totalDurationSec / 60)}:${String(flowState.totalDurationSec % 60).padStart(2, '0')}` : T('bodyFlowDone')}
            </Text>
          )}
        </View>
        {todayExercises && todayExercises.length > 0 && (
          <View style={{ marginTop: 4 }}>
            {todayExercises.slice(0, 5).map((e, i) => (
              <Text key={i} style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.8)', lineHeight: 16 }}>
                {e.icon} {e.nameZh}{e.defaultSets && e.defaultReps ? `  ${e.defaultSets}组×${e.defaultReps}次` : ''}
              </Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

/** Step 2: 调息安神 — extracted from FlowSteps as an independent function
 *  so its `flowState?.X` branches count toward THIS function's complexity. */
function Step2({ T, flowState }: StepProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: flowState?.breathingCompleted ? 'rgba(255,255,255,0.3)' : !flowState?.exerciseCompleted ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 14 }}>{flowState?.breathingCompleted ? '✅' : flowState?.exerciseCompleted ? '🌬️' : '○'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: flowState?.exerciseCompleted ? '#fff' : 'rgba(255,255,255,0.5)' }}>{T('bodyFlowBreathing')}</Text>
        {flowState?.breathingCompleted && (
          <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
            {String(Math.floor((flowState?.breathingDurationMs ?? 0) / 60000))}{T('bodyMin')}
          </Text>
        )}
        {!flowState?.breathingCompleted && flowState?.exerciseCompleted && (
          <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{T('bodyFlowBreathingHint')}</Text>
        )}
      </View>
    </View>
  );
}

/** Step 3: 记录感受 — extracted from FlowSteps as an independent function
 *  so its `flowState?.X` branches count toward THIS function's complexity. */
function Step3({ T, flowState }: StepProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: flowState?.awarenessCompleted ? 'rgba(255,255,255,0.3)' : flowState?.breathingCompleted ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 14 }}>{flowState?.awarenessCompleted ? '✅' : flowState?.breathingCompleted ? '🧠' : '○'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: flowState?.breathingCompleted ? '#fff' : 'rgba(255,255,255,0.5)' }}>{T('bodyFlowAwareness')}</Text>
        {flowState?.awarenessCompleted && (
          <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{T('bodyFlowDone')}</Text>
        )}
        {!flowState?.awarenessCompleted && flowState?.breathingCompleted && (
          <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{T('bodyFlowAwarenessHint')}</Text>
        )}
      </View>
    </View>
  );
}

export interface FlowStepsProps {
  T: (key: string) => string;
  todayPlanDisplay: { icon: string; label: string; note?: string } | null;
  flowState: BodyFlowPersistedState | null;
  todayExercises: TodayExercise[] | undefined;
}

/**
 * Flow progress steps (3-step tracker) — orchestration layer.
 * Each step is an independent function (Step1/Step2/Step3) whose
 * `flowState?.X ? ... : ...` nested ternaries count toward THAT function's
 * complexity, not this parent's.
 */
export function FlowSteps({ T, todayPlanDisplay, flowState, todayExercises }: FlowStepsProps) {
  return (
    <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 12, marginBottom: 10, gap: 8 }}>
      <Step1 T={T} flowState={flowState} todayPlanDisplay={todayPlanDisplay} todayExercises={todayExercises} />
      {/* Separator */}
      <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginLeft: 38 }} />
      <Step2 T={T} flowState={flowState} />
      {/* Separator */}
      <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginLeft: 38 }} />
      <Step3 T={T} flowState={flowState} />
    </View>
  );
}
