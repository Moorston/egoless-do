import {dateStr, WUXING_ELEMENT_CONFIG , FONT_LABEL, FONT_SMALL} from '@egoless-do/core';
import type { WuxingElement } from '@egoless-do/core';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface Props {
  /** Map of date string -> dominant wuxing element */
  dayElementMap: Record<string, WuxingElement | null>;
  /** Map of date string -> intensity 0-1 */
  dayIntensityMap?: Record<string, number>;
  onMonthChange?: (year: number, month: number) => void;
}

const ELEMENT_COLORS: Record<WuxingElement, string> = {
  wood: '#10B981', fire: '#EF4444', earth: '#F59E0B', metal: '#9CA3AF', water: '#3B82F6',
};

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

export default function WuxingCalendar({ dayElementMap, dayIntensityMap = {}, onMonthChange }: Props) {
  const [monthOffset, setMonthOffset] = useState(0);

  const now = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1; // Monday = 0

  const todayStr = dateStr();

  const days = useMemo(() => {
    const result: { date: string; element: WuxingElement | null; intensity: number; isToday: boolean; isFuture: boolean }[] = [];
    for (let i = 0; i < offset; i++) {
      result.push({ date: '', element: null, intensity: 0, isToday: false, isFuture: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const element = dayElementMap[ds] ?? null;
      const intensity = dayIntensityMap[ds] ?? 0;
      const dt = new Date(year, month, d);
      result.push({
        date: ds,
        element,
        intensity,
        isToday: ds === todayStr,
        isFuture: dt > new Date(),
      });
    }
    return result;
  }, [dayElementMap, dayIntensityMap, year, month, daysInMonth, offset, todayStr]);

  const handlePrev = () => {
    setMonthOffset(o => o - 1);
    onMonthChange?.(year, month);
  };

  const handleNext = () => {
    if (monthOffset < 0) {
      setMonthOffset(o => o + 1);
      onMonthChange?.(year, month);
    }
  };

  return (
    <View style={{ borderRadius: 16, padding: 16, marginBottom: 12 }}>
      {/* Month navigation */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <TouchableOpacity onPress={handlePrev} style={{ padding: 4 }}>
          <ChevronLeft size={20} color="#888" />
        </TouchableOpacity>
        <Text style={{ fontSize: FONT_LABEL(), fontWeight: '700', color: '#fff' }}>
          {year}年{String(month + 1)}月
        </Text>
        <TouchableOpacity onPress={handleNext} style={{ padding: 4 }}>
          <ChevronRight size={20} color={monthOffset < 0 ? '#888' : '#444'} />
        </TouchableOpacity>
      </View>

      {/* Weekday labels */}
      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        {WEEKDAYS.map(d => (
          <View key={d} style={{ width: '14.28%', alignItems: 'center' }}>
            <Text style={{ fontSize: FONT_SMALL(), color: '#888' }}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Day cells */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {days.map((day, i) => (
          <View key={i} style={{ width: '14.28%', alignItems: 'center', paddingVertical: 2 }}>
            {day.date ? (
              <View style={{
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: day.element
                  ? ELEMENT_COLORS[day.element]
                  : day.isToday ? 'rgba(255,255,255,0.1)' : 'transparent',
                opacity: day.element ? Math.max(0.3, day.intensity) : 1,
                borderWidth: day.isToday ? 2 : 0,
                borderColor: day.isToday ? '#fff' : 'transparent',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{
                  fontSize: FONT_SMALL(),
                  color: day.element ? '#fff' : day.isFuture ? '#555' : '#aaa',
                  fontWeight: day.isToday ? '700' : '400',
                }}>
                  {String(parseInt(day.date.split('-')[2]))}
                </Text>
              </View>
            ) : (
              <View style={{ width: 32, height: 32 }} />
            )}
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 }}>
        {(['wood', 'fire', 'earth', 'metal', 'water'] as WuxingElement[]).map(e => (
          <View key={e} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: ELEMENT_COLORS[e] }} />
            <Text style={{ fontSize: FONT_SMALL(), color: '#aaa' }}>
              {WUXING_ELEMENT_CONFIG[e]?.label ?? e}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
