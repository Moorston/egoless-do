import { FONT_BODY, FONT_SUB, FONT_BADGE, FONT_SMALL, dateStr, type BodyPlan, EXERCISE_CATEGORIES, PART_STRING_TO_KEY, type Theme, type ExerciseEntry } from '@egoless-do/core';
import { Calendar, Check, Circle } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

function resolveDayBgColor(day: { isToday: boolean; matched: boolean; hasPlan: boolean; isPast: boolean }, border: string): string {
  if (day.isToday) return '#f59e0b';
  if (day.matched) return '#10b981';
  if (!day.hasPlan) return 'transparent';
  if (day.isPast) return `${border}80`;
  return 'transparent';
}

const WEEKDAY_KEYS = ['bodyWeekMon', 'bodyWeekTue', 'bodyWeekWed', 'bodyWeekThu', 'bodyWeekFri', 'bodyWeekSat', 'bodyWeekSun'];

interface Props {
  TH: Theme;
  T: (key: string) => string;
  plans: BodyPlan[];
  exerciseLog: ExerciseEntry[];
  onEdit: () => void;
  onPressSport: (sportKey: string) => void;
}

function resolvePlan(plan: BodyPlan | undefined, T: (k: string) => string) {
  if (!plan || !plan.part) return null;
  const mappedKey = PART_STRING_TO_KEY[plan.part] ?? plan.part;
  const cat = EXERCISE_CATEGORIES.find(c => c.key === mappedKey);
  if (cat) {
    return { icon: cat.icon, label: T(cat.i18nKey), isRest: mappedKey === 'rest', key: mappedKey };
  }
  return { icon: '🏋️', label: plan.part, isRest: ['休息', 'Rest', 'rest'].includes(plan.part), key: plan.part };
}

function BodyWeekPlanCard({ TH, T, plans, exerciseLog, onEdit, onPressSport }: Props) {
  const activePlans = plans.filter(p => !p.deleted);
  const today = new Date();
  const todayDow = today.getDay() === 0 ? 7 : today.getDay();
  const todayStr = dateStr(today);

  // Calculate week start (Monday)
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - (todayDow - 1));
  const weekStartStr = dateStr(weekStart);

  // Build exercise lookup by date
  const exerciseByDate = new Map<string, ExerciseEntry[]>();
  for (const e of exerciseLog ?? []) {
    if (e.deleted) continue;
    const d = dateStr(new Date(e.timestamp ?? 0));
    if (!exerciseByDate.has(d)) exerciseByDate.set(d, []);
    exerciseByDate.get(d)!.push(e);
  }

  // Stats
  let completedDays = 0;
  let totalPlanned = 0;
  let totalKcal = 0;

  // Build 7-day cells
  const days: {
    dayName: string;
    dow: number;
    date: string;
    resolved: ReturnType<typeof resolvePlan>;
    isPast: boolean;
    isToday: boolean;
    matched: boolean;
    kcal: number;
    hasPlan: boolean;
  }[] = [];

  for (let i = 0; i < 7; i++) {
    const dow = i + 1;
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + i);
    const dayStr = dateStr(dayDate);
    const isToday = dayStr === todayStr;
    const isPast = dayStr <= todayStr;
    const dayPlan = activePlans.find(p => p.weekday === dow);
    const resolved = resolvePlan(dayPlan, T);
    const hasPlan = !!resolved;
    const isRest = resolved?.isRest ?? false;

    if (hasPlan && !isRest) totalPlanned++;

    // hasPlan implies dayPlan exists and resolved is non-null
    const matched = !isRest && hasPlan && dayPlan !== undefined && (exerciseByDate.get(dayStr)?.some((e: ExerciseEntry) =>
      !dayPlan.sportKey || e.sportKey === dayPlan.sportKey
    ) ?? false);

    let kcal = 0;
    if (matched) {
      completedDays++;
      const dayExercises = exerciseByDate.get(dayStr) ?? [];
      kcal = Math.round(dayExercises.reduce((s: number, e: ExerciseEntry) => s + (e.calories ?? 0), 0));
      totalKcal += kcal;
    }

    days.push({
      dayName: T(WEEKDAY_KEYS[i]).replace(/周|星期/, ''),
      dow,
      date: dayStr,
      resolved,
      isPast,
      isToday,
      matched,
      kcal,
      hasPlan,
    });
  }

  return (
    <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: TH.border }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Calendar size={18} color="#f59e0b" />
          <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text }}>{T('bodyPlan')}</Text>
        </View>
        <TouchableOpacity onPress={onEdit} style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, backgroundColor: '#f59e0b15' }}>
          <Text style={{ fontSize: FONT_BADGE, color: '#f59e0b' }}>{activePlans.length > 0 ? T('bodyPlanEdit') : T('bodyGoalSet')}</Text>
        </TouchableOpacity>
      </View>

      {activePlans.length === 0 ? (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center', marginBottom: 6 }}>{T('bodyPlanNotSet')}</Text>
          <TouchableOpacity onPress={onEdit} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, backgroundColor: '#f59e0b15' }}>
            <Text style={{ fontSize: FONT_BADGE, color: '#f59e0b', fontWeight: '600' }}>{T('bodySetPlan')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* 7-column week grid */}
          <View style={{ flexDirection: 'row', gap: 4, marginBottom: 12 }}>
            {days.map(day => {
              const bgColor = resolveDayBgColor(day, TH.border);
              const borderColor = !day.hasPlan || (!day.isPast && !day.isToday) ? TH.border : 'transparent';
              const iconColor = day.isToday ? '#fff' : day.matched ? '#fff' : day.resolved?.isRest ? TH.sub : '#f59e0b';
              const textColor = day.isToday || day.matched ? '#fff' : day.isPast ? TH.text : TH.sub;
              const dayTextColor = day.isToday || day.matched ? 'rgba(255,255,255,.75)' : TH.sub;

              return (
                <View key={day.dow} style={{ flex: 1, alignItems: 'center' }}>
                  {/* Day-of-week label */}
                  <Text style={{ fontSize: FONT_SMALL, color: day.isToday ? '#f59e0b' : TH.sub, fontWeight: day.isToday ? '700' : '400', marginBottom: 4 }}>
                    {day.dayName}
                  </Text>

                  {/* Status circle */}
                  <View style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: bgColor,
                    borderWidth: bgColor === 'transparent' ? 1 : 0,
                    borderColor,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 4,
                  }}>
                    {day.matched ? (
                      <Check size={20} color="#fff" />
                    ) : day.resolved?.isRest ? (
                      <Text style={{ fontSize: 16 }}>😴</Text>
                    ) : day.hasPlan && !day.isPast ? (
                      // Future planned day
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 16, opacity: 0.7 }}>{day.resolved?.icon}</Text>
                      </View>
                    ) : day.hasPlan && day.isPast ? (
                      // Past planned but missed
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 14, opacity: 0.5 }}>✗</Text>
                      </View>
                    ) : (
                      // No plan
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: `${TH.sub}60` }} />
                    )}
                  </View>

                  {/* Icon row */}
                  {day.hasPlan && !day.resolved?.isRest && (
                    <Text style={{ fontSize: 12, marginBottom: 2, opacity: day.isPast && !day.matched ? 0.5 : 1 }}>
                      {day.resolved?.icon}
                    </Text>
                  )}

                  {/* Date */}
                  <Text style={{ fontSize: FONT_SMALL, color: dayTextColor, fontWeight: day.isToday ? '700' : '400' }}>
                    {day.date.slice(5).replace('-', '/')}
                  </Text>

                  {/* Kcal */}
                  {day.matched ? (
                    <Text style={{ fontSize: FONT_SMALL, color: '#10b981', marginTop: 2 }}>{day.kcal}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>

          {/* Legend */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: TH.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#f59e0b' }} />
              <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>{T('bodyToday')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#10b981' }} />
              <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>{T('bodyDayCompleted')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 12 }}>😴</Text>
              <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>{T('bodyDayRest')}</Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: TH.border }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: '#f59e0b' }}>{completedDays}/{totalPlanned}</Text>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('bodyCompletedDays')}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: '#f59e0b' }}>{totalKcal}</Text>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('bodyKcal')}</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

export default React.memo(BodyWeekPlanCard);
