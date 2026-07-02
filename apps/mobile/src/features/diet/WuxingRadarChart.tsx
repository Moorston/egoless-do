import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Polygon, Line, Circle, Text as SvgText } from 'react-native-svg';
import { WUXING_ELEMENT_CONFIG } from '@egoless-do/core';
import type { WuxingElement } from '@egoless-do/core';

interface Props {
  stats: Record<string, number>; // { wood: 20, fire: 10, earth: 30, metal: 15, water: 25 }
  size?: number;
  colors?: Record<WuxingElement, string>;
}

const ELEMENTS: WuxingElement[] = ['wood', 'fire', 'earth', 'metal', 'water'];
const DEFAULT_COLORS: Record<WuxingElement, string> = {
  wood: '#10B981', fire: '#EF4444', earth: '#F59E0B', metal: '#9CA3AF', water: '#3B82F6',
};

const ELEMENT_LABELS: Record<WuxingElement, string> = {
  wood: '木', fire: '火', earth: '土', metal: '金', water: '水',
};

export default function WuxingRadarChart({ stats, size = 240, colors = DEFAULT_COLORS }: Props) {
  const center = size / 2;
  const radius = size / 2 - 30; // leave space for labels
  const levels = 5; // 5 concentric pentagons

  // Calculate pentagon vertices for a given radius
  const getVertices = (r: number) => {
    return ELEMENTS.map((_, i) => {
      const angle = (i * 72 - 90) * Math.PI / 180;
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle),
      };
    });
  };

  // Grid lines (concentric pentagons)
  const gridPolygons = useMemo(() => {
    return Array.from({ length: levels }, (_, i) => {
      const r = (radius * (i + 1)) / levels;
      const vertices = getVertices(r);
      const points = vertices.map(v => `${v.x},${v.y}`).join(' ');
      return { points, opacity: 0.1 + (i * 0.15) };
    });
  }, [radius, center]);

  // Axis lines
  const axisLines = useMemo(() => {
    return ELEMENTS.map((_, i) => {
      const angle = (i * 72 - 90) * Math.PI / 180;
      return {
        x2: center + radius * Math.cos(angle),
        y2: center + radius * Math.sin(angle),
      };
    });
  }, [radius, center]);

  // Data polygon
  const dataVertices = useMemo(() => {
    return ELEMENTS.map((e, i) => {
      const pct = Math.min(100, stats[e] ?? 0);
      const r = (pct / 100) * radius;
      const angle = (i * 72 - 90) * Math.PI / 180;
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle),
        pct,
      };
    });
  }, [stats, radius, center]);

  const dataPoints = dataVertices.map(v => `${v.x},${v.y}`).join(' ');

  // Label positions (outside the chart)
  const labelPositions = useMemo(() => {
    return ELEMENTS.map((e, i) => {
      const angle = (i * 72 - 90) * Math.PI / 180;
      const labelR = radius + 18;
      return {
        x: center + labelR * Math.cos(angle),
        y: center + labelR * Math.sin(angle),
        element: e,
      };
    });
  }, [radius, center]);

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {/* Grid polygons */}
        {gridPolygons.map((g, i) => (
          <Polygon
            key={i}
            points={g.points}
            fill="none"
            stroke="#888"
            strokeWidth={0.5}
            opacity={g.opacity}
          />
        ))}

        {/* Axis lines */}
        {axisLines.map((line, i) => (
          <Line
            key={i}
            x1={center}
            y1={center}
            x2={line.x2}
            y2={line.y2}
            stroke="#888"
            strokeWidth={0.5}
            opacity={0.3}
          />
        ))}

        {/* Data polygon */}
        <Polygon
          points={dataPoints}
          fill="rgba(139, 92, 246, 0.2)"
          stroke="rgba(139, 92, 246, 0.8)"
          strokeWidth={2}
        />

        {/* Data points */}
        {dataVertices.map((v, i) => (
          <Circle
            key={i}
            cx={v.x}
            cy={v.y}
            r={4}
            fill={colors[ELEMENTS[i]]}
          />
        ))}

        {/* Labels */}
        {labelPositions.map((l, i) => (
          <SvgText
            key={i}
            x={l.x}
            y={l.y}
            fontSize={12}
            fontWeight="700"
            fill={colors[l.element]}
            textAnchor="middle"
            alignmentBaseline="central"
          >
            {ELEMENT_LABELS[l.element]}
          </SvgText>
        ))}
      </Svg>

      {/* Legend */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 12 }}>
        {ELEMENTS.map(e => (
          <View key={e} style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors[e] }}>
              {stats[e] ?? 0}%
            </Text>
            <Text style={{ fontSize: 10, color: '#888' }}>
              {WUXING_ELEMENT_CONFIG[e]?.label ?? e}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
