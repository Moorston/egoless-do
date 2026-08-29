import { type BodyTrainingPlan, type ExerciseDef, FONT_BODY, FONT_LABEL, FONT_SMALL } from '@egoless-do/core';
import { Dumbbell } from 'lucide-react-native';
import React from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';

import { styles } from '../BodyDashboardStyles';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface PlanProgress {
  weekComplete: number;
  weekTotal: number;
  totalDuration: number;
  totalCal: number;
}

export interface PlanCardProps {
  T: (key: string) => string;
  TH: { text: string; sub: string; card: string; border: string; bg: string };
  activeTrainingPlan: BodyTrainingPlan | undefined;
  planProgress: PlanProgress | null;
  onEdit: () => void;
}

/**
 * Card: 我的训练计划
 *
 * Extracted from BodyDashboard via move-only JSX extraction (L294-377).
 * The `activeTrainingPlan ? ... : ...` ternary, the `planProgress &&` guard,
 * and the inline progress-bar ternary count toward THIS component's
 * complexity. The `.map(task => {...})` callback and its nested `formatEx`
 * function have their own complexity budget and do NOT count toward the parent.
 */
// eslint-disable-next-line max-lines-per-function
export function PlanCard({ T, TH, activeTrainingPlan, planProgress, onEdit }: PlanCardProps) {
  if (!activeTrainingPlan) {
    return (
      <TouchableOpacity
        onPress={onEdit}
        activeOpacity={0.85}
        style={[styles.planCard, { backgroundColor: TH.card }]}
      >
        <View style={styles.planHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.planIconCircle, { backgroundColor: '#f59e0b' }]}>
              <Dumbbell size={18} color="#fff" />
            </View>
            <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text }}>{T('bodyPlanManagement')}</Text>
          </View>
          <Text style={{ fontSize: FONT_SMALL(), color: '#f59e0b' }}>{T('bodyPlanCreate')}</Text>
        </View>
        <View style={styles.planEmpty}>
          <Text style={{ fontSize: FONT_BODY(), color: TH.sub }}>{T('bodyPlanNotSet')}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onEdit}
      activeOpacity={0.85}
      style={[styles.planCard, { backgroundColor: TH.card }]}
    >
      <View style={styles.planHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.planIconCircle, { backgroundColor: '#f59e0b' }]}>
            <Dumbbell size={18} color="#fff" />
          </View>
          <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text }}>{T('bodyPlanManagement')}</Text>
        </View>
        <Text style={{ fontSize: FONT_SMALL(), color: '#f59e0b' }}>{T('bodyPlanEdit')}</Text>
      </View>
      <View style={styles.planContent}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: TH.text }}>{activeTrainingPlan.name}</Text>
          <View style={[styles.planBadge, { backgroundColor: '#10b98115' }]}>
            <Text style={{ fontSize: FONT_SMALL(), color: '#10b981', fontWeight: '600' }}>{T('bodyPlanActive')}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
          <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{activeTrainingPlan.startDate} ~ {activeTrainingPlan.endDate}</Text>
          <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{String(activeTrainingPlan.tasks.filter(t => t.sportKey && t.sportKey !== 'rest').length)}天/周</Text>
        </View>
        {planProgress && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T('bodyProgress')}</Text>
              <Text style={{ fontSize: FONT_SMALL(), color: TH.text, fontWeight: '600' }}>{String(planProgress.weekComplete)}/{String(planProgress.weekTotal)}</Text>
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: TH.border, height: 6 }]}>
              <View style={[styles.progressBarFill, { backgroundColor: '#f59e0b', height: 6, width: `${planProgress.weekTotal > 0 ? (planProgress.weekComplete / planProgress.weekTotal) * 100 : 0}%` }]} />
            </View>
          </View>
        )}
        {/* 周计划任务 */}
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: TH.border }}>
          <Text style={{ fontSize: FONT_LABEL(), color: TH.sub, marginBottom: 10 }}>{T('bodyWeeklyPlan')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {activeTrainingPlan.tasks.map((task) => {
              const exercises = task.exercises ?? [];
              const isRest = !task.sportKey || task.sportKey === 'rest';
              const weekdayKeys = ['bodyWeekMon', 'bodyWeekTue', 'bodyWeekWed', 'bodyWeekThu', 'bodyWeekFri', 'bodyWeekSat', 'bodyWeekSun'];
              const formatEx = (e: ExerciseDef) => {
                const sets = e.defaultSets;
                const reps = e.defaultReps;
                const dur = e.defaultDurationSec;
                if (sets && reps) return `${sets}×${reps}`;
                if (sets) return `${sets}组`;
                if (dur) return `${Math.round(dur / 60)}分钟`;
                return '';
              };
              return (
                <View key={task.weekday} style={{ width: (SCREEN_WIDTH - 56) / 4, minWidth: 72, borderRadius: 10, borderWidth: 1, borderColor: isRest ? TH.border : '#f59e0b30', backgroundColor: isRest ? TH.bg : '#f59e0b08', padding: 8 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: isRest ? TH.border : '#f59e0b', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                    <Text style={{ fontSize: 10, color: isRest ? TH.sub : '#fff', fontWeight: '700' }}>{T(weekdayKeys[task.weekday - 1])}</Text>
                  </View>
                  {isRest ? (
                    <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, fontStyle: 'italic' }}>{T('bodyPlanRestDay')}</Text>
                  ) : exercises.length > 0 ? (
                    exercises.map((e, i) => (
                      <Text key={i} style={{ fontSize: 11, color: TH.text, lineHeight: 16 }}>
                        <Text style={{ fontWeight: '600' }}>{e.nameZh}</Text>
                        {formatEx(e) ? <Text style={{ color: TH.sub }}> {formatEx(e)}</Text> : null}
                      </Text>
                    ))
                  ) : (
                    <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>—</Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
