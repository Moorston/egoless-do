// ─── CountingRound 计数环 ────────────────────────────────────────
// 10 珠圆环，每呼吸一次点亮一颗，满轮次归零
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { CountingRoundState } from '@egoless-do/core';

interface Props {
  state: CountingRoundState;
  T: (key: string) => string;
}

const BEAD_COUNT = 10;
const RING_SIZE = 120;
const BEAD_SIZE = 14;

export default function CountingRound({ state, T }: Props) {
  const { totalBreaths, countedBreaths, currentCycle } = state;
  const activeBead = countedBreaths % BEAD_COUNT;

  return (
    <View style={styles.container}>
      {/* Bead ring */}
      <View style={styles.ring}>
        {Array.from({ length: BEAD_COUNT }, (_, i) => {
          const angle = (i / BEAD_COUNT) * 2 * Math.PI - Math.PI / 2;
          const x = (RING_SIZE / 2 - BEAD_SIZE / 2) + (RING_SIZE / 2 - BEAD_SIZE / 2) * Math.cos(angle);
          const y = (RING_SIZE / 2 - BEAD_SIZE / 2) + (RING_SIZE / 2 - BEAD_SIZE / 2) * Math.sin(angle);
          const isActive = i < activeBead;

          return (
            <View
              key={i}
              style={[
                styles.bead,
                {
                  left: x,
                  top: y,
                  backgroundColor: isActive ? '#C9A96E' : 'rgba(201, 169, 110, 0.2)',
                  borderColor: isActive ? '#C9A96E' : 'rgba(201, 169, 110, 0.4)',
                },
              ]}
            />
          );
        })}
        {/* Center info */}
        <View style={styles.center}>
          <Text style={styles.roundNum}>{currentCycle}</Text>
          <Text style={styles.roundLabel}>{T('zhiguanRoundLabel')}</Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Text style={styles.statText}>
          {T('zhiguanBreathCount')}: {totalBreaths}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  ring: { width: RING_SIZE, height: RING_SIZE, position: 'relative' },
  bead: {
    position: 'absolute',
    width: BEAD_SIZE,
    height: BEAD_SIZE,
    borderRadius: BEAD_SIZE / 2,
    borderWidth: 2,
  },
  center: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roundNum: { fontSize: 24, fontWeight: '700', color: '#C9A96E' },
  roundLabel: { fontSize: 11, color: '#8B7355', marginTop: 2 },
  statsRow: { marginTop: 8 },
  statText: { fontSize: 12, color: '#8B7355' },
});
