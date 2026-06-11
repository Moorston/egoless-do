'use client';

import { memo, useMemo, useState, useRef, useEffect } from 'react';
import { COLORS, dateStr, FONT_SUB } from '@egoless-do/core';
import type { PlanItem, PlanItemCheckin } from '@egoless-do/core';

interface ItemHeatmapProps {
  item: PlanItem;
  checkins: PlanItemCheckin[];
  theme: string;
  T: (k: string) => string;
}

const THEMES: Record<string, { sub: string; border: string; text: string }> = {
  dark: { sub: '#94a3b8', border: '#334155', text: '#e2e8f0' },
  light: { sub: '#64748b', border: '#e2e8f0', text: '#1e293b' },
};

export const ItemHeatmap = memo(function ItemHeatmap({ item, checkins, theme, T }: ItemHeatmapProps) {
  const TH = THEMES[theme as keyof typeof THEMES] ?? THEMES.dark;
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setContainerWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cellSize = containerWidth > 0 ? Math.floor(containerWidth / 7) : 0;

  // Pre-build done dates set for this item
  const doneDates = useMemo(() => {
    const set = new Set<string>();
    for (const c of checkins) {
      if (c.planItemId === item.id && c.done) {
        set.add(c.date);
      }
    }
    return set;
  }, [checkins, item.id]);

  // Build weeks grid
  const { weeks } = useMemo(() => {
    const start = new Date(item.startDate);
    const end = new Date(item.endDate);
    const startDay = start.getDay();

    const dates: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(dateStr(d));
    }

    const weeks: (string | null)[][] = [];
    let week: (string | null)[] = new Array(startDay).fill(null);

    for (const ds of dates) {
      week.push(ds);
      if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }

    return { weeks };
  }, [item.startDate, item.endDate]);

  const weekLabels = useMemo(() => [
    T('weekdaySun'), T('weekdayMon'), T('weekdayTue'), T('weekdayWed'),
    T('weekdayThu'), T('weekdayFri'), T('weekdaySat'),
  ], [T]);

  if (cellSize <= 0) {
    return <div ref={containerRef} style={{ width: '100%' }} />;
  }

  return (
    <div ref={containerRef}>
      {/* Weekday labels row */}
      <div style={{ display: 'flex', marginBottom: 4 }}>
        {weekLabels.map((label, i) => (
          <div key={i} style={{ width: cellSize, fontSize: 10, color: TH.sub, textAlign: 'center' }}>{label}</div>
        ))}
      </div>

      {/* Grid */}
      <div>
        {weeks.map((w, wi) => (
          <div key={wi} style={{ display: 'flex' }}>
            {w.map((ds, di) => {
              const dayNum = ds ? parseInt(ds.slice(8), 10) : 0;
              const done = ds ? doneDates.has(ds) : false;
              return (
                <div key={di} style={{ width: cellSize, height: cellSize, padding: 2 }}>
                  {ds ? (
                    <div style={{
                      width: '100%', height: '100%', borderRadius: 6,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: done ? COLORS.GREEN : `${TH.border}60`,
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: done ? '#fff' : TH.text }}>{dayNum}</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <span style={{ fontSize: 10, color: TH.sub }}>{T('heatmapLess')}</span>
        {[`${TH.border}60`, COLORS.GREEN].map((c, i) => (
          <div key={i} style={{ width: 14, height: 14, borderRadius: 4, background: c }} />
        ))}
        <span style={{ fontSize: 10, color: TH.sub }}>{T('heatmapMore')}</span>
      </div>
    </div>
  );
});
