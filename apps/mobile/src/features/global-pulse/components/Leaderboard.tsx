/**
 * 排行榜组件
 * 显示全球匿名用户排行
 * 直接使用已加载的 checkin 数据，无需额外 API 请求
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useTheme, useT } from '../../../components/UI';
import { GlobalCheckin, LeaderboardEntry, LeaderboardSort, CheckinType } from '@egoless-do/core';
import { LeaderboardItem } from './LeaderboardItem';
import { PodiumItem } from './PodiumItem';

interface LeaderboardProps {
  checkins: GlobalCheckin[];
  type?: CheckinType;
  onBack?: () => void;
  onUserPress?: (entry: LeaderboardEntry) => void;
  selectedUserId?: string | null;
  compact?: boolean;
}

// 从 checkins 数据生成排行榜
function buildLeaderboard(checkins: GlobalCheckin[], sortBy: LeaderboardSort): LeaderboardEntry[] {
  // 按 user_hash 去重，保留最新记录
  const seen = new Map<string, GlobalCheckin>();
  for (const c of checkins) {
    const existing = seen.get(c.user_hash);
    if (!existing || new Date(c.created_at) > new Date(existing.created_at)) {
      seen.set(c.user_hash, c);
    }
  }

  // 转换为 LeaderboardEntry 并排序
  const entries: LeaderboardEntry[] = Array.from(seen.values()).map(c => ({
    rank: 0,
    user_hash: c.user_hash,
    nickname: c.nickname,
    lat: c.lat,
    lng: c.lng,
    streak: c.streak,
    total_days: c.total_days,
    type: c.type,
    city: c.city,
    created_at: c.created_at,
  }));

  entries.sort((a, b) => b[sortBy] - a[sortBy]);
  entries.forEach((e, i) => { e.rank = i + 1; });

  return entries;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  checkins,
  type,
  onBack,
  onUserPress,
  selectedUserId,
  compact = false
}) => {
  const theme = useTheme();
  const t = useT();
  const [sortBy, setSortBy] = useState<LeaderboardSort>('streak');

  // 直接从 checkins 计算排行榜，无需额外请求
  const entries = useMemo(
    () => buildLeaderboard(checkins, sortBy),
    [checkins, sortBy]
  );

  const displayEntries = useMemo(() => {
    return compact ? entries.slice(0, 10) : entries.slice(3);
  }, [entries, compact]);

  const renderPodium = () => {
    if (entries.length < 3) return null;

    const top3 = entries.slice(0, 3);
    const medals = ['🥇', '🥈', '🥉'];
    const podiumStyles = [
      [styles.podiumItem, styles.podiumFirst],
      [styles.podiumItem, styles.podiumSecond],
      [styles.podiumItem, styles.podiumThird],
    ];

    return (
      <View style={styles.podiumContainer}>
        {top3.map((entry, index) => (
          <PodiumItem
            key={entry.user_hash}
            entry={entry}
            medal={medals[index]}
            isSelected={selectedUserId === entry.user_hash}
            podiumStyle={podiumStyles[index]}
            onPress={onUserPress}
          />
        ))}
      </View>
    );
  };

  const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const rank = compact ? index + 1 : index + 4;
    const isSelected = selectedUserId === item.user_hash;

    return (
      <LeaderboardItem
        entry={item}
        rank={rank}
        isSelected={isSelected}
        onPress={onUserPress}
      />
    );
  };

  return (
    <View style={[styles.container, compact && styles.containerCompact, { backgroundColor: compact ? 'transparent' : theme.bg }]}>
      {/* 头部 - 紧凑模式下隐藏 */}
      {!compact && (
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={[styles.backButtonText, { color: theme.text }]}>←</Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.title, { color: theme.text }]}>
            {t('globalPulse.leaderboard')}
          </Text>
          <View style={styles.placeholder} />
        </View>
      )}

      {/* 排序切换 - 紧凑模式下隐藏 */}
      {!compact && (
        <View style={styles.sortContainer}>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'streak' && { backgroundColor: theme.primary }]}
            onPress={() => setSortBy('streak')}
          >
            <Text style={[styles.sortButtonText, { color: sortBy === 'streak' ? '#fff' : theme.text }]}>
              {t('globalPulse.currentStreak')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'total_days' && { backgroundColor: theme.primary }]}
            onPress={() => setSortBy('total_days')}
          >
            <Text style={[styles.sortButtonText, { color: sortBy === 'total_days' ? '#fff' : theme.text }]}>
              {t('globalPulse.totalDays')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 领奖台 - 紧凑模式下隐藏 */}
      {!compact && renderPodium()}

      {/* 排行榜列表 */}
      <FlatList
        data={displayEntries}
        renderItem={renderItem}
        keyExtractor={(item) => item.user_hash}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerCompact: {
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  sortContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  sortButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 8,
  },
  podiumItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  podiumFirst: {
    paddingBottom: 24,
  },
  podiumSecond: {
    paddingBottom: 16,
  },
  podiumThird: {
    paddingBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
});

export default Leaderboard;
