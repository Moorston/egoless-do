import { dateStr, FONT_TITLE, FONT_SUB, FONT_BODY, FONT_BUTTON } from '@egoless-do/core';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';

import { useTheme } from './UI';

interface Props {
  visible: boolean;
  startDate: string;
  endDate: string;
  onConfirm: (start: string, end: string) => void;
  onClose: () => void;
  minDate?: string;
  maxDate?: string;
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_NAMES = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
const WEEK_LABELS = ['日','一','二','三','四','五','六'];

function parseDate(s: string): { y: number; m: number; d: number } | null {
  if (!s || s.length !== 10) return null;
  const parts = s.split('-');
  if (parts.length !== 3) return null;
  return { y: +parts[0], m: +parts[1], d: +parts[2] };
}

function daysInMonth(y: number, m: number): number {
  if (m === 1 && ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0)) return 29;
  return DAYS_IN_MONTH[m];
}

export default function DateRangePickerModal({ visible, startDate, endDate, onConfirm, onClose, minDate, maxDate }: Props) {
  const TH = useTheme();
  const P = TH.primary;
  const now = new Date();

  const parsed = startDate ? parseDate(startDate) : null;
  const [year, setYear] = useState(parsed?.y ?? now.getFullYear());
  const [month, setMonth] = useState((parsed?.m ?? now.getMonth() + 1) - 1);
  const [selStart, setSelStart] = useState(startDate);
  const [selEnd, setSelEnd] = useState(endDate);
  const [selecting, setSelecting] = useState<'start' | 'end'>(!startDate ? 'start' : 'end');

  useEffect(() => {
    if (visible) {
      const p = startDate ? parseDate(startDate) : null;
      if (p) { setYear(p.y); setMonth(p.m - 1); }
      setSelStart(startDate);
      setSelEnd(endDate);
      setSelecting(!startDate ? 'start' : 'end');
    }
  }, [visible, startDate, endDate]);

  const days = daysInMonth(year, month);
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
  for (let d = 1; d <= days; d++) calendarDays.push(d);

  const fmt = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const isDisabled = (d: number): boolean => {
    const ds = fmt(year, month, d);
    if (minDate && ds < minDate) return true;
    if (maxDate && ds > maxDate) return true;
    return false;
  };

  const handleDayPress = (d: number) => {
    const ds = fmt(year, month, d);
    if (selecting === 'start') {
      setSelStart(ds);
      if (selEnd && ds > selEnd) setSelEnd('');
      setSelecting('end');
    } else {
      if (ds < selStart) {
        setSelEnd(selStart);
        setSelStart(ds);
      } else {
        setSelEnd(ds);
      }
      setSelecting('start');
    }
  };

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const handleConfirm = () => {
    if (!selStart) return;
    onConfirm(selStart, selEnd || selStart);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.65)', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 20 }}>
          {/* Header with selected range */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <TouchableOpacity onPress={prevMonth} style={{ padding: 8 }}>
              <ChevronLeft size={20} color={TH.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text }}>{year}年 {MONTH_NAMES[month]}</Text>
            <TouchableOpacity onPress={nextMonth} style={{ padding: 8 }}>
              <ChevronRight size={20} color={TH.text} />
            </TouchableOpacity>
          </View>

          {/* Range display */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
            <TouchableOpacity
              onPress={() => setSelecting('start')}
              style={{
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
                backgroundColor: selecting === 'start' ? `${P}20` : TH.card,
                borderWidth: 1, borderColor: selecting === 'start' ? P : TH.border,
              }}
            >
              <Text style={{ fontSize: FONT_SUB(), color: selecting === 'start' ? P : TH.sub, fontWeight: selecting === 'start' ? '600' : '400' }}>
                {selStart || '开始日期'}
              </Text>
            </TouchableOpacity>
            <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>—</Text>
            <TouchableOpacity
              onPress={() => setSelecting('end')}
              style={{
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
                backgroundColor: selecting === 'end' ? `${P}20` : TH.card,
                borderWidth: 1, borderColor: selecting === 'end' ? P : TH.border,
              }}
            >
              <Text style={{ fontSize: FONT_SUB(), color: selecting === 'end' ? P : TH.sub, fontWeight: selecting === 'end' ? '600' : '400' }}>
                {selEnd || '结束日期'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Week labels */}
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            {WEEK_LABELS.map(label => (
              <View key={label} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Day grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {calendarDays.map((d, idx) => {
              if (d === null) return <View key={`e${idx}`} style={{ width: '14.28%', aspectRatio: 1 }} />;
              const disabled = isDisabled(d);
              const ds = fmt(year, month, d);
              const isStart = ds === selStart;
              const isEnd = ds === selEnd;
              const inRange = selStart && selEnd && ds > selStart && ds < selEnd;
              const isToday = ds === dateStr();
              const isSelected = isStart || isEnd;

              let bg = 'transparent';
              if (isSelected) bg = P;
              else if (inRange) bg = `${P}15`;

              return (
                <TouchableOpacity
                  key={d}
                  disabled={disabled}
                  onPress={() => handleDayPress(d)}
                  style={{
                    width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
                    opacity: disabled ? 0.3 : 1,
                    backgroundColor: bg,
                    borderTopLeftRadius: isStart ? 16 : 0,
                    borderBottomLeftRadius: isStart ? 16 : 0,
                    borderTopRightRadius: isEnd ? 16 : 0,
                    borderBottomRightRadius: isEnd ? 16 : 0,
                  }}
                >
                  <View style={{
                    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: isSelected ? P : 'transparent',
                  }}>
                    <Text style={{
                      fontSize: FONT_BODY(), fontWeight: isSelected ? '700' : inRange ? '600' : '400',
                      color: isSelected ? '#fff' : inRange ? P : isToday ? P : TH.text,
                    }}>{d}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Buttons */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity onPress={onClose}
              style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
              <Text style={{ color: TH.sub, fontSize: FONT_BUTTON() }}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm}
              style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: P, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BUTTON() }}>确定</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
