import { FONT_BODY, FONT_SUB, FONT_BADGE, dateStr, type BodyPlan, type Theme, type ExerciseEntry } from '@egoless-do/core';
import { Check } from 'lucide-react-native';
import React from 'react';
import { View, Text } from 'react-native';

const WEEKDAY_KEYS = ['bodyWeekMon', 'bodyWeekTue', 'bodyWeekWed', 'bodyWeekThu', 'bodyWeekFri', 'bodyWeekSat', 'bodyWeekSun'];
const REST_VALUES = ['休息', 'Rest']; // backward-compatible rest check

interface Props {
  TH: Theme;
  T: (key: string) => string;
  plans: BodyPlan[];
  exerciseLog: ExerciseEntry[];
}

export default function WeeklyExecCard({ TH, T, plans, exerciseLog }: Props) {
  const activePlans = plans.filter(p => !p.deleted);
  const today = new Date();
  const todayDow = today.getDay() === 0 ? 7 : today.getDay(); // 1=Mon, 7=Sun
  const todayStr = dateStr(today);

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - (todayDow - 1));
  const weekStartStr = dateStr(weekStart);

  const weekExercises = (exerciseLog ?? []).filter((e: ExerciseEntry) => {
    if (e.deleted) return false;
    const d = new Date(e.timestamp ?? 0);
    return dateStr(d) >= weekStartStr && dateStr(d) <= todayStr;
  });

  let completedDays = 0;
  let totalPlanned = 0;
  let totalKcal = 0;

  return (
    <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 16 }}>
      <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text, marginBottom: 12 }}>{'📊 ' + T('bodyExec')}</Text>
      {activePlans.length === 0 ? (
        <Text style={{ fontSize: FONT_BODY(), color: TH.sub, textAlign: 'center', paddingVertical: 8 }}>{T('bodyExecNotSet')}</Text>
      ) : (
        <View>
          {WEEKDAY_KEYS.map((dayKey, idx) => {
            const weekday = idx + 1;
            const dayPlan = activePlans.find(p => p.weekday === weekday);
            if (!dayPlan) return null;
            const isPast = weekday <= todayDow;
            const isRest = REST_VALUES.includes(dayPlan.part);
            if (!isRest) totalPlanned++;
            const dayDate = new Date(weekStart);
            dayDate.setDate(dayDate.getDate() + idx);
            const dayStr = dateStr(dayDate);
            const matched = !isRest && weekExercises.some((e: ExerciseEntry) => {
              const eDate = dateStr(new Date(e.timestamp ?? 0));
              return eDate === dayStr && (!dayPlan.sportKey || e.sportKey === dayPlan.sportKey);
            });
            if (matched) {
              completedDays++;
              const dayExercises = weekExercises.filter((e: ExerciseEntry) => dateStr(new Date(e.timestamp ?? 0)) === dayStr);
              totalKcal += dayExercises.reduce((s: number, e: ExerciseEntry) => s + (e.calories ?? 0), 0);
            }
            const dayName = T(dayKey);
            return (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
                <Text style={{ fontSize: FONT_SUB(), color: isPast ? TH.text : TH.sub, width: 40 }}>{dayName}</Text>
                <Text style={{ fontSize: FONT_BODY(), color: isRest ? TH.sub : TH.text, flex: 1 }}>{dayPlan.part}</Text>
                {isRest ? (
                  <Text style={{ fontSize: FONT_BADGE(), color: TH.sub }}>{T('bodyDayRest')}</Text>
                ) : isPast ? (
                  matched ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Check size={14} color="#10b981" />
                      <Text style={{ fontSize: FONT_BADGE(), color: '#10b981' }}>{T('bodyDayComplete')}</Text>
                    </View>
                  ) : (
                    <Text style={{ fontSize: FONT_BADGE(), color: '#ef4444' }}>{T('bodyDayIncomplete')}</Text>
                  )
                ) : (
                  <Text style={{ fontSize: FONT_BADGE(), color: TH.sub }}>{T('bodyDayPending')}</Text>
                )}
              </View>
            );
          })}
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: TH.border }}>
            <View style={{ alignItems: 'center' }}><Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#f59e0b' }}>{completedDays}/{totalPlanned}</Text><Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>{T('bodyCompletedDays')}</Text></View>
            <View style={{ alignItems: 'center' }}><Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#f59e0b' }}>{totalKcal}</Text><Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>{T('bodyKcal')}</Text></View>
          </View>
        </View>
      )}
    </View>
  );
}
