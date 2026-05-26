'use client';

import { useTheme } from '../helpers';
import {
  ResponsiveContainer, LineChart as ReLineChart,
  Line, XAxis, YAxis, Tooltip, Area, CartesianGrid,
} from 'recharts';

export interface WebLineChartProps {
  data: { label: string; value: number }[];
  color: string;
  height?: number;
  showDots?: boolean;
  showArea?: boolean;
  suffix?: string;
}

export default function LineChart({
  data, color, height = 180, showDots = true, showArea = true, suffix,
}: WebLineChartProps) {
  const { TH } = useTheme();

  if (!data.length || data.every(d => d.value === 0)) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReLineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={TH.border} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: TH.sub }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: TH.sub }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 10, fontSize: 13 }}
          labelStyle={{ color: TH.sub }}
          formatter={(v: number) => [`${Math.round(v * 10) / 10}${suffix ?? ''}`, '']}
        />
        {showArea && (
          <Area type="monotone" dataKey="value" fill={`${color}20`} stroke="none" />
        )}
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2}
          dot={showDots ? { r: 3, fill: color, stroke: '#fff', strokeWidth: 1.5 } : false}
          activeDot={{ r: 5, fill: color }} />
      </ReLineChart>
    </ResponsiveContainer>
  );
}
