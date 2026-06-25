/**
 * 排行榜组件
 * 显示全球匿名用户排行
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { LeaderboardEntry, LeaderboardSort, CheckinType } from '../types/globalPulse';
import { getLeaderboard, generateAnonymousId, getCheckinTypeIcon } from '../services/globalPulseApi';

interface LeaderboardProps {
  type?: CheckinType;
  onBack: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  type,
  onBack
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | undefined>();
  const [sortBy, setSortBy] = useState<LeaderboardSort>('streak');
  const [isLoading, setIsLoading] = useState(true);

  // 加载排行榜数据
  useEffect(() => {
    loadLeaderboard();
  }, [sortBy]);

  const loadLeaderboard = async () => {
    setIsLoading(true);

    try {
      const response = await getLeaderboard({
        sort: sortBy,
        limit: 100
      });

      if (response.success && response.data) {
        setEntries(response.data.leaderboard);
        setUserRank(response.data.user_rank);
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 渲染领奖台
  const renderPodium = () => {
    if (entries.length < 3) return null;

    const top3 = entries.slice(0, 3);
    const medals = ['🥇', '🥈', '🥉'];

    return (
      <View style={styles.podiumContainer}>
        {/* 第二名 */}
        <View style={[styles.podiumItem, styles.podiumSecond]}>
          <Text style={styles.podiumMedal}>{medals[1]}</Text>
          <Text style={[styles.podiumName, { color: theme.colors.text }]}>
            {generateAnonymousId(top3[1].user_hash)}
          </Text>
          <Text style={[styles.podiumValue, { color: theme.colors.primary }]}>
            {sortBy === 'streak' ? top3[1].streak : top3[1].total_days}
          </Text>
          <Text style={[styles.podiumUnit, { color: theme.colors.textSecondary }]}>
            {t('globalPulse.days')}
          </Text>
        </View>

        {/* 第一名 */}
        <View style={[styles.podiumItem, styles.podiumFirst]}>
          <Text style={styles.podiumMedal}>{medals[0]}</Text>
          <Text style={[styles.podiumName, { color: theme.colors.text }]}>
            {generateAnonymousId(top3[0].user_hash)}
          </Text>
          <Text style={[styles.podiumValue, { color: theme.colors.primary }]}>
            {sortBy === 'streak' ? top3[0].streak : top3[0].total_days}
          </Text>
          <Text style={[styles.podiumUnit, { color: theme.colors.textSecondary }]}>
            {t('globalPulse.days')}
          </Text>
        </View>

        {/* 第三名 */}
        <View style={[styles.podiumItem, styles.podiumThird]}>
          <Text style={styles.podiumMedal}>{medals[2]}</Text>
          <Text style={[styles.podiumName, { color: theme.colors.text }]}>
            {generateAnonymousId(top3[2].user_hash)}
          </Text>
          <Text style={[styles.podiumValue, { color: theme.colors.primary }]}>
            {sortBy === 'streak' ? top3[2].streak : top3[2].total_days}
          </Text>
          <Text style={[styles.podiumUnit, { color: theme.colors.textSecondary }]}>
            {t('globalPulse.days')}
          </Text>
        </View>
      </View>
    );
  };

  // 渲染列表项
  const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const rank = index + 1;
    const isTop3 = rank <= 3;
    const anonymousId = generateAnonymousId(item.user_hash);
    const typeIcon = getCheckinTypeIcon(item.type);

    return (
      <View style={[
        styles.listItem,
        { backgroundColor: theme.colors.card },
        isTop3 && styles.listItemTop3
      ]}>
        <Text style={[styles.rank, { color: theme.colors.text }]}>
          {rank}
        </Text>
        <Text style={styles.typeIcon}>{typeIcon}</Text>
        <View style={styles.listItemInfo}>
          <Text style={[styles.listItemName, { color: theme.colors.text }]}>
            {anonymousId}
          </Text>
        </View>
        <View style={styles.listItemValue}>
          <Text style={[styles.listItemNumber, { color: theme.colors.primary }]}>
            {sortBy === 'streak' ? item.streak : item.total_days}
          </Text>
          <Text style={[styles.listItemUnit, { color: theme.colors.textSecondary }]}>
            {t('globalPulse.days')}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: theme.colors.text }]}>
            ←
          </Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t('globalPulse.leaderboard')}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* 排序切换 */}
      <View style={styles.sortContainer}>
        <TouchableOpacity
          style={[
            styles.sortButton,
            sortBy === 'streak' && { backgroundColor: theme.colors.primary }
          ]}
          onPress={() => setSortBy('streak')}
        >
          <Text style={[
            styles.sortButtonText,
            { color: sortBy === 'streak' ? '#fff' : theme.colors.text }
          ]}>
            {t('globalPulse.currentStreak')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.sortButton,
            sortBy === 'total_days' && { backgroundColor: theme.colors.primary }
          ]}
          onPress={() => setSortBy('total_days')}
        >
          <Text style={[
            styles.sortButtonText,
            { color: sortBy === 'total_days' ? '#fff' : theme.colors.text }
          ]}>
            {t('globalPulse.totalDays')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 用户排名 */}
      {userRank && (
        <View style={[styles.userRankContainer, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.userRankLabel, { color: theme.colors.textSecondary }]}>
            {t('globalPulse.yourRank')}
          </Text>
          <Text style={[styles.userRankValue, { color: theme.colors.primary }]}>
            #{userRank}
          </Text>
        </View>
      )}

      {/* 加载中 */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <>
          {/* 领奖台 */}
          {renderPodium()}

          {/* 排行榜列表 */}
          <FlatList
            data={entries.slice(3)}
            renderItem={renderItem}
            keyExtractor={(item) => item.user_hash}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  userRankContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  userRankLabel: {
    fontSize: 14,
  },
  userRankValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  podiumMedal: {
    fontSize: 32,
    marginBottom: 8,
  },
  podiumName: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  podiumValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  podiumUnit: {
    fontSize: 11,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  listItemTop3: {
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  rank: {
    width: 32,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  typeIcon: {
    fontSize: 20,
    marginHorizontal: 8,
  },
  listItemInfo: {
    flex: 1,
  },
  listItemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  listItemValue: {
    alignItems: 'flex-end',
  },
  listItemNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  listItemUnit: {
    fontSize: 11,
  },
});

export default Leaderboard;
