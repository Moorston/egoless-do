import { type DayOverview, type Theme } from '@egoless-do/core';
import React, { useRef, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

const P = '#f59e0b';

interface Props {
  days: DayOverview[];
  activeWeekday: number | null;
  onPressDay: (weekday: number) => void;
  TH: Theme;
  T: (key: string) => string;
}

const WEEKDAY_I18N_KEYS = ['bodyWeekMon', 'bodyWeekTue', 'bodyWeekWed', 'bodyWeekThu', 'bodyWeekFri', 'bodyWeekSat', 'bodyWeekSun'];

export default function MiniWeekCalendar({ days, activeWeekday, onPressDay, TH, T }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const activeIndex = days.findIndex(d => d.weekday === activeWeekday);

  // Auto-scroll to active day
  useEffect(() => {
    if (activeIndex >= 0 && scrollRef.current) {
      scrollRef.current.scrollTo({ x: activeIndex * 56, animated: true });
    }
  }, [activeIndex]);

  const getDayColor = useCallback((day: DayOverview, isActive: boolean) => {
    if (isActive) return { bg: `${P}20`, border: P, text: P };
    if (day.status === 'rest') return { bg: TH.border, border: TH.border, text: TH.sub };
    if (day.status === 'planned') return { bg: `${P}12`, border: `${P}40`, text: P };
    return { bg: TH.bg, border: TH.border, text: TH.sub };
  }, [TH]);

  const getIntensityBar = useCallback((day: DayOverview) => {
    if (day.status === 'rest') return 0;
    if (day.status === 'planned') return Math.max(0.15, day.intensity);
    return 0;
  }, []);

  return (
    <View style={[styles.wrapper, { backgroundColor: TH.card, borderColor: TH.border }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
        snapToInterval={56}
        decelerationRate="fast"
      >
        {days.map((day) => {
          const isActive = activeWeekday === day.weekday;
          const colors = getDayColor(day, isActive);
          const intensity = getIntensityBar(day);
          const dayLabel = T(WEEKDAY_I18N_KEYS[day.weekday - 1] ?? '');

          return (
            <TouchableOpacity
              key={day.weekday}
              onPress={() => onPressDay(day.weekday)}
              accessibilityRole="button"
              accessibilityLabel={`${T('bodyWeekDay')} ${dayLabel}`}
              style={[
                styles.dayDot,
                {
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                  borderWidth: isActive ? 2 : 1,
                },
              ]}
            >
              {/* Day of week label */}
              <Text style={[styles.dayLabel, { color: colors.text }]}>{dayLabel}</Text>

              {/* Part icon or emoji */}
              <Text style={styles.iconText}>
                {day.partIcon ?? (day.status === 'rest' ? '😴' : day.status === 'empty' ? '·' : '🏋️')}
              </Text>

              {/* Intensity bar (visual heatmap indicator) */}
              {intensity > 0 && (
                <View style={[styles.intensityBar, { backgroundColor: `${P}30` }]}>
                  <View
                    style={[
                      styles.intensityFill,
                      { width: `${Math.round(intensity * 100)}%` as unknown as number, backgroundColor: P },
                    ]}
                  />
                </View>
              )}

              {/* Exercise count badge */}
              {day.exerciseCount > 0 && (
                <View style={[styles.countBadge, { backgroundColor: P }]}>
                  <Text style={styles.countText}>{String(day.exerciseCount)}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  container: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 6,
  },
  dayDot: {
    width: 48,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  iconText: {
    fontSize: 16,
    lineHeight: 20,
  },
  intensityBar: {
    position: 'absolute',
    bottom: 4,
    left: 6,
    right: 6,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  intensityFill: {
    height: '100%',
    borderRadius: 2,
  },
  countBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  countText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '700',
  },
});