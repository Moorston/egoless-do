import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_SMALL, FONT_LABEL, type BodyTrainingPlan, EXERCISE_CATEGORIES, type Theme } from '@egoless-do/core';
import { Target, Calendar, Dumbbell, Plus, Play, CheckCircle2 } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const WEEKDAY_KEYS = ['bodyWeekMon', 'bodyWeekTue', 'bodyWeekWed', 'bodyWeekThu', 'bodyWeekFri', 'bodyWeekSat', 'bodyWeekSun'];

interface PlanProgress {
  weekComplete: number;
  weekTotal: number;
  todayDone: boolean;
  totalDuration: number;
  totalCal: number;
}

interface Props {
  TH: Theme;
  T: (key: string) => string;
  plan: BodyTrainingPlan | undefined;
  progress: PlanProgress | null;
  onEdit: () => void;
  onStart: (planId: string) => void;
}

function resolveSport(key: string, T: (k: string) => string) {
  const cat = EXERCISE_CATEGORIES.find(c => c.key === key);
  return cat ? { icon: cat.icon, label: T(cat.i18nKey) } : { icon: '🏋️', label: key };
}

export default function BodyTrainingPlanSection({ TH, T, plan, progress, onEdit, onStart }: Props) {
  const P = '#f59e0b';

  if (!plan) {
    return (
      <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
        <Dumbbell size={36} color={TH.sub} style={{ marginBottom: 12 }} />
        <Text style={{ fontSize: FONT_BODY(), color: TH.sub, marginBottom: 12 }}>{T('bodyPlanNotSet')}</Text>
        <TouchableOpacity onPress={onEdit} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: `${P}20` }}>
          <Plus size={16} color={P} />
          <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: P }}>{T('bodyPlanCreate')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: TH.card, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: TH.border, overflow: 'hidden' }}>
      {/* Header */}
      <View style={{ backgroundColor: P, paddingHorizontal: 16, paddingVertical: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#fff' }}>{plan.name}</Text>
          <TouchableOpacity onPress={onEdit} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(255,255,255,.2)' }}>
            <Text style={{ fontSize: FONT_SMALL(), color: '#fff' }}>{T('bodyPlanEdit')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: FONT_SMALL(), color: 'rgba(255,255,255,.75)', marginTop: 6 }}>
          {plan.startDate} ~ {plan.endDate}
        </Text>
      </View>

      {/* Goal summary */}
      {plan.strategy || plan.targetWeight ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: `${P}08` }}>
          <Target size={14} color={P} />
          <Text style={{ fontSize: FONT_SMALL(), color: TH.text, flex: 1 }} numberOfLines={1}>
            {plan.strategy ? T(BODY_STRATEGY_MAP[plan.strategy] ?? '') : ''}
            {plan.targetWeight ? ` · ${plan.targetWeight}kg` : ''}
            {plan.targetBodyFat ? ` · ${plan.targetBodyFat}%` : ''}
            {plan.goalNote ? ` · ${plan.goalNote}` : ''}
          </Text>
        </View>
      ) : null}

      {/* Tasks */}
      <View style={{ padding: 16 }}>
        {/* Progress bar */}
        {progress && (
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {progress.todayDone ? <CheckCircle2 size={14} color="#10b981" /> : null}
                <Text style={{ fontSize: FONT_SMALL(), color: progress.todayDone ? '#10b981' : TH.sub }}>
                  {progress.todayDone ? T('bodyDayComplete') : T('bodyToday')}
                </Text>
              </View>
              <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>
                {progress.weekComplete}/{progress.weekTotal} · {progress.totalDuration}min · {progress.totalCal}kcal
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: TH.border, borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: 6, borderRadius: 3, width: `${progress.weekTotal > 0 ? (progress.weekComplete / progress.weekTotal) * 100 : 0}%`, backgroundColor: P }} />
            </View>
          </View>
        )}

        {plan.tasks.length > 0 && (
          <>
            <Text style={{ fontSize: FONT_SUB(), fontWeight: '600', color: TH.sub, marginBottom: 8 }}>{T('bodyWeeklyPlan')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {plan.tasks.map(task => {
                const sport = resolveSport(task.sportKey, T);
                const dayLabel = T(WEEKDAY_KEYS[task.weekday - 1]).replace(/周|星期/, '');
                return (
                  <View key={task.weekday} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: `${P}10` }}>
                    <Text style={{ fontSize: FONT_SMALL() }}>{sport.icon}</Text>
                    <Text style={{ fontSize: FONT_SMALL(), color: TH.text }}>{dayLabel}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Start button */}
        <TouchableOpacity onPress={() => onStart(plan.id)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10, backgroundColor: P, marginTop: 12 }}>
          <Play size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BUTTON() }}>{T('bodyStartToday')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const BODY_STRATEGY_MAP: Record<string, string> = {
  lose_fat: 'bodyStrategyLoseFat',
  gain_muscle: 'bodyStrategyGainMuscle',
  tone: 'bodyStrategyTone',
  gain_weight: 'bodyStrategyGainWeight',
  maintain: 'bodyStrategyMaintain',
  posture: 'bodyStrategyPosture',
  recovery: 'bodyStrategyRecovery',
};