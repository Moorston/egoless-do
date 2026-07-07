import { FONT_BODY, FONT_TINY } from '@egoless-do/core';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useTheme } from '../../../components/UI';

import type { NodeType } from './types';

const NODE_LABELS: Record<NodeType, string> = {
  reflection: '感念',
  plan: '计划',
  habit: '习惯',
  trail: '思维脉络',
  planItem: '计划任务',
};

const NODE_COLORS: Record<NodeType, string> = {
  reflection: '#3B82F6',
  plan: '#10B981',
  habit: '#F59E0B',
  trail: '#06B6D4',
  planItem: '#8B5CF6',
};

interface Props {
  nodes: Array<{ type: NodeType }>;
}

export default function StatsBar({ nodes }: Props) {
  const TH = useTheme();

  return (
    <View style={[styles.statsBar, { backgroundColor: TH.card, borderColor: TH.border }]}>
      {(['reflection', 'plan', 'habit', 'trail', 'planItem'] as NodeType[]).map(type => {
        const count = nodes.filter(n => n.type === type).length;
        if (count === 0) return null;
        return (
          <View key={type} style={styles.statItem}>
            <Text style={[styles.statNumber, { color: NODE_COLORS[type] }]}>{count}</Text>
            <Text style={[styles.statLabel, { color: TH.sub }]}>{NODE_LABELS[type]}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: FONT_BODY, fontWeight: '700' },
  statLabel: { fontSize: FONT_TINY, marginTop: 2 },
});
