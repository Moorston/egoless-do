import { DayOverview } from '@egoless-do/core';
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  days: DayOverview[];
  activeWeekday: number | null;
  onPressDay: (weekday: number) => void;
}

export default function MiniWeekCalendar({ days, activeWeekday, onPressDay }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {days.map((day) => {
        const isActive = activeWeekday === day.weekday;
        const isRest = day.status === 'rest';
        const bgColor = isRest
          ? '#6B7280'
          : day.status === 'empty'
          ? '#E5E7EB'
          : `rgba(245, 158, 11, ${0.3 + day.intensity * 0.7})`;
        return (
          <TouchableOpacity
            key={day.weekday}
            onPress={() => onPressDay(day.weekday)}
            style={[
              styles.dayDot,
              { backgroundColor: bgColor },
              isActive && styles.activeDot,
            ]}
          >
            <Text style={styles.weekdayText}>{weekdayShort(day.weekday)}</Text>
            <Text style={styles.iconText}>{day.partIcon ?? (isRest ? '😴' : '➕')}</Text>
            <Text style={styles.countText}>{day.exerciseCount > 0 ? day.exerciseCount : ''}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function weekdayShort(weekday: number): string {
  const labels = ['一', '二', '三', '四', '五', '六', '日'];
  return labels[weekday - 1] ?? '';
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  dayDot: {
    width: 48,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  activeDot: {
    borderColor: '#F59E0B',
    borderWidth: 2,
  },
  weekdayText: {
    fontSize: 11,
    color: 'rgba(0,0,0,0.6)',
    fontWeight: '600',
  },
  iconText: {
    fontSize: 16,
    marginTop: 2,
  },
  countText: {
    fontSize: 9,
    color: 'rgba(0,0,0,0.5)',
  },
});
