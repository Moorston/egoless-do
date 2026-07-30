// ─── BodyClockDial — 十二时辰圆环表盘 ─────────────────────────────
// Circular meridian clock: 12 periods on a ring, current highlighted,
// sleep window (zi→mao, 23:00-05:00) shown as a filled sector.

import { BODY_CLOCK, getCurrentPeriod, type BodyClockPeriod, type Theme } from '@egoless-do/core';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

interface Props {
  theme: Theme;
  onPeriodPress: (period: BodyClockPeriod) => void;
}

const SIZE = 200;
const CENTER = SIZE / 2;
const RADIUS = 72; // period point center radius
const POINT_DEFAULT = 9;
const POINT_CURRENT = 14;

// Sleep window: 21:00 (hai/xu boundary) → 05:00 (mao/chen boundary)
const SLEEP_START_HOUR = 21;
const SLEEP_END_HOUR = 5;

function hourToAngle(hour: number): number {
  // 0° at top (12 o'clock), clockwise
  // 0h → top ( -90° in math), 6h → right, 12h → bottom, 18h → left
  return ((hour / 24) * 360) - 90;
}

function polarToXY(angleDeg: number, radius: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)];
}

/** Build an annular sector path (ring segment) for the sleep window. */
function sleepSectorPath(innerR: number, outerR: number, startHour: number, endHour: number): string {
  // Draw sector from startHour → endHour (clockwise, may wrap midnight)
  const startAngle = hourToAngle(startHour);
  const endAngle = hourToAngle(endHour);

  const [x1, y1] = polarToXY(startAngle, outerR);
  const [x2, y2] = polarToXY(endAngle, outerR);
  const [x3, y3] = polarToXY(endAngle, innerR);
  const [x4, y4] = polarToXY(startAngle, innerR);

  // Determine large-arc: if span > 180°, use 1
  let span = endHour - startHour;
  if (span < 0) span += 24;
  const largeArc = span > 12 ? 1 : 0;

  return [
    `M ${x1} ${y1}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4}`,
    'Z',
  ].join(' ');
}

export default function BodyClockDial({ theme, onPeriodPress }: Props) {
  const current = getCurrentPeriod();
  const primary = theme.primary;
  const border = theme.border;
  const sub = theme.sub;

  const innerR = RADIUS - 12;
  const outerR = RADIUS + 12;
  const sleepPath = sleepSectorPath(innerR, outerR, SLEEP_START_HOUR, SLEEP_END_HOUR);

  return (
    <View style={{ alignItems: 'center', width: SIZE, height: SIZE, position: 'relative' }}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Background ring */}
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke={border}
          strokeWidth={1}
          opacity={0.3}
        />

        {/* Sleep window sector */}
        <Path
          d={sleepPath}
          fill={`${primary}20`}
          stroke={`${primary}40`}
          strokeWidth={1}
        />

        {/* Period points */}
        {BODY_CLOCK.map((p) => {
          const isCurrent = p.key === current.key;
          const angle = hourToAngle(p.startHour);
          const [cx, cy] = polarToXY(angle, RADIUS);
          const size = isCurrent ? POINT_CURRENT : POINT_DEFAULT;

          return (
            <Circle
              key={p.key}
              cx={cx}
              cy={cy}
              r={size}
              fill={isCurrent ? primary : `${primary}25`}
              stroke={isCurrent ? primary : `${primary}50`}
              strokeWidth={isCurrent ? 2 : 1}
            />
          );
        })}
      </Svg>

      {/* Period labels (touchable) — overlaid on ring */}
      {BODY_CLOCK.map((p) => {
        const isCurrent = p.key === current.key;
        const angle = hourToAngle(p.startHour);
        const [cx, cy] = polarToXY(angle, RADIUS);
        const size = isCurrent ? POINT_CURRENT : POINT_DEFAULT;

        return (
          <TouchableOpacity
            key={p.key}
            onPress={() => onPeriodPress(p)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={{
              position: 'absolute',
              left: cx - size,
              top: cy - size,
              width: size * 2,
              height: size * 2,
              borderRadius: size,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityLabel={`${p.nameZh} ${p.organ}`}
            accessibilityRole="button"
          >
            <Text
              style={{
                fontSize: isCurrent ? 10 : 8,
                fontWeight: isCurrent ? '700' : '500',
                color: isCurrent ? '#fff' : sub,
              }}
            >
              {p.nameZh.charAt(0)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
