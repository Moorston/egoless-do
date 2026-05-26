import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';

export interface BarChartProps {
  data: number[];
  labels?: string[];
  width: number;
  height: number;
  color: string;
}

export default function BarChart({
  data, labels, width, height, color,
}: BarChartProps) {
  if (!data.length || data.every(v => v === 0)) return null;

  const pad = { top: 16, right: 12, bottom: labels ? 24 : 8, left: 8 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const maxVal = Math.max(...data) || 1;
  const barCount = data.length;
  const gap = Math.max(4, chartW * 0.06);
  const barW = (chartW - gap * (barCount + 1)) / barCount;

  return (
    <View>
      <Svg width={width} height={height}>
        {/* Grid lines */}
        {[0, 0.5, 1].map(pct => {
          const y = pad.top + chartH * (1 - pct);
          const val = maxVal * pct;
          return (
            <React.Fragment key={pct}>
              <Line x1={pad.left} y1={y} x2={width - pad.right} y2={y}
                stroke="rgba(128,128,128,.15)" strokeWidth={1} />
              <SvgText x={pad.left} y={y - 4} fontSize={9} fill="rgba(128,128,128,.5)">
                {Math.round(val)}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Bars */}
        {data.map((v, i) => {
          const barH = maxVal > 0 ? (v / maxVal) * chartH : 0;
          const x = pad.left + gap + i * (barW + gap);
          const y = pad.top + chartH - barH;
          return (
            <React.Fragment key={i}>
              <Rect x={x} y={y} width={barW} height={barH}
                rx={4} ry={4} fill={v > 0 ? color : `${color}30`} />
              {v > 0 && (
                <SvgText x={x + barW / 2} y={y - 4} fontSize={9} fill={color}
                  textAnchor="middle" fontWeight="600">{Math.round(v)}</SvgText>
              )}
            </React.Fragment>
          );
        })}

        {/* X-axis labels */}
        {labels && labels.map((l, i) => {
          const x = pad.left + gap + i * (barW + gap) + barW / 2;
          return (
            <SvgText key={i} x={x} y={height - 4} fontSize={9} fill="rgba(128,128,128,.6)"
              textAnchor="middle">{l}</SvgText>
          );
        })}
      </Svg>
    </View>
  );
}
