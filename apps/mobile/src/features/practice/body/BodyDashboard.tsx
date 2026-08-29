import { dateStr, type BodyGoal, FONT_BODY, FONT_SMALL, FONT_TITLE, type ExerciseDef } from '@egoless-do/core';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, Modal } from 'react-native';

import { useT, useTheme } from '../../../components/UI';
import { useRootNavigation } from '../../../navigation/hooks';
import { useShallowStore } from '../../../store/useAppStore';

import { styles } from './BodyDashboardStyles';
import { BodyAwarenessBanner } from './banners/BodyAwarenessBanner';
import { BodyProfileBanner } from './banners/BodyProfileBanner';
import { GoalCard } from './banners/GoalCard';
import { PlanCard } from './banners/PlanCard';
import { ProgressCard } from './banners/ProgressCard';
import { RecentExercisesCard } from './banners/RecentExercisesCard';
import { TodayPlanBanner } from './banners/TodayPlanBanner';
import { WeightTrendBanner } from './banners/WeightTrendBanner';
import { useBodyDashboardData } from './hooks/useBodyDashboardData';
import { useBodyFlowState } from './hooks/useBodyFlowState';
import { useBodyOverrides } from './hooks/useBodyOverrides';
import AdjustExerciseModal from './modals/AdjustExerciseModal';
import AssessmentModal from './modals/AssessmentModal';
import BodyCheckinModal from './modals/BodyCheckinModal';
import DayActionSheet from './modals/DayActionSheet';
import GoalEditLightModal from './modals/GoalEditLightModal';
import GoalEditModal from './modals/GoalEditModal';
import QuickSwapModal from './modals/QuickSwapModal';
import WeightRecordModal from './modals/WeightRecordModal';
import WeightTrendModal from './modals/WeightTrendModal';
import CelebrationOverlay from './screens/CelebrationOverlay';

const SCREEN_WIDTH = Dimensions.get('window').width;
export const BANNER_WIDTH = SCREEN_WIDTH - 32; // 16px padding on each side

interface DashboardProps {
  onFlowStart?: () => void;
  onFlowStartWithPlan?: (planId: string) => void;
  onGoToSport?: (sportKey: string, exercises?: ExerciseDef[]) => void;
  onGoToBreathing?: () => void;
}

// BodyDashboard 为多步骤/多弹窗综合体能页，拆分子组件后为编排层
// eslint-disable-next-line max-lines-per-function
export default function BodyDashboard({ onFlowStart, onFlowStartWithPlan, onGoToSport: _onGoToSport, onGoToBreathing: _onGoToBreathing }: DashboardProps) {
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();

  // ── 聚合数据 hook（12 useMemo + 2 useEffect + selectedDay 派生）──
  const {
    profile,
    activeGoal,
    activeTrainingPlan,
    celebrationData,
    recentPlanId,
    planProgress,
    recentExercises,
    latestCheckin,
    weightTrend,
    checkinHistory,
    todayPlanDisplay,
    selectedDay,
    selectedDayIsRest,
    selectedDayDate,
    selectedDayOverride,
    todayPlan,
    todayOverride,
    hasOverride,
    todayExercises,
    todayDateStr,
  } = useBodyDashboardData();

  const [showAssessment, setShowAssessment] = useState(false);
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showWeightRecord, setShowWeightRecord] = useState(false);
  const [showWeightTrend, setShowWeightTrend] = useState(false);
  const [showQuickSwap, setShowQuickSwap] = useState(false);
  const [showAdjustExercise, setShowAdjustExercise] = useState(false);
  const [showDayAction, setShowDayAction] = useState(false);
  const [showGoalEditLight, setShowGoalEditLight] = useState(false);
  const [showDaySwapPicker, setShowDaySwapPicker] = useState(false);

  // Banner carousel state (no auto-rotate, user manual swipe)
  const [currentBanner, setCurrentBanner] = useState(0);
  const bannerScrollRef = useRef<ScrollView>(null);

  // ── 庆祝 overlay 展示控制（useEffect 保留在主组件，控制本地 state）──
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebratedPlanId, setCelebratedPlanId] = useState<string | null>(null);

  useEffect(() => {
    if (celebrationData && recentPlanId && recentPlanId !== celebratedPlanId) {
      setCelebratedPlanId(recentPlanId);
      setShowCelebration(true);
    }
  }, [celebrationData, recentPlanId, celebratedPlanId]);

  // ── 5 个 handleSave（保留主组件，直接消费 store actions）──
  const { updateUserProfile, updateBodyGoal, addBodyGoal, upsertBodyCheckin, addWeight } = useShallowStore(s => ({
    updateUserProfile: s.updateUserProfile,
    updateBodyGoal: s.updateBodyGoal,
    addBodyGoal: s.addBodyGoal,
    upsertBodyCheckin: s.upsertBodyCheckin,
    addWeight: s.addWeight,
  }));

  const handleSaveAssessment = useCallback((text: string, tags: string[]) => {
    updateUserProfile({ selfAssessment: text, bodyTags: tags });
  }, [updateUserProfile]);

  // Convert snake_case strategy to camelCase for i18n key
  const getStrategyLabel = useCallback((strategy: string) => {
    // 'lose_fat' -> 'LoseFat' -> 'bodyStrategyLoseFat'
    const camelCase = strategy.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
    return T(`bodyStrategy${camelCase}` as never) || strategy;
  }, [T]);

  const handleSaveGoal = useCallback((data: Partial<BodyGoal>) => {
    if (activeGoal) {
      updateBodyGoal(activeGoal.id, data);
    } else {
      addBodyGoal(data);
    }
  }, [activeGoal, updateBodyGoal, addBodyGoal]);

  const handleSaveCheckin = useCallback((data: { date: string; energy: number; pain: number; comfort: number; sleep: number; tags: string[]; note?: string }) => {
    upsertBodyCheckin(data);
  }, [upsertBodyCheckin]);

  const handleSaveWeight = useCallback((data: { date: string; weight: number; bodyFat?: number }) => {
    addWeight(data);
  }, [addWeight]);

  // ── 8 个 override 处理器（聚合 hook）──
  const {
    handleUndoOverride,
    handleSwapConfirm,
    handleAdjustConfirm,
    handleDaySkip,
    handleDaySwapConfirm,
    handleSaveGoalLight,
  } = useBodyOverrides({
    todayDateStr,
    activeTrainingPlan,
    selectedDay,
    selectedDayDate,
    setShowDaySwapPicker,
    setShowDayAction,
  });

  // ── Workout flow state tracking ──
  const { flowState } = useBodyFlowState();
  const setBodyFlowState = useShallowStore(s => s.setBodyFlowState);
  const hasActiveFlow = Boolean(flowState && flowState.startedAt && (Date.now() - flowState.startedAt < 24 * 60 * 60 * 1000));
  const allFlowDone = Boolean(hasActiveFlow && flowState!.exerciseCompleted && flowState!.breathingCompleted && flowState!.awarenessCompleted);

  // 凌晨重置：flowState 的日期不是今天时重置（只在挂载时检查一次）
  useEffect(() => {
    if (flowState?.startedAt) {
      const todayDate = dateStr();
      const flowDate = dateStr(new Date(flowState.startedAt));
      if (flowDate !== todayDate) {
        setBodyFlowState({ exerciseCompleted: false, breathingCompleted: false, awarenessCompleted: false, practiceCompleted: false, startedAt: Date.now() });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在挂载时检查


  return (
    <View>
      {/* ── Banner Carousel ── */}
      <View style={styles.bannerContainer}>
        <ScrollView
          ref={bannerScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / BANNER_WIDTH);
            setCurrentBanner(index);
          }}
          style={{ width: BANNER_WIDTH }}
        >
          {/* Banner 1: 今日方案 */}
          <TodayPlanBanner
            T={T}
            onNavigateHistory={() => nav.navigate('ExerciseHistory' as never)}
            hasOverride={hasOverride}
            todayOverride={todayOverride}
            todayPlanDisplay={todayPlanDisplay}
            flowState={flowState}
            allFlowDone={allFlowDone}
            hasActiveFlow={hasActiveFlow}
            todayExercises={todayExercises}
            latestCheckin={latestCheckin}
            onUndoOverride={handleUndoOverride}
            onFlowStart={onFlowStart}
            onFlowStartWithPlan={onFlowStartWithPlan}
            activeTrainingPlanId={activeTrainingPlan?.id}
          />

          {/* Banner 2: 身体档案 */}
          <BodyProfileBanner
            T={T}
            profile={profile}
            onShowAssessment={() => setShowAssessment(true)}
          />

          {/* Banner 3: 身体觉知 */}
          <BodyAwarenessBanner
            T={T}
            onNavigateHistory={() => nav.navigate('BodyCheckinHistory' as never)}
            latestCheckin={latestCheckin}
            onShowCheckin={() => setShowCheckin(true)}
          />

          {/* Banner 4: 体重趋势 */}
          <WeightTrendBanner
            T={T}
            weightTrend={weightTrend}
            checkinHistory={checkinHistory}
            onShowWeightRecord={() => setShowWeightRecord(true)}
            onShowWeightTrend={() => setShowWeightTrend(true)}
          />
        </ScrollView>

        {/* Banner indicators */}
        <View style={styles.bannerIndicators}>
          {[0, 1, 2, 3].map(i => (
            <View
              key={i}
              style={[
                styles.bannerDot,
                { backgroundColor: i === currentBanner ? '#fff' : 'rgba(255,255,255,0.4)' }
              ]}
            />
          ))}
        </View>
        {/* Guide text */}
        <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, textAlign: 'center', marginTop: 6 }}>
          {T('bodySwipeHint')}
        </Text>
      </View>

      {/* ── 调身目标 ── */}
      <GoalCard T={T} TH={TH} activeGoal={activeGoal} getStrategyLabel={getStrategyLabel} onEdit={() => setShowGoalEdit(true)} />

      {/* ── 我的训练计划 ── */}
      <PlanCard T={T} TH={TH} activeTrainingPlan={activeTrainingPlan} planProgress={planProgress} onEdit={() => nav.navigate('PlanManagement' as never)} />

      {/* ── 本周进度 ── */}
      <ProgressCard T={T} TH={TH} planProgress={planProgress} />

      {/* ── 最近训练 ── */}
      <RecentExercisesCard T={T} TH={TH} recentExercises={recentExercises} onNavigateHistory={() => nav.navigate('ExerciseHistory' as never)} />

      <AssessmentModal visible={showAssessment} TH={TH} T={T} profile={profile} onClose={() => setShowAssessment(false)} onSave={handleSaveAssessment} />
      <GoalEditModal visible={showGoalEdit} TH={TH} T={T} goal={activeGoal} profile={profile} onClose={() => setShowGoalEdit(false)} onSave={handleSaveGoal} />
      <BodyCheckinModal visible={showCheckin} TH={TH} T={T} todayPlan={todayPlan} onClose={() => setShowCheckin(false)} onSave={handleSaveCheckin} />
      <WeightRecordModal visible={showWeightRecord} TH={TH} T={T} currentWeight={profile.weight as number | undefined} currentBodyFat={profile.bodyFat as number | undefined} onClose={() => setShowWeightRecord(false)} onSave={handleSaveWeight} />
      <WeightTrendModal visible={showWeightTrend} TH={TH} T={T} checkins={checkinHistory ?? []} onClose={() => setShowWeightTrend(false)} />

      {/* Override modals */}
      <QuickSwapModal visible={showQuickSwap} onClose={() => setShowQuickSwap(false)} onConfirm={handleSwapConfirm} TH={TH} T={T} />
      {todayExercises && (
        <AdjustExerciseModal visible={showAdjustExercise} onClose={() => setShowAdjustExercise(false)} onConfirm={handleAdjustConfirm} exercises={todayExercises} TH={TH} T={T} />
      )}
      <DayActionSheet
        visible={showDayAction}
        onClose={() => setShowDayAction(false)}
        dayLabel={selectedDay ? T(`bodyWeek${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][selectedDay - 1]}`) : ''}
        isRest={selectedDayIsRest}
        hasOverride={!!selectedDayOverride}
        onSwap={() => { setShowDayAction(false); setShowQuickSwap(true); }}
        onSkip={handleDaySkip}
        onSwapDays={() => { setShowDayAction(false); setShowDaySwapPicker(true); }}
        onAdjust={() => { setShowDayAction(false); setShowAdjustExercise(true); }}
        TH={TH} T={T}
      />
      {activeTrainingPlan && (
        <GoalEditLightModal
          visible={showGoalEditLight}
          onClose={() => setShowGoalEditLight(false)}
          onConfirm={handleSaveGoalLight}
          initialStrategy={activeTrainingPlan.strategy}
          initialTargetWeight={activeTrainingPlan.targetWeight}
          initialTargetBodyFat={activeTrainingPlan.targetBodyFat}
          initialGoalNote={activeTrainingPlan.goalNote}
          TH={TH} T={T}
        />
      )}

      {/* Day swap picker modal */}
      <Modal visible={showDaySwapPicker} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24, width: '80%', maxWidth: 320 }}>
            <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text, marginBottom: 16, textAlign: 'center' }}>
              {T('bodySwapDays')}
            </Text>
            {[1,2,3,4,5,6,7].filter(d => d !== selectedDay).map(d => (
              <TouchableOpacity
                key={d}
                onPress={() => handleDaySwapConfirm(d)}
                style={{ paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, marginBottom: 8, backgroundColor: `${TH.primary}15`, borderWidth: 1, borderColor: `${TH.primary}30` }}
              >
                <Text style={{ fontSize: FONT_BODY(), color: TH.text, fontWeight: '600', textAlign: 'center' }}>
                  {T(`bodyWeek${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][d - 1]}`)}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setShowDaySwapPicker(false)}
              style={{ paddingVertical: 12, alignItems: 'center', marginTop: 8 }}
            >
              <Text style={{ fontSize: FONT_BODY(), color: TH.sub }}>{T('commonCancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {celebrationData && (
        <CelebrationOverlay
          visible={showCelebration}
          TH={TH} T={T}
          data={celebrationData}
          onDismiss={() => setShowCelebration(false)}
        />
      )}
    </View>
  );
}
