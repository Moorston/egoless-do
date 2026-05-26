'use client';

import { useTheme } from '../helpers';
import {
  ResponsiveContainer, BarChart as ReBarChart,
  Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts';

export interface WebBarChartProps {
  data: { label: string; value: number }[];
  color: string;
  height?: number;
}

export default function BarChart({
  data, color, height = 180,
}: WebBarChartProps) {
  const { TH } = useTheme();

  if (!data.length || data.every(d => d.value === 0)) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReBarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={TH.border} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: TH.sub }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: TH.sub }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: TH.card, border: `1px solid ${TH.border}`, borderRadius: 10, fontSize: 13 }}
          labelStyle={{ color: TH.sub }}
          formatter={(v: number) => [`${Math.round(v)}`, '']}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((_, i) => (
            <Cell key={i} fill={data[i].value > 0 ? color : `${color}30`} />
          ))}
        </Bar>
      </ReBarChart>
    </ResponsiveContainer>
  );
}
