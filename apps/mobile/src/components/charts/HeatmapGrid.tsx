import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

export interface HeatmapCell {
  date: string;
  done: boolean;
  isToday: boolean;
}

export interface HeatmapGridProps {
  grid: HeatmapCell[][];
  cellSize?: number;
  gap?: number;
  activeColor: string;
  inactiveColor: string;
  todayBorderColor: string;
}

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

export default function HeatmapGrid({
  grid, cellSize = 28, gap = 4,
  activeColor, inactiveColor, todayBorderColor,
}: HeatmapGridProps) {
  if (!grid.length) return null;

  const weeks = grid.length;
  const labelW = 16;
  const svgW = labelW + weeks * (cellSize + gap) + gap;
  const svgH = 7 * (cellSize + gap) + gap;

  return (
    <View>
      <Svg width={svgW} height={svgH}>
        {/* Day labels on left */}
        {DAY_LABELS.map((label, i) => (
          <SvgText key={label} x={0} y={gap + i * (cellSize + gap) + cellSize * 0.7}
            fontSize={10} fill="rgba(128,128,128,.5)">{label}</SvgText>
        ))}

        {/* Grid cells */}
        {grid.map((week, wi) =>
          week.map((cell, di) => {
            const x = labelW + wi * (cellSize + gap);
            const y = di * (cellSize + gap);
            const fill = cell.done ? activeColor : inactiveColor;
            return (
              <React.Fragment key={`${wi}-${di}`}>
                <Rect x={x} y={y} width={cellSize} height={cellSize}
                  rx={6} ry={6} fill={fill}
                  stroke={cell.isToday ? todayBorderColor : 'transparent'}
                  strokeWidth={cell.isToday ? 2 : 0} />
                {/* Date number inside cell */}
                <SvgText x={x + cellSize / 2} y={y + cellSize / 2 + 4}
                  fontSize={10} textAnchor="middle"
                  fill={cell.done ? '#fff' : 'rgba(128,128,128,.4)'}>
                  {parseInt(cell.date.slice(-2))}
                </SvgText>
              </React.Fragment>
            );
          })
        )}
      </Svg>
    </View>
  );
}
