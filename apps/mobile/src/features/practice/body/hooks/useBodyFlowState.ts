// ─── useBodyFlowState — BodyFlow 会话状态管理 ─────────────────
// 管理 BodyFlow 的三步流程状态，支持跨会话进度恢复。
// 状态持久化到 store，24 小时未更新自动过期。

import { type BodyCheckin, BODY_FLOW_EXPIRY_MS } from '@egoless-do/core';
import { useCallback, useEffect } from 'react';

import { useShallowStore } from '../../../../store/useAppStore';

export interface FlowState {
  step: 'practice' | 'breathing' | 'checkin' | 'success' | null;
  selectedSportKey: string;
  practiceCompleted: boolean;
  practiceDurationSec: number;
  breathingCompleted: boolean;
  breathingDurationMs: number;
  awarenessData: BodyCheckin | null;
  activePlanId: string | null;
  startedAt: number;
}

export function useBodyFlowState() {
  const {
    bodyFlowState,
    setBodyFlowState,
    resetBodyFlowState,
  } = useShallowStore(s => ({
    bodyFlowState: s.bodyFlowState,
    setBodyFlowState: s.setBodyFlowState,
    resetBodyFlowState: s.resetBodyFlowState,
  }));

  // Auto-expire after 24h
  useEffect(() => {
    if (bodyFlowState && Date.now() - bodyFlowState.updatedAt > BODY_FLOW_EXPIRY_MS) {
      resetBodyFlowState();
    }
  }, [bodyFlowState, resetBodyFlowState]);

  const setStep = useCallback((step: FlowState['step']) => {
    setBodyFlowState({ step });
  }, [setBodyFlowState]);

  const startFlow = useCallback((planId?: string) => {
    setBodyFlowState({
      step: 'practice',
      activePlanId: planId ?? null,
      startedAt: Date.now(),
    });
  }, [setBodyFlowState]);

  const markPracticeDone = useCallback((durationSec: number) => {
    setBodyFlowState({
      practiceCompleted: true,
      practiceDurationSec: durationSec,
    });
  }, [setBodyFlowState]);

  const markBreathingDone = useCallback((durationMs: number) => {
    setBodyFlowState({
      breathingCompleted: true,
      breathingDurationMs: durationMs,
    });
  }, [setBodyFlowState]);

  const saveAwareness = useCallback((data: BodyCheckin | null) => {
    setBodyFlowState({
      awarenessData: data,
      step: 'success',
    });
  }, [setBodyFlowState]);

  const setSelectedSport = useCallback((sportKey: string) => {
    setBodyFlowState({ selectedSportKey: sportKey });
  }, [setBodyFlowState]);

  const resetFlow = useCallback(() => {
    resetBodyFlowState();
  }, [resetBodyFlowState]);

  return {
    flowState: bodyFlowState,
    setStep,
    startFlow,
    markPracticeDone,
    markBreathingDone,
    saveAwareness,
    setSelectedSport,
    resetFlow,
  };
}