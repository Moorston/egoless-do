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

const SIZE = 220;
const CENTER = SIZE / 2;
const RADIUS = 78;
const POINT_DEFAULT = 11;
const POINT_CURRENT = 17;
const POINT_SLEEP = 13;

// Sleep window: 21:00 → 05:00
const SLEEP_START_HOUR = 21;
const SLEEP_END_HOUR = 5;
const SLEEP_KEYS = new Set(['hai', 'zi', 'chou', 'yin', 'mao']);

function hourToAngle(hour: number): number {
  return ((hour / 24) * 360) - 90;
}

function polarToXY(angleDeg: number, radius: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)];
}

/** Build an annular sector path (ring segment) for the sleep window. */
function sleepSectorPath(innerR: number, outerR: number, startHour: number, endHour: number): string {
  const startAngle = hourToAngle(startHour);
  const endAngle = hourToAngle(endHour);

  const [x1, y1] = polarToXY(startAngle, outerR);
  const [x2, y2] = polarToXY(endAngle, outerR);
  const [x3, y3] = polarToXY(endAngle, innerR);
  const [x4, y4] = polarToXY(startAngle, innerR);

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

  const innerR = RADIUS - 14;
  const outerR = RADIUS + 14;
  const sleepPath = sleepSectorPath(innerR, outerR, SLEEP_START_HOUR, SLEEP_END_HOUR);

  return (
    <View style={{ alignItems: 'center', width: SIZE, height: SIZE, position: 'relative' }}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Soft outer glow ring */}
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS + 22}
          fill="none"
          stroke={border}
          strokeWidth={1}
          opacity={0.15}
        />

        {/* Background ring track */}
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke={`${primary}20`}
          strokeWidth={2}
        />

        {/* Sleep window sector (filled) */}
        <Path
          d={sleepPath}
          fill={`${primary}18`}
          stroke={`${primary}50`}
          strokeWidth={1.5}
        />

        {/* Period points */}
        {BODY_CLOCK.map((p) => {
          const isCurrent = p.key === current.key;
          const isSleep = SLEEP_KEYS.has(p.key);
          const angle = hourToAngle(p.startHour);
          const [cx, cy] = polarToXY(angle, RADIUS);

          let size = POINT_DEFAULT;
          if (isCurrent) size = POINT_CURRENT;
          else if (isSleep) size = POINT_SLEEP;

          const fill = isCurrent ? primary
            : isSleep ? `${primary}60`
            : `${primary}25`;
          const stroke = isCurrent ? '#fff'
            : isSleep ? `${primary}80`
            : `${primary}40`;

          return (
            <Circle
              key={p.key}
              cx={cx}
              cy={cy}
              r={size}
              fill={fill}
              stroke={stroke}
              strokeWidth={isCurrent ? 2.5 : 1}
            />
          );
        })}
      </Svg>

      {/* Period labels (touchable) — overlaid on ring */}
      {BODY_CLOCK.map((p) => {
        const isCurrent = p.key === current.key;
        const isSleep = SLEEP_KEYS.has(p.key);
        const angle = hourToAngle(p.startHour);
        const [cx, cy] = polarToXY(angle, RADIUS);

        let size = POINT_DEFAULT;
        if (isCurrent) size = POINT_CURRENT;
        else if (isSleep) size = POINT_SLEEP;

        return (
          <TouchableOpacity
            key={p.key}
            onPress={() => onPeriodPress(p)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
                fontSize: isCurrent ? 14 : isSleep ? 12 : 11,
                fontWeight: isCurrent ? '700' : isSleep ? '600' : '500',
                color: isCurrent ? '#fff' : isSleep ? primary : sub,
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
