import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { useTheme } from '../../../components/UI';
import { FONT_SUB } from '@egoless-do/core';

interface SegmentBarProps {
  segments: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function SegmentBar({ segments, selectedIndex, onSelect }: SegmentBarProps) {
  const TH = useTheme();
  const P = TH.primary;

  return (
    <View style={[styles.container, { backgroundColor: TH.card, borderColor: TH.border }]}>
      {segments.map((label, i) => {
        const active = i === selectedIndex;
        return (
          <TouchableOpacity
            key={i}
            style={[
              styles.segment,
              active && { backgroundColor: P },
            ]}
            onPress={() => onSelect(i)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.segmentText,
              { color: active ? '#fff' : TH.sub },
              active && styles.segmentTextActive,
            ]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: FONT_SUB(),
    fontWeight: '500',
  },
  segmentTextActive: {
    fontWeight: '700',
  },
});
