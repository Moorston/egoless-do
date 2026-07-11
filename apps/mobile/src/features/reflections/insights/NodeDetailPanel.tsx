import { FONT_BODY, FONT_SMALL } from '@egoless-do/core';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { useTheme } from '../../../components/UI';

import type { RelationNode, NodeType } from './types';

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
  node: RelationNode | null;
  onNavigate: (node: RelationNode) => void;
}

export default function NodeDetailPanel({ node, onNavigate }: Props) {
  const TH = useTheme();
  const P = TH.primary;

  if (!node) return null;

  return (
    <View style={[styles.detailPanel, { backgroundColor: TH.card, borderColor: TH.border }]}>
      <View style={styles.detailHeader}>
        <View style={[styles.detailDot, { backgroundColor: node.color }]} />
        <Text style={[styles.detailType, { color: TH.sub }]}>{NODE_LABELS[node.type]}</Text>
      </View>
      <Text style={[styles.detailLabel, { color: TH.text }]} numberOfLines={2}>{node.label}</Text>
      <TouchableOpacity onPress={() => onNavigate(node)} style={[styles.detailButton, { backgroundColor: P }]}>
        <Text style={styles.detailButtonText}>查看详情</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  detailPanel: {
    position: 'absolute',
    bottom: 200,
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  detailDot: { width: 10, height: 10, borderRadius: 5 },
  detailType: { fontSize: FONT_SMALL() },
  detailLabel: { fontSize: FONT_BODY(), fontWeight: '600', marginBottom: 12 },
  detailButton: { paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  detailButtonText: { color: '#fff', fontSize: FONT_SMALL(), fontWeight: '600' },
});
