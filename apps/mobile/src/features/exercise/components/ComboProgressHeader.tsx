// ─── ComboProgressHeader ─────────────────────────────────────────
// 底部引导：横向滚动卡片式，与选运动页风格一致
// 背景色通过 bg 属性传入，与 Sport 页渐变背景底部颜色一致

import { FONT_SMALL, scaleFontSize, type ExerciseDef } from '@egoless-do/core';
import { CheckCircle2, Play } from 'lucide-react-native';
import React, { useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';

export interface ExerciseResult {
  sportKey: string;
  icon: string;
  durationSec: number;
  calories: number;
  reps: number;
  timestamp: number;
}

interface Props {
  exercises: ExerciseDef[];
  currentIndex: number;
  results: ExerciseResult[];
  onJumpTo: (index: number) => void;
  bg?: string;
  safeAreaBottom?: number;
}

export default function ComboProgressHeader({ exercises, currentIndex, results, onJumpTo, bg = '#0a0a0a', safeAreaBottom = 0 }: Props) {
  const scrollRef = useRef<ScrollView>(null);

  const handlePress = useCallback((index: number) => {
    if (index === currentIndex) return;
    if (index < currentIndex) {
      onJumpTo(index);
      return;
    }
    Alert.alert(
      `跳转 #${index + 1}`,
      undefined,
      [
        { text: '取消', style: 'cancel' },
        { text: '跳转', onPress: () => onJumpTo(index) },
      ]
    );
  }, [onJumpTo, currentIndex]);

  React.useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ x: Math.max(0, currentIndex * 90 - 60), animated: true });
    }, 100);
  }, [currentIndex]);

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingBottom: 8 + safeAreaBottom }]}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${exercises.length > 1 ? (currentIndex / (exercises.length - 1)) * 100 : 100}%` }]} />
      </View>

      <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {exercises.map((ex, i) => {
          const done = i < currentIndex;
          const isCurrent = i === currentIndex;
          const result = results[i];
          const exName = ex.nameZh;

          return (
            <TouchableOpacity key={ex.id || i} onPress={() => handlePress(i)} activeOpacity={0.7}
              style={[styles.chip, {
                backgroundColor: done ? '#10b98130' : isCurrent ? '#f59e0b30' : 'rgba(255,255,255,0.08)',
                borderColor: done ? '#10b981' : isCurrent ? '#f59e0b' : 'rgba(255,255,255,0.15)',
                borderWidth: isCurrent ? 2 : 1,
              }]}>
              <View style={styles.chipTop}>
                <Text style={styles.chipIcon}>{ex.icon}</Text>
                {done && <CheckCircle2 size={12} color="#10b981" style={styles.chipBadge} />}
                {isCurrent && <Play size={12} color="#f59e0b" style={styles.chipBadge} />}
              </View>
              <Text style={[styles.chipName, { color: done ? '#10b981' : isCurrent ? '#f59e0b' : '#fff' }]} numberOfLines={1}>
                {exName}
              </Text>
              {result && <Text style={[styles.chipTime, { color: 'rgba(255,255,255,0.5)' }]}>{Math.floor(result.durationSec / 60)}:{(result.durationSec % 60).toString().padStart(2, '0')}</Text>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  progressTrack: {
    height: 3,
    borderRadius: 1.5,
    marginBottom: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressFill: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#f59e0b',
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    minWidth: 72,
    maxWidth: 100,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  chipTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  chipIcon: {
    fontSize: scaleFontSize(20),
  },
  chipBadge: {
    marginLeft: 2,
  },
  chipName: {
    fontSize: FONT_SMALL(),
    fontWeight: '600',
    textAlign: 'center',
  },
  chipTime: {
    fontSize: 10,
    marginTop: 1,
  },
});