import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useTheme } from './UI';
import { dateStr, FONT_TITLE, FONT_SUB, FONT_BODY, FONT_BUTTON } from '@egoless-do/core';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

interface Props {
  visible: boolean;
  value: string; // YYYY-MM-DD
  onConfirm: (date: string) => void;
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

export default function DatePickerModal({ visible, value, onConfirm, onClose, minDate, maxDate }: Props) {
  const TH = useTheme();
  const parsed = parseDate(value);
  const now = new Date();
  const [year, setYear] = useState(parsed?.y ?? now.getFullYear());
  const [month, setMonth] = useState((parsed?.m ?? now.getMonth() + 1) - 1); // 0-indexed
  const [selectedDay, setSelectedDay] = useState(parsed?.d ?? now.getDate());

  // Reset when value changes
  React.useEffect(() => {
    const p = parseDate(value);
    if (p) {
      setYear(p.y);
      setMonth(p.m - 1);
      setSelectedDay(p.d);
    }
  }, [value, visible]);

  const days = daysInMonth(year, month);
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
  for (let d = 1; d <= days; d++) calendarDays.push(d);

  const formatDate = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const isDisabled = (d: number): boolean => {
    const ds = formatDate(year, month, d);
    if (minDate && ds < minDate) return true;
    if (maxDate && ds > maxDate) return true;
    return false;
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
    onConfirm(formatDate(year, month, selectedDay));
  };

  const P = TH.primary;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.65)', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 20 }}>
          {/* Month navigation */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <TouchableOpacity onPress={prevMonth} style={{ padding: 8 }}>
              <ChevronLeft size={20} color={TH.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>{year}年 {MONTH_NAMES[month]}</Text>
            <TouchableOpacity onPress={nextMonth} style={{ padding: 8 }}>
              <ChevronRight size={20} color={TH.text} />
            </TouchableOpacity>
          </View>

          {/* Week labels */}
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            {WEEK_LABELS.map(label => (
              <View key={label} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Day grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {calendarDays.map((d, idx) => {
              if (d === null) return <View key={`e${idx}`} style={{ width: '14.28%', aspectRatio: 1 }} />;
              const disabled = isDisabled(d);
              const isSelected = d === selectedDay;
              const isToday = formatDate(year, month, d) === dateStr();
              return (
                <TouchableOpacity
                  key={d}
                  disabled={disabled}
                  onPress={() => setSelectedDay(d)}
                  style={{
                    width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
                    borderRadius: 8,
                    backgroundColor: isSelected ? P : 'transparent',
                    opacity: disabled ? 0.3 : 1,
                  }}
                >
                  <Text style={{
                    fontSize: FONT_BODY, fontWeight: isSelected ? '700' : '400',
                    color: isSelected ? '#fff' : isToday ? P : TH.text,
                  }}>{d}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Buttons */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity onPress={onClose}
              style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
              <Text style={{ color: TH.sub, fontSize: FONT_BUTTON }}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm}
              style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: P, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BUTTON }}>确定</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
