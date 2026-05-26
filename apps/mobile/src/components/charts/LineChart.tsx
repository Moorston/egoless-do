import React from 'react';
import { View } from 'react-native';
import Svg, { Polyline, Circle, Path, Text as SvgText, Line } from 'react-native-svg';

export interface LineChartProps {
  data: number[];
  labels?: string[];
  width: number;
  height: number;
  color: string;
  showDots?: boolean;
  showArea?: boolean;
  suffix?: string;
}

export default function LineChart({
  data, labels, width, height, color,
  showDots = true, showArea = true, suffix,
}: LineChartProps) {
  if (!data.length || data.every(v => v === 0)) return null;

  const pad = { top: 16, right: 12, bottom: labels ? 24 : 8, left: 8 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;

  const points = data.map((v, i) => ({
    x: pad.left + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW),
    y: pad.top + chartH - ((v - minVal) / range) * chartH,
  }));

  const polylineStr = points.map(p => `${p.x},${p.y}`).join(' ');
  const areaStr = `${points[0].x},${pad.top + chartH} ${polylineStr} ${points[points.length - 1].x},${pad.top + chartH}`;

  return (
    <View>
      <Svg width={width} height={height}>
        {/* Grid lines */}
        {[0, 0.5, 1].map(pct => {
          const y = pad.top + chartH * (1 - pct);
          const val = minVal + range * pct;
          return (
            <React.Fragment key={pct}>
              <Line x1={pad.left} y1={y} x2={width - pad.right} y2={y}
                stroke="rgba(128,128,128,.15)" strokeWidth={1} />
              <SvgText x={pad.left} y={y - 4} fontSize={9} fill="rgba(128,128,128,.5)">
                {Math.round(val * 10) / 10}{suffix ?? ''}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Area fill */}
        {showArea && (
          <Path d={`M${areaStr} Z`} fill={`${color}20`} />
        )}

        {/* Line */}
        <Polyline points={polylineStr} fill="none" stroke={color} strokeWidth={2}
          strokeLinejoin="round" strokeLinecap="round" />

        {/* Data dots */}
        {showDots && points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill={color} stroke="#fff" strokeWidth={1.5} />
        ))}

        {/* X-axis labels */}
        {labels && labels.map((l, i) => {
          const x = pad.left + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
          return (
            <SvgText key={i} x={x} y={height - 4} fontSize={9} fill="rgba(128,128,128,.6)"
              textAnchor="middle">{l}</SvgText>
          );
        })}
      </Svg>
    </View>
  );
}
