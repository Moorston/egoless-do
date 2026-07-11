/**
 * 领奖台项目组件
 * 显示前3名详细信息
 */

import {LeaderboardEntry , FONT_SMALL, FONT_TINY, FONT_BACK} from '@egoless-do/core';
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, type ViewStyle } from 'react-native';

import { useTheme, useT } from '../../../components/UI';
import { useCityName } from '../hooks/useCityName';
import { formatDisplayName } from '../services/globalPulseApi';

interface PodiumItemProps {
  entry: LeaderboardEntry;
  medal: string;
  isSelected: boolean;
  podiumStyle: ViewStyle;
  onPress?: (entry: LeaderboardEntry) => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

export const PodiumItem: React.FC<PodiumItemProps> = React.memo(({
  entry,
  medal,
  isSelected,
  podiumStyle,
  onPress,
}) => {
  const theme = useTheme();
  const t = useT();
  const { city, loading } = useCityName(entry.lat, entry.lng, entry.city);

  const displayName = formatDisplayName(entry.nickname, entry.user_hash);
  const startFormatted = useMemo(() => formatDate(entry.created_at), [entry.created_at]);

  return (
    <TouchableOpacity
      style={[
        podiumStyle,
        { backgroundColor: theme.card },
        isSelected && { backgroundColor: `${theme.primary}20` },
      ]}
      onPress={() => onPress?.(entry)}
      activeOpacity={0.7}
    >
      <Text style={styles.medal}>{medal}</Text>
      <Text style={[styles.name, { color: theme.text }]}>
        {displayName}
      </Text>
      {loading ? (
        <ActivityIndicator size="small" color={theme.sub} style={styles.cityLoader} />
      ) : city ? (
        <Text style={[styles.city, { color: theme.sub }]}>
          📍 {city}
        </Text>
      ) : null}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.primary }]}>
            {entry.streak}
          </Text>
          <Text style={[styles.statLabel, { color: theme.sub }]}>
            🔥{t('globalPulse.currentStreak')}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.primary }]}>
            {entry.total_days}
          </Text>
          <Text style={[styles.statLabel, { color: theme.sub }]}>
            📅{t('globalPulse.totalDays')}
          </Text>
        </View>
      </View>
      <Text style={[styles.startDate, { color: theme.sub }]}>
        🗓️ {startFormatted}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  medal: {
    fontSize: scaleFontSize(32)(),
    marginBottom: 4,
  },
  name: {
    fontSize: FONT_SMALL(),
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
  },
  cityLoader: {
    marginVertical: 4,
  },
  city: {
    fontSize: FONT_SMALL(),
    marginBottom: 4,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_BACK(),
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: FONT_TINY(),
  },
  startDate: {
    fontSize: FONT_SMALL(),
  },
});

export default PodiumItem;
