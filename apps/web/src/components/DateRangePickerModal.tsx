'use client';

import { useState, useEffect } from 'react';
import { dateStr, FONT_TITLE, FONT_SUB, FONT_BODY, FONT_BUTTON } from '@egoless-do/core';
import { useT } from './helpers';
import { useWebStore } from '../store/useWebStore';
import { THEMES } from '@egoless-do/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  const store = useWebStore();
  const TH = THEMES[store.theme];
  const P = TH.primary;
  const T = useT();
  const now = new Date();
  const MONTH_NAMES = [T('month1'), T('month2'), T('month3'), T('month4'), T('month5'), T('month6'), T('month7'), T('month8'), T('month9'), T('month10'), T('month11'), T('month12')];
  const WEEK_LABELS = [T('weekdaySun'), T('weekdayMon'), T('weekdayTue'), T('weekdayWed'), T('weekdayThu'), T('weekdayFri'), T('weekdaySat')];

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

  const handleDayClick = (d: number) => {
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

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(0,0,0,.65)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: TH.cardSolid, borderRadius: 20, padding: 20,
        width: '100%', maxWidth: 360,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <button onClick={prevMonth} style={{ background: 'transparent', border: 'none', color: TH.text, cursor: 'pointer', padding: 8 }}>
            <ChevronLeft size={20} />
          </button>
          <div style={{ fontSize: FONT_TITLE, fontWeight: 700, color: TH.text }}>{T('dateYearMonth').replace('{year}', String(year)).replace('{month}', MONTH_NAMES[month])}</div>
          <button onClick={nextMonth} style={{ background: 'transparent', border: 'none', color: TH.text, cursor: 'pointer', padding: 8 }}>
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Range display */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => setSelecting('start')}
            style={{
              padding: '6px 12px', borderRadius: 8, fontSize: FONT_SUB,
              background: selecting === 'start' ? `${P}20` : TH.card,
              border: `1px solid ${selecting === 'start' ? P : TH.border}`,
              color: selecting === 'start' ? P : TH.sub,
              fontWeight: selecting === 'start' ? 600 : 400, cursor: 'pointer',
            }}
          >{selStart || T('dateRangeStart')}</button>
          <span style={{ fontSize: FONT_SUB, color: TH.sub }}>—</span>
          <button
            onClick={() => setSelecting('end')}
            style={{
              padding: '6px 12px', borderRadius: 8, fontSize: FONT_SUB,
              background: selecting === 'end' ? `${P}20` : TH.card,
              border: `1px solid ${selecting === 'end' ? P : TH.border}`,
              color: selecting === 'end' ? P : TH.sub,
              fontWeight: selecting === 'end' ? 600 : 400, cursor: 'pointer',
            }}
          >{selEnd || T('dateRangeEnd')}</button>
        </div>

        {/* Week labels */}
        <div style={{ display: 'flex', marginBottom: 8 }}>
          {WEEK_LABELS.map(label => (
            <div key={label} style={{ flex: 1, textAlign: 'center', fontSize: FONT_SUB, color: TH.sub }}>{label}</div>
          ))}
        </div>

        {/* Day grid */}
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {calendarDays.map((d, idx) => {
            if (d === null) return <div key={`e${idx}`} style={{ width: '14.28%', aspectRatio: 1 }} />;
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
              <div
                key={d}
                onClick={() => !disabled && handleDayClick(d)}
                style={{
                  width: '14.28%', aspectRatio: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.3 : 1,
                  background: bg,
                  borderTopLeftRadius: isStart ? 16 : 0,
                  borderBottomLeftRadius: isStart ? 16 : 0,
                  borderTopRightRadius: isEnd ? 16 : 0,
                  borderBottomRightRadius: isEnd ? 16 : 0,
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isSelected ? P : 'transparent',
                }}>
                  <span style={{
                    fontSize: FONT_BODY, fontWeight: isSelected ? 700 : inRange ? 600 : 400,
                    color: isSelected ? '#fff' : inRange ? P : isToday ? P : TH.text,
                  }}>{d}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${TH.border}`,
            background: 'transparent', color: TH.sub, fontSize: FONT_BUTTON, cursor: 'pointer',
          }}>{T('cancel')}</button>
          <button onClick={handleConfirm} style={{
            flex: 1, padding: 12, borderRadius: 12, border: 'none',
            background: P, color: '#fff', fontWeight: 700, fontSize: FONT_BUTTON, cursor: 'pointer',
          }}>{T('confirm')}</button>
        </div>
      </div>
    </div>
  );
}
