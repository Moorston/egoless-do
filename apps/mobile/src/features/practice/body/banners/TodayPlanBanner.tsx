import { FONT_SMALL, FONT_STAT_CARD, FONT_TITLE, type BodyFlowPersistedState } from '@egoless-do/core';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { styles } from '../BodyDashboardStyles';

import { FlowProgress } from './FlowProgress';
import { FlowStartButtons } from './FlowStartButtons';
import { OverrideStatusBar } from './OverrideStatusBar';

interface LatestCheckin {
  energy: number;
  pain: number;
  comfort: number;
  date: string;
  tags?: string[];
  note?: string;
}

interface TodayExercise {
  icon: string;
  nameZh: string;
  defaultSets?: number;
  defaultReps?: number;
}

export interface TodayPlanBannerProps {
  T: (key: string) => string;
  onNavigateHistory: () => void;
  hasOverride: boolean;
  todayOverride: { type: string } | undefined;
  todayPlanDisplay: { icon: string; label: string; note?: string } | null;
  flowState: BodyFlowPersistedState | null;
  allFlowDone: boolean;
  hasActiveFlow: boolean;
  todayExercises: TodayExercise[] | undefined;
  latestCheckin: LatestCheckin | undefined;
  onUndoOverride: () => void;
  onFlowStart?: () => void;
  onFlowStartWithPlan?: (planId: string) => void;
  activeTrainingPlanId: string | undefined;
}

/**
 * Banner 1: 今日方案 + Flow 进度（含 override 状态条）
 *
 * Extracted from BodyDashboard via move-only JSX extraction (L352-562).
 * Internal conditional rendering (nested ternaries for override status,
 * Flow progress steps, start/done buttons) is delegated to child components
 * (OverrideStatusBar, FlowProgress, FlowStartButtons) whose internal branches
 * count toward THEIR complexity, not this parent's.
 */
export function TodayPlanBanner({
  T,
  onNavigateHistory,
  hasOverride,
  todayOverride,
  todayPlanDisplay,
  flowState,
  allFlowDone,
  hasActiveFlow,
  todayExercises,
  latestCheckin,
  onUndoOverride,
  onFlowStart,
  onFlowStartWithPlan,
  activeTrainingPlanId,
}: TodayPlanBannerProps) {
  return (
    <View style={[styles.bannerCard, { backgroundColor: '#f59e0b' }]}>
      <View style={styles.bannerHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 20 }}>📋</Text>
          <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: '#fff' }}>{T('bodyTodayPlan')}</Text>
        </View>
        <TouchableOpacity
          onPress={onNavigateHistory}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
        >
          <Text style={{ fontSize: FONT_SMALL(), color: '#fff', fontWeight: '600' }}>{T('exerciseHistory')}</Text>
        </TouchableOpacity>
      </View>
      {/* Override status bar */}
      {hasOverride && todayOverride && (
        <OverrideStatusBar T={T} todayOverride={todayOverride} onUndoOverride={onUndoOverride} />
      )}
      {todayOverride?.type === 'skip' ? (
        /* 跳过状态：显示已跳过 + 撤销，无开始按钮 */
        <View style={styles.bannerContent}>
          <View style={styles.bannerIconCircle}>
            <Text style={{ fontSize: 24 }}>⏭️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: '#fff' }}>{T('bodyOverrideSkip')}</Text>
            <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{T('bodyUndoHint')}</Text>
          </View>
        </View>
      ) : todayPlanDisplay ? (
        <>
          <FlowProgress
            T={T}
            todayPlanDisplay={todayPlanDisplay}
            flowState={flowState}
            allFlowDone={allFlowDone}
            todayExercises={todayExercises}
            onFlowStart={onFlowStart}
            onFlowStartWithPlan={onFlowStartWithPlan}
            activeTrainingPlanId={activeTrainingPlanId}
          />
          <FlowStartButtons
            T={T}
            hasActiveFlow={hasActiveFlow}
            allFlowDone={allFlowDone}
            flowState={flowState}
            onFlowStart={onFlowStart}
            onFlowStartWithPlan={onFlowStartWithPlan}
            activeTrainingPlanId={activeTrainingPlanId}
          />
        </>
      ) : (
        <>
          <View style={styles.bannerContent}>
            <View style={styles.bannerIconCircle}>
              <Text style={{ fontSize: 24 }}>😴</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: '#fff' }}>{T('bodyTodayPlanRest')}</Text>
              <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
                {T('bodyFlowChooseExercise')}
              </Text>
            </View>
          </View>
          {/* Rest day suggestions */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {[
              { icon: '🧘', label: T('bodyPartWalking') },
              { icon: '🧘‍♀️', label: T('bodyPartYoga') },
              { icon: '🌬️', label: T('bodyFlowBreathing') },
            ].map((item, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => { if (activeTrainingPlanId) onFlowStartWithPlan?.(activeTrainingPlanId); else onFlowStart?.(); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
              >
                <Text style={{ fontSize: 14 }}>{item.icon}</Text>
                <Text style={{ fontSize: FONT_SMALL(), color: '#fff' }}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Body awareness quick stats */}
          {latestCheckin && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 8 }}>
              {[
                { label: T('bodyEnergy'), value: latestCheckin.energy, color: '#fff' },
                { label: T('bodyPain'), value: latestCheckin.pain, color: '#fff' },
                { label: T('bodyComfort'), value: latestCheckin.comfort, color: '#fff' },
              ].map((item, i) => (
                <View key={i} style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: item.color }}>{String(item.value)}</Text>
                  <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,0.7)' }}>{item.label}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}
