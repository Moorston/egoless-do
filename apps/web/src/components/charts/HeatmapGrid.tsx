'use client';

import { useTheme } from '../helpers';
import { FONT_CHART_AXIS } from '@egoless-do/core';

export interface HeatmapCell {
  date: string;
  done: boolean;
  isToday: boolean;
}

export interface WebHeatmapGridProps {
  grid: HeatmapCell[][];
  activeColor: string;
  inactiveColor: string;
}

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

export default function HeatmapGrid({
  grid, activeColor, inactiveColor,
}: WebHeatmapGridProps) {
  const { TH } = useTheme();
  if (!grid.length) return null;

  const cellSize = 32;
  const gap = 4;

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {/* Day labels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap, paddingTop: 20 }}>
        {DAY_LABELS.map(d => (
          <div key={d} style={{
            width: 16, height: cellSize, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: FONT_CHART_AXIS, color: 'rgba(128,128,128,.5)',
          }}>{d}</div>
        ))}
      </div>

      {/* Grid columns (weeks) */}
      <div style={{ display: 'flex', gap }}>
        {/* Week number labels */}
        {grid.map((_, wi) => (
          <div key={`w${wi}`} style={{ display: 'flex', flexDirection: 'column', gap }}>
            {/* Week header */}
            <div style={{
              height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: FONT_CHART_AXIS, color: 'rgba(128,128,128,.4)',
            }}>
              {wi < grid.length - 1 ? `W${wi + 1}` : '本周'}
            </div>
            {/* Cells */}
            {grid[wi].map((cell, di) => (
              <div key={`${wi}-${di}`} style={{
                width: cellSize, height: cellSize, borderRadius: 6,
                background: cell.done ? activeColor : inactiveColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: FONT_CHART_AXIS, color: cell.done ? '#fff' : 'rgba(128,128,128,.4)',
                border: cell.isToday ? `2px solid ${TH.primary}` : '2px solid transparent',
                fontWeight: cell.isToday ? 700 : 400,
                transition: 'background .2s',
              }}>
                {parseInt(cell.date.slice(-2))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
