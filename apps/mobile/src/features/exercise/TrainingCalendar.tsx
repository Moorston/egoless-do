import { FONT_BODY, FONT_SUB, FONT_SMALL, FONT_TINY, type ExerciseEntry, type BodyPlan, type Theme, dateStr } from '@egoless-do/core';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  TH: Theme;
  T: (key: string) => string;
  exerciseLog: ExerciseEntry[];
  plans?: BodyPlan[];
}

export default function TrainingCalendar({ TH, T, exerciseLog, plans }: Props) {
  const WEEKDAY_LABELS = [
    T('bodyWeekMon'), T('bodyWeekTue'), T('bodyWeekWed'), T('bodyWeekThu'),
    T('bodyWeekFri'), T('bodyWeekSat'), T('bodyWeekSun')];
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const year = parseInt(currentMonth.split('-')[0]);
  const month = parseInt(currentMonth.split('-')[1]);

  // Build exercise lookup by date
  const exerciseByDate = useMemo(() => {
    const map = new Map<string, { count: number; totalMin: number; sports: Set<string> }>();
    for (const e of exerciseLog) {
      if (e.deleted) continue;
      const date = new Date(e.timestamp).toISOString().slice(0, 10);
      const existing = map.get(date) ?? { count: 0, totalMin: 0, sports: new Set() };
      existing.count++;
      existing.totalMin += Math.round(e.durationSec / 60);
      existing.sports.add(e.sportKey);
      map.set(date, existing);
    }
    return map;
  }, [exerciseLog]);

  // Build plan lookup by weekday
  const planByWeekday = useMemo(() => {
    if (!plans) return new Map();
    const map = new Map<number, string>();
    for (const p of plans) {
      if (!p.deleted) map.set(p.weekday, p.part);
    }
    return map;
  }, [plans]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();

    // Monday = 0, Sunday = 6
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;

    const days: { date: string; day: number; isCurrentMonth: boolean; exercise?: { count: number; totalMin: number }; planPart?: string }[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const date = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({ date, day, isCurrentMonth: false });
    }

    // Current month
    const today = dateStr();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month - 1, d).getDay();
      const weekday = dayOfWeek === 0 ? 7 : dayOfWeek; // 1=Mon, 7=Sun
      const exercise = exerciseByDate.get(date);
      const planPart = planByWeekday.get(weekday);
      days.push({ date, day: d, isCurrentMonth: true, exercise, planPart });
    }

    // Next month padding
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const date = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        days.push({ date, day: d, isCurrentMonth: false });
      }
    }

    return days;
  }, [year, month, exerciseByDate, planByWeekday]);

  // Stats
  const monthStats = useMemo(() => {
    const currentMonthDays = calendarDays.filter(d => d.isCurrentMonth);
    const activeDays = currentMonthDays.filter(d => d.exercise).length;
    const totalMin = currentMonthDays.reduce((s, d) => s + (d.exercise?.totalMin ?? 0), 0);
    const restDays = currentMonthDays.filter(d => {
      if (!d.planPart) return false;
      const lower = d.planPart.toLowerCase();
      return lower === 'rest' || lower === '休息';
    }).length;
    return { activeDays, totalMin, restDays, totalDays: currentMonthDays.length };
  }, [calendarDays]);

  const goToPrevMonth = () => {
    setCurrentMonth(prev => {
      const [y, m] = prev.split('-').map(Number);
      return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => {
      const [y, m] = prev.split('-').map(Number);
      return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    });
  };

  const todayStr = dateStr();

  return (
    <View style={[styles.container, { backgroundColor: TH.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.navBtn}>
          <ChevronLeft size={18} color={TH.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text }}>{year}年{month}月</Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.navBtn}>
          <ChevronRight size={18} color={TH.text} />
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10b981' }]}>{monthStats.activeDays}</Text>
          <Text style={[styles.statLabel, { color: TH.sub }]}>{T('bodyDayCompleted')}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>{Math.round(monthStats.totalMin / 60)}h</Text>
          <Text style={[styles.statLabel, { color: TH.sub }]}>{T('exerciseMin')}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#6366f1' }]}>{monthStats.restDays}</Text>
          <Text style={[styles.statLabel, { color: TH.sub }]}>{T('bodyDayRest')}</Text>
        </View>
      </View>

      {/* Weekday headers */}
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map(w => (
          <View key={w} style={styles.weekdayCell}>
            <Text style={{ fontSize: FONT_TINY(), color: TH.sub, fontWeight: '600' }}>{w}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.grid}>
        {calendarDays.map((day, idx) => {
          const isToday = day.date === todayStr;
          const hasExercise = !!day.exercise;
          const isRest = day.planPart && (day.planPart.toLowerCase() === 'rest' || day.planPart === '休息');
          const isFuture = day.date > todayStr;

          let bgColor = 'transparent';
          let textColor = day.isCurrentMonth ? TH.text : `${TH.sub}60`;
          let borderColor = 'transparent';

          if (isToday) {
            bgColor = '#f59e0b';
            textColor = '#fff';
          } else if (hasExercise) {
            bgColor = '#10b98120';
            textColor = '#10b981';
          } else if (isRest && day.isCurrentMonth) {
            bgColor = '#6366f110';
            textColor = '#6366f1';
          } else if (isFuture && day.isCurrentMonth) {
            textColor = TH.sub;
          }

          return (
            <View key={idx} style={styles.dayCell}>
              <View style={[styles.dayCircle, { backgroundColor: bgColor, borderColor: isToday ? '#f59e0b' : borderColor }]}>
                <Text style={{ fontSize: FONT_SMALL(), color: textColor, fontWeight: isToday ? '700' : '400' }}>
                  {day.day}
                </Text>
                {hasExercise && !isToday && (
                  <View style={{ position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: 2, backgroundColor: '#10b981' }} />
                )}
                {isRest && !isToday && (
                  <Text style={{ fontSize: 8, position: 'absolute', bottom: 1 }}>😴</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
          <Text style={{ fontSize: FONT_TINY(), color: TH.sub }}>{T('bodyToday')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
          <Text style={{ fontSize: FONT_TINY(), color: TH.sub }}>{T('bodyDayCompleted')}</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={{ fontSize: 10 }}>😴</Text>
          <Text style={{ fontSize: FONT_TINY(), color: TH.sub }}>{T('bodyDayRest')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navBtn: {
    padding: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,.06)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_BODY(),
    fontWeight: '800',
  },
  statLabel: {
    fontSize: FONT_TINY(),
    marginTop: 2,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,.06)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
