/**
 * 排行榜列表项组件
 * 显示详细信息：类型、城市、连续天数、累计天数、开始日期
 */

import {LeaderboardEntry , FONT_SUB, FONT_TITLE, FONT_SMALL} from '@egoless-do/core';
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

import { useTheme, useT } from '../../../components/UI';
import { useCityName } from '../hooks/useCityName';
import { formatDisplayName, getCheckinTypeIcon, getCheckinTypeColor } from '../services/globalPulseApi';

interface LeaderboardItemProps {
  entry: LeaderboardEntry;
  rank: number;
  isSelected: boolean;
  onPress?: (entry: LeaderboardEntry) => void;
}

// 格式化日期
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}/${m}/${d}`;
}

// 计算已进行天数
function daysSince(dateString: string): number {
  const start = new Date(dateString);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

export const LeaderboardItem: React.FC<LeaderboardItemProps> = React.memo(({
  entry,
  rank,
  isSelected,
  onPress,
}) => {
  const theme = useTheme();
  const t = useT();
  const { city, loading } = useCityName(entry.lat, entry.lng, entry.city);

  const displayName = formatDisplayName(entry.nickname, entry.user_hash);
  const typeIcon = getCheckinTypeIcon(entry.type);
  const typeColor = getCheckinTypeColor(entry.type);
  const startFormatted = useMemo(() => formatDate(entry.created_at), [entry.created_at]);
  const ongoingDays = useMemo(() => daysSince(entry.created_at), [entry.created_at]);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: theme.card },
        isSelected && { backgroundColor: `${theme.primary}15` },
      ]}
      onPress={() => onPress?.(entry)}
      activeOpacity={0.7}
    >
      {/* 左侧：排名 */}
      <Text style={[styles.rank, { color: theme.text }]}>
        {rank}
      </Text>

      {/* 中间：信息区 */}
      <View style={styles.info}>
        {/* 第一行：类型图标 + 匿名ID */}
        <View style={styles.topRow}>
          <Text style={styles.typeIcon}>{typeIcon}</Text>
          <Text style={[styles.name, { color: theme.text }]}>
            {displayName}
          </Text>
          <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
            <Text style={styles.typeBadgeText}>
              {t(`globalPulse.type.${entry.type}`)}
            </Text>
          </View>
        </View>

        {/* 第二行：城市 */}
        {loading ? (
          <ActivityIndicator size="small" color={theme.sub} style={styles.cityLoader} />
        ) : city ? (
          <Text style={[styles.city, { color: theme.sub }]}>
            📍 {city}
          </Text>
        ) : null}

        {/* 第三行：详细数据 */}
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.sub }]}>🔥 {t('globalPulse.currentStreak')}</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>{entry.streak}{t('globalPulse.days')}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.sub }]}>📅 {t('globalPulse.totalDays')}</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>{entry.total_days}{t('globalPulse.days')}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.sub }]}>🗓️ {t('globalPulse.startDate')}</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>{startFormatted}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  rank: {
    width: 32,
    fontSize: FONT_TITLE(),
    fontWeight: 'bold',
    textAlign: 'center',
    paddingTop: 4,
  },
  info: {
    flex: 1,
    marginLeft: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  typeIcon: {
    fontSize: FONT_TITLE(),
  },
  name: {
    fontSize: FONT_SUB(),
    fontWeight: '600',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: FONT_SMALL(),
    fontWeight: '500',
  },
  cityLoader: {
    alignSelf: 'flex-start',
    marginVertical: 2,
  },
  city: {
    fontSize: FONT_SMALL(),
    marginBottom: 6,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  detailItem: {
    gap: 2,
  },
  detailLabel: {
    fontSize: FONT_SMALL(),
  },
  detailValue: {
    fontSize: FONT_SUB(),
    fontWeight: '600',
  },
});

export default LeaderboardItem;
