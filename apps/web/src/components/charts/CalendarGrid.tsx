'use client';

import { useState, useMemo } from 'react';
import { useTheme } from '../helpers';
import { FONT_BODY, FONT_BADGE, FONT_CHART_AXIS } from '@egoless-do/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface CalendarGridProps {
  /** checkin history entries */
  history: Array<{ date: string; done: boolean }>;
}

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

/** Parse 'YYYY-MM-DD' as local date */
function parseLocal(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function CalendarGrid({ history }: CalendarGridProps) {
  const { TH } = useTheme();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed

  const doneSet = useMemo(() => new Set(history.filter(e => e.done).map(e => e.date)), [history]);

  const weeks = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    // Monday-based: 0=Mon ... 6=Sun
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const result: Array<Array<{ day: number; date: string; done: boolean; isToday: boolean; inMonth: boolean }>> = [];
    // Fill leading days from previous month
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

  const cellSize = 36;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={goPrev} style={{
          background: 'none', border: 'none', fontSize: FONT_BODY, cursor: 'pointer',
          color: TH.sub, padding: '4px 8px', borderRadius: 8,
        }}><ChevronLeft size={18} /></button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: FONT_BODY, fontWeight: 700, color: TH.text }}>
            {viewYear}年 {MONTH_NAMES[viewMonth]}
          </span>
          <span style={{ fontSize: FONT_BADGE, color: TH.sub }}>
            {monthDone}/{monthTotal} 天
          </span>
        </div>
        <button onClick={goNext} disabled={isCurrentMonth} style={{
          background: 'none', border: 'none', fontSize: FONT_BODY, cursor: isCurrentMonth ? 'default' : 'pointer',
          color: isCurrentMonth ? 'rgba(128,128,128,.3)' : TH.sub, padding: '4px 8px', borderRadius: 8,
        }}><ChevronRight size={18} /></button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {DAY_LABELS.map(d => (
          <div key={d} style={{
            textAlign: 'center', fontSize: FONT_CHART_AXIS, color: 'rgba(128,128,128,.5)',
            fontWeight: 500, padding: '2px 0',
          }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {weeks.flat().map((cell, i) => (
          <div key={i} style={{
            width: '100%', aspectRatio: '1',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: FONT_BADGE, fontWeight: cell.isToday ? 700 : 400,
            background: !cell.inMonth ? 'transparent'
              : cell.done ? TH.primary : `${TH.primary}18`,
            color: !cell.inMonth ? 'rgba(128,128,128,.2)'
              : cell.done ? '#fff' : 'rgba(128,128,128,.5)',
            border: cell.isToday ? `2px solid ${TH.primary}` : '2px solid transparent',
            transition: 'background .2s',
          }}>
            {cell.day}
          </div>
        ))}
      </div>
    </div>
  );
}
