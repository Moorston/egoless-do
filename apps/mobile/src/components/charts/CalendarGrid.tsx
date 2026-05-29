import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FONT_BACK, FONT_BODY, FONT_SUB, FONT_BADGE } from '@egoless-do/core';

export interface CalendarGridProps {
  /** checkin history entries */
  history: Array<{ date: string; done: boolean }>;
  primaryColor: string;
  textColor: string;
  subColor: string;
  borderColor: string;
}

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

function dateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function CalendarGrid({
  history, primaryColor, textColor, subColor, borderColor,
}: CalendarGridProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const doneSet = useMemo(() => new Set(history.filter(e => e.done).map(e => e.date)), [history]);

  const weeks = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const result: Array<Array<{ day: number; date: string; done: boolean; isToday: boolean; inMonth: boolean }>> = [];
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDow);

    const cur = new Date(startDate);
    const todayStr = dateStr(today);
    for (let w = 0; w < 6; w++) {
      const row: Array<{ day: number; date: string; done: boolean; isToday: boolean; inMonth: boolean }> = [];
      for (let d = 0; d < 7; d++) {
        const ds = dateStr(cur);
        row.push({
          day: cur.getDate(),
          date: ds,
          done: doneSet.has(ds),
          isToday: ds === todayStr,
          inMonth: cur.getMonth() === viewMonth,
        });
        cur.setDate(cur.getDate() + 1);
      }
      result.push(row);
    }
    return result;
  }, [viewYear, viewMonth, doneSet]);

  const goPrev = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const goNext = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
  const monthDone = weeks.flat().filter(c => c.inMonth && c.done).length;
  const monthTotal = new Date(viewYear, viewMonth + 1, 0).getDate();

  return (
    <View>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <TouchableOpacity onPress={goPrev} style={{ padding: 4, paddingHorizontal: 8 }}>
          <Text style={{ fontSize: FONT_BACK, color: subColor }}>{'‹'}</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: textColor }}>
            {viewYear}年 {MONTH_NAMES[viewMonth]}
          </Text>
          <Text style={{ fontSize: FONT_SUB, color: subColor }}>
            {monthDone}/{monthTotal} 天
          </Text>
        </View>
        <TouchableOpacity onPress={goNext} disabled={isCurrentMonth}
          style={{ padding: 4, paddingHorizontal: 8, opacity: isCurrentMonth ? 0.3 : 1 }}>
          <Text style={{ fontSize: FONT_BACK, color: subColor }}>{'›'}</Text>
        </TouchableOpacity>
      </View>

      {/* Day-of-week headers */}
      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        {DAY_LABELS.map(d => (
          <View key={d} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: FONT_BADGE, color: 'rgba(128,128,128,.5)', fontWeight: '500' }}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row', marginBottom: 4 }}>
          {week.map((cell, di) => {
            const bg = !cell.inMonth ? 'transparent'
              : cell.done ? primaryColor : `${primaryColor}18`;
            const fg = !cell.inMonth ? 'rgba(128,128,128,.2)'
              : cell.done ? '#fff' : 'rgba(128,128,128,.5)';
            return (
              <View key={di} style={{
                flex: 1, aspectRatio: 1, marginHorizontal: 2,
                borderRadius: 8, alignItems: 'center', justifyContent: 'center',
                backgroundColor: bg,
                borderWidth: cell.isToday ? 2 : 0,
                borderColor: cell.isToday ? primaryColor : 'transparent',
              }}>
                <Text style={{
                  fontSize: FONT_SUB, fontWeight: cell.isToday ? '700' : '400',
                  color: fg,
                }}>{cell.day}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
