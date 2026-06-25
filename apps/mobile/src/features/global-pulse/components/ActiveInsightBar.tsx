/**
 * 活跃状态感悟输入栏
 * 可选文本框 + 在线人数显示
 * 用于运动/冥想/禁食计时页面
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useT } from '../../../components/UI';
import { useActiveSessions } from '../hooks/useActiveSessions';
import { CheckinType } from '../types/globalPulse';

interface ActiveInsightBarProps {
  type: CheckinType;
  insight: string;
  onInsightChange: (text: string) => void;
  goal?: string | null;
}

export const ActiveInsightBar: React.FC<ActiveInsightBarProps> = ({
  type,
  insight,
  onInsightChange,
  goal,
}) => {
  const t = useT();
  const { onlineCount } = useActiveSessions(type);
  const [expanded, setExpanded] = useState(false);

  const typeCount = onlineCount[type];

  return (
    <View style={styles.container}>
      {/* 在线人数 */}
      <TouchableOpacity
        style={styles.countRow}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.liveDot} />
        <Text style={styles.countText}>
          {typeCount > 0
            ? t('globalPulse.peopleDoingTogether').replace('{count}', String(typeCount))
            : t('globalPulse.noActiveUsers')}
        </Text>
        <Text style={styles.expandIcon}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expandedContent}>
          {/* 目标显示 */}
          {goal ? (
            <View style={styles.goalRow}>
              <Text style={styles.goalIcon}>🎯</Text>
              <Text style={styles.goalText} numberOfLines={2}>
                {goal}
              </Text>
            </View>
          ) : null}

          {/* 感悟输入 */}
          <TextInput
            style={styles.input}
            placeholder={t('globalPulse.insightPlaceholder')}
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={insight}
            onChangeText={onInsightChange}
            multiline
            maxLength={200}
            textAlignVertical="top"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    flex: 1,
  },
  expandIcon: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
  },
  expandedContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  goalIcon: {
    fontSize: 14,
  },
  goalText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    flex: 1,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 13,
    minHeight: 60,
    maxHeight: 120,
  },
});

export default ActiveInsightBar;
