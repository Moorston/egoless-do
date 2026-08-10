// ─── BodyDashboardModals ────────────────────────────────────
// 11 个 Modal 组件集合，从 BodyDashboard.tsx 提取
// 所有数据和回调通过 Props 传入

import {FONT_TITLE, FONT_BODY, type BodyGoal, type BodyTrainingPlan, type BodyPlan, type DayOverride, type ExerciseDef} from '@egoless-do/core';
import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';

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

interface BodyDashboardModalsProps {
  TH: { primary: string; sub: string; bg: string; card: string; cardSolid: string; border: string; text: string };
  T: (key: string, params?: Record<string, string | number>) => string;
  todayPlan?: BodyPlan;
  activeGoal?: BodyGoal;
  activeTrainingPlan?: BodyTrainingPlan;
  profile: Record<string, unknown>;
  todayExercises?: ExerciseDef[];
  selectedDay: number | null;
  selectedDayIsRest: boolean;
  selectedDayOverride: DayOverride | undefined;
  // Visible states
  showAssessment: boolean; showGoalEdit: boolean; showCheckin: boolean;
  showWeightRecord: boolean; showWeightTrend: boolean; showQuickSwap: boolean;
  showAdjustExercise: boolean; showDayAction: boolean; showGoalEditLight: boolean;
  showDaySwapPicker: boolean; showCelebration: boolean;
  // Close handlers
  onCloseAssessment: () => void; onCloseGoalEdit: () => void;
  onCloseCheckin: () => void; onCloseWeightRecord: () => void;
  onCloseWeightTrend: () => void; onCloseQuickSwap: () => void;
  onCloseAdjustExercise: () => void; onCloseDayAction: () => void;
  onCloseGoalEditLight: () => void; onCloseDaySwapPicker: () => void;
  onCloseCelebration: () => void;
  // Save handlers
  onSaveAssessment: (text: string, tags: string[]) => void;
  onSaveGoal: (data: Partial<BodyGoal>) => void;
  onSaveCheckin: (data: { date: string; energy: number; pain: number; comfort: number; sleep: number; tags: string[]; note?: string }) => void;
  onSaveWeight: (data: { date: string; weight: number; bodyFat?: number }) => void;
  onSwapConfirm: (sportKey: string, exercises?: ExerciseDef[]) => void;
  onAdjustConfirm: (adjustments: { exerciseId: string; sets: number; reps: number; durationSec?: number }[]) => void;
  onDaySkip: () => void;
  onOpenQuickSwap: () => void;
  onOpenDaySwapPicker: () => void;
  onOpenAdjustExercise: () => void;
  onDaySwapConfirm: (targetDay: number) => void;
  onSaveGoalLight: (data: { strategy?: string; targetWeight?: number; targetBodyFat?: number; goalNote?: string }) => void;
  // Other
  checkinHistory?: { deleted?: boolean; weight?: number; date: string }[];
  celebrationData: { planName: string; totalDays: number; completedDays: number; totalDurationMin: number; totalCalories: number } | null;
}

export default function BodyDashboardModals({
  TH, T, todayPlan, activeGoal, activeTrainingPlan, profile, todayExercises,
  selectedDay, selectedDayIsRest, selectedDayOverride,
  showAssessment, showGoalEdit, showCheckin, showWeightRecord, showWeightTrend,
  showQuickSwap, showAdjustExercise, showDayAction, showGoalEditLight,
  showDaySwapPicker, showCelebration,
  onCloseAssessment, onCloseGoalEdit, onCloseCheckin, onCloseWeightRecord,
  onCloseWeightTrend, onCloseQuickSwap, onCloseAdjustExercise, onCloseDayAction,
  onCloseGoalEditLight, onCloseDaySwapPicker, onCloseCelebration,
  onSaveAssessment, onSaveGoal, onSaveCheckin, onSaveWeight,
  onSwapConfirm, onAdjustConfirm, onDaySkip, onOpenQuickSwap, onOpenDaySwapPicker, onOpenAdjustExercise, onDaySwapConfirm,
  onSaveGoalLight,
  checkinHistory, celebrationData,
}: BodyDashboardModalsProps) {
  return (
    <>
      <AssessmentModal visible={showAssessment} TH={TH} T={T} profile={profile} onClose={onCloseAssessment} onSave={onSaveAssessment} />
      <GoalEditModal visible={showGoalEdit} TH={TH} T={T} goal={activeGoal} profile={profile} onClose={onCloseGoalEdit} onSave={onSaveGoal} />
      <BodyCheckinModal visible={showCheckin} TH={TH} T={T} todayPlan={todayPlan} onClose={onCloseCheckin} onSave={onSaveCheckin} />
      <WeightRecordModal visible={showWeightRecord} TH={TH} T={T} currentWeight={profile.weight as number | undefined} currentBodyFat={profile.bodyFat as number | undefined} onClose={onCloseWeightRecord} onSave={onSaveWeight} />
      <WeightTrendModal visible={showWeightTrend} TH={TH} T={T} checkins={checkinHistory ?? []} onClose={onCloseWeightTrend} />

      {/* Override modals */}
      <QuickSwapModal visible={showQuickSwap} onClose={onCloseQuickSwap} onConfirm={onSwapConfirm} TH={TH} T={T} />
      {todayExercises && (
        <AdjustExerciseModal visible={showAdjustExercise} onClose={onCloseAdjustExercise} onConfirm={onAdjustConfirm} exercises={todayExercises} TH={TH} T={T} />
      )}
      <DayActionSheet
        visible={showDayAction}
        onClose={onCloseDayAction}
        dayLabel={selectedDay ? T(`bodyWeek${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][selectedDay - 1]}`) : ''}
        isRest={selectedDayIsRest}
        hasOverride={!!selectedDayOverride}
        onSwap={() => { onCloseDayAction(); onOpenQuickSwap(); }}
        onSkip={onDaySkip}
        onSwapDays={() => { onCloseDayAction(); onOpenDaySwapPicker(); }}
        onAdjust={() => { onCloseDayAction(); onOpenAdjustExercise(); }}
        TH={TH} T={T}
      />
      {activeTrainingPlan && (
        <GoalEditLightModal
          visible={showGoalEditLight}
          onClose={onCloseGoalEditLight}
          onConfirm={onSaveGoalLight}
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
                onPress={() => onDaySwapConfirm(d)}
                style={{ paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, marginBottom: 8, backgroundColor: `${TH.primary}15`, borderWidth: 1, borderColor: `${TH.primary}30` }}
              >
                <Text style={{ fontSize: FONT_BODY(), color: TH.text, fontWeight: '600', textAlign: 'center' }}>
                  {T(`bodyWeek${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][d - 1]}`)}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={onCloseDaySwapPicker}
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
          onDismiss={onCloseCelebration}
        />
      )}
    </>
  );
}