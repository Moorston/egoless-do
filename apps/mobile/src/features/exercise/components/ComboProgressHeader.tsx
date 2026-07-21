// ─── ComboProgressHeader ─────────────────────────────────────────
// 顶部固定进度条：显示当前动作进度，点击展开完整动作列表
// 组合锻炼（combo workout）专用组件

import { FONT_BODY, FONT_SUB, FONT_SMALL, scaleFontSize, type ExerciseDef, type Theme } from '@egoless-do/core';
import { ChevronDown, ChevronUp, CheckCircle2, Play } from 'lucide-react-native';
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

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
  TH: Theme;
  T: (key: string) => string;
  safeAreaTop?: number;
}

export default function ComboProgressHeader({ exercises, currentIndex, results, onJumpTo, TH, T, safeAreaTop = 0 }: Props) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = useCallback(() => setExpanded(prev => !prev), []);

  const total = exercises.length;
  const progress = total > 1 ? currentIndex / (total - 1) : 1;
  const currentExercise = exercises[currentIndex];

  return (
    <View style={[styles.container, { backgroundColor: `${TH.card}E0`, borderBottomColor: TH.border, paddingTop: safeAreaTop }]}>
      {/* Collapsed bar */}
      <TouchableOpacity onPress={toggleExpand} activeOpacity={0.7} style={styles.bar}>
        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {exercises.map((ex, i) => (
            <View
              key={ex.id || i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i < currentIndex ? '#10b981'
                    : i === currentIndex ? '#f59e0b'
                    : `${TH.sub}40`,
                },
              ]}
            />
          ))}
        </View>

        {/* Label */}
        <Text style={[styles.label, { color: TH.text }]} numberOfLines={1}>
          {currentIndex + 1}/{total} {currentExercise?.nameI18nKey ? T(currentExercise.nameI18nKey) : currentExercise?.nameZh}
        </Text>

        {/* Expand/collapse icon */}
        {expanded ? <ChevronUp size={18} color={TH.sub} /> : <ChevronDown size={18} color={TH.sub} />}
      </TouchableOpacity>

      {/* Expanded list */}
      {expanded && (
        <View style={[styles.list, { backgroundColor: TH.card }]}>
          {exercises.map((ex, i) => {
            const done = i < currentIndex;
            const result = results[i];
            const isCurrent = i === currentIndex;
            const isFuture = i > currentIndex;

            return (
              <View key={ex.id || i} style={styles.listItem}>
                <View style={styles.listItemLeft}>
                  {isCurrent ? (
                    <Play size={14} color="#f59e0b" />
                  ) : done ? (
                    <CheckCircle2 size={14} color="#10b981" />
                  ) : (
                    <View style={[styles.futureDot, { backgroundColor: `${TH.sub}40` }]} />
                  )}
                  <Text
                    style={[
                      styles.listItemText,
                      {
                        color: done ? '#10b981' : isCurrent ? '#f59e0b' : TH.text,
                        fontWeight: isCurrent ? '600' : '400',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {ex.icon} {ex.nameI18nKey ? T(ex.nameI18nKey) : ex.nameZh}
                    {result ? `  ${Math.floor(result.durationSec / 60)}:${String(result.durationSec % 60).padStart(2, '0')}` : ''}
                  </Text>
                </View>

                {isFuture && (
                  <TouchableOpacity onPress={() => onJumpTo(i)} style={[styles.jumpBtn, { backgroundColor: `${TH.primary}15` }]}>
                    <Text style={[styles.jumpText, { color: TH.primary }]}>{T('bodyJumpTo') || '跳转'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    flex: 1,
    fontSize: FONT_SUB(),
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  listItemText: {
    fontSize: FONT_SMALL(),
    flex: 1,
  },
  futureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  jumpBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  jumpText: {
    fontSize: FONT_SMALL(),
    fontWeight: '600',
  },
});