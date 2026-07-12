/**
 * 念珠环共享组件 (Mala Ring)
 *
 * 用于持咒和诵经的念珠型计数器 UI。
 * 渲染一个环形进度显示，已点计数呈已亮起，当前进度 bead 突出。
 *
 * 用法示例：
 * ```tsx
 * <MalaRing count={42, scaleFontSize} />
 * <MalaRing count={108} beadColor="#D4A574" trackColor="#8B451340" textColor="#4A2C17" />
 * ```
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { FONT_SMALL, scaleFontSize } from '@egoless-do/core';

const DEFAULT_BEAD_COUNT = 108;
const DEFAULT_SIZE = 280;

interface MalaRingProps {
  /** 当前计数 */
  count: number;
  /** 粒珠总数（默认 108） */
  beadCount?: number;
  /** SVG 画布尺寸（默认 280） */
  size?: number;
  /** 已点亮 bead 颜色（默认琥珀色 FBBF24） */
  beadColor?: string;
  /** 轨道色 / 未点亮 bead 颜色（默认 #E5E7EB40） */
  trackColor?: string;
  /** 中心大字颜色 */
  textColor?: string;
  /** 中心大字下方说明，如 "第 N 轮" */
  centerLabel?: string;
  /** 中心大字下方子说明，如 beadCount 数字 */
  centerSubLabel?: string;
}

export function MalaRing({
  count,
  beadCount = DEFAULT_BEAD_COUNT,
  size = DEFAULT_SIZE,
  beadColor = '#FBBF24',
  trackColor = '#E5E7EB40',
  textColor = '#FBBF24',
  centerLabel,
  centerSubLabel,
}: MalaRingProps) {
  const currentRound = Math.floor(count / beadCount);
  const currentBead = count % beadCount;
  const center = size / 2;
  const radius = center - 20;
  const circumference = 2 * Math.PI * radius;

  // 计算每个 bead 位置（memo 避免重复计算）
  const beads = useMemo(() => {
    return Array.from({ length: beadCount }, (_, i) => {
      const angle = (i / beadCount) * 2 * Math.PI - Math.PI / 2;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      return { x, y, index: i };
    });
  }, [beadCount, center, radius]);

  const progressOffset = circumference - (circumference * currentBead) / beadCount;
  const isComplete = currentBead === 0 && currentRound > 0;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '0deg' }] }}>
        {/* background ring */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={10}
        />
        {/* progress ring */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={beadColor}
          strokeWidth={10}
          strokeDasharray={circumference}
          strokeDashoffset={progressOffset}
          strokeLinecap="round"
          transform={`rotate(-90, ${center}, ${center})`}
        />
        {/* guru bead at top */}
        <Circle
          cx={center}
          cy={center - radius}
          r={5}
          fill={beadColor}
          opacity={0.9}
        />
        {/* individual beads */}
        {beads.map(({ x, y, index }) => {
          const isLit = isComplete || index < currentBead;
          const isCurrent = index === currentBead && !isComplete;
          return (
            <Circle
              key={index}
              cx={x}
              cy={y}
              r={isCurrent ? 5 : 3.5}
              fill={isLit ? beadColor : trackColor}
            />
          );
        })}
      </Svg>

      {/* center text */}
      <View style={styles.center} pointerEvents="none">
        <Text style={[styles.centerCount, { color: textColor }]}>
          {currentBead}
        </Text>
        {centerSubLabel && (
          <Text style={[styles.centerSub, { color: trackColor }]}>
            {centerSubLabel}
          </Text>
        )}
        {centerLabel && (
          <Text style={[styles.centerLabel, { color: trackColor }]}>
            {centerLabel}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  centerCount: {
    fontSize: scaleFontSize(44),
    fontWeight: '800',
    textAlign: 'center',
  },
  centerSub: {
    fontSize: FONT_SMALL(),
    marginTop: 2,
  },
  centerLabel: {
    fontSize: FONT_SMALL(),
    marginTop: 4,
  },
});

export default MalaRing;
