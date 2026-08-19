/**
 * 底部面板组件
 * TabBar（实时脉动 / 排行榜 / 我的）+ 内容切换
 */

import {FONT_SUB, FONT_STAT_CARD, dateStr , ActiveSession, GlobalCheckin, LeaderboardEntry, CheckinType , FONT_SMALL, FONT_BACK} from '@egoless-do/core';
import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

import { useTheme, useT } from '../../../components/UI';
import { useCheckinStreak } from '../../../store/selectors';
import {useShallowStore} from '../../../store/useAppStore';

import { ActiveUsersList } from './ActiveUsersList';
import { Leaderboard } from './Leaderboard';

type TabKey = 'realtime' | 'leaderboard' | 'me';

interface BottomPanelProps {
  sessions: ActiveSession[];
  onlineCount: { exercise: number; meditation: number; fasting: number; total: number };
  checkins: GlobalCheckin[];
  type?: CheckinType;
  onUserPress?: (session: ActiveSession) => void;
  onLeaderboardUserPress?: (entry: LeaderboardEntry) => void;
  selectedUserId?: string | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  myHash?: string;
  /** Legacy prop kept for backward-compat callers; not rendered. */
  _onRefresh?: () => void;
  /** Legacy prop kept for backward-compat callers; not rendered. */
  _isRefreshing?: boolean;
}

export const BottomPanel: React.FC<BottomPanelProps> = ({
  sessions,
  onlineCount,
  checkins,
  type,
  onUserPress,
  onLeaderboardUserPress,
  selectedUserId,
  _onRefresh,
  _isRefreshing,
  myHash,
}) => {
  const theme = useTheme();
  const t = useT();
  const streak = useCheckinStreak();
  const { checkinHistory, totalMedMinutes } = useShallowStore(s => ({ checkinHistory: s.checkinHistory, totalMedMinutes: s.totalMedMinutes }));
  const [activeTab, setActiveTab] = useState<TabKey>('realtime');

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'realtime', label: t('globalPulse.realtimePulse') },
    { key: 'leaderboard', label: t('globalPulse.leaderboard') },
    { key: 'me', label: t('globalPulse.me') },
  ];

  // 我的排名和百分位
  const myRankInfo = useMemo(() => {
    if (!myHash || checkins.length === 0) return null;
    const sorted = [...checkins].sort((a, b) => b.streak - a.streak);
    const rank = sorted.findIndex(c => c.user_hash === myHash) + 1;
    if (rank === 0) return null;
    const percentile = Math.round((1 - rank / sorted.length) * 100);
    return { rank, total: sorted.length, percentile };
  }, [checkins, myHash]);

  // 我的今日打卡类型
  const myTodayTypes = useMemo(() => {
    if (!myHash) return [];
    const today = dateStr();
    return checkins
      .filter(c => c.user_hash === myHash && c.created_at && dateStr(new Date(c.created_at)) === today)
      .map(c => c.type);
  }, [checkins, myHash]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                isActive && { backgroundColor: theme.primary },
              ]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? '#fff' : theme.sub },
                ]}
              >
                {tab.label}
              </Text>
              {tab.key === 'realtime' && onlineCount.total > 0 && (
                <View
                  style={[
                    styles.tabBadge,
                    { backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : `${theme.primary}20` },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBadgeText,
                      { color: isActive ? '#fff' : theme.primary },
                    ]}
                  >
                    {String(onlineCount.total)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'realtime' ? (
          <ActiveUsersList
            sessions={sessions}
            onlineCount={onlineCount}
            onUserPress={onUserPress}
          />
        ) : activeTab === 'leaderboard' ? (
          <Leaderboard
            checkins={checkins}
            type={type}
            compact={true}
            onUserPress={onLeaderboardUserPress}
            selectedUserId={selectedUserId}
          />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 我的修行 */}
            <View style={[styles.myCard, { borderColor: theme.border }]}>
              <Text style={[styles.myCardTitle, { color: theme.text }]}>{t('globalPulse.myJourney')}</Text>
              <View style={styles.myStatsRow}>
                <View style={styles.myStatItem}>
                  <Text style={[styles.myStatValue, { color: theme.primary }]}>{String(streak ?? 0)}</Text>
                  <Text style={[styles.myStatLabel, { color: theme.sub }]}>{t('checkinStreak')}</Text>
                </View>
                <View style={styles.myStatItem}>
                  <Text style={[styles.myStatValue, { color: theme.primary }]}>
                    {String((checkinHistory ?? []).filter(c => c.done && !c.deleted).length)}
                  </Text>
                  <Text style={[styles.myStatLabel, { color: theme.sub }]}>{t('globalPulse.totalDays')}</Text>
                </View>
                <View style={styles.myStatItem}>
                  <Text style={[styles.myStatValue, { color: theme.primary }]}>{String(totalMedMinutes ?? 0)}</Text>
                  <Text style={[styles.myStatLabel, { color: theme.sub }]}>{t('accMed')}</Text>
                </View>
              </View>
            </View>

            {/* 全球排名 */}
            {myRankInfo && (
              <View style={[styles.myCard, { borderColor: theme.border }]}>
                <Text style={[styles.myCardTitle, { color: theme.text }]}>{t('globalPulse.globalRank')}</Text>
                <View style={styles.myStatsRow}>
                  <View style={styles.myStatItem}>
                    <Text style={[styles.myStatValue, { color: theme.primary }]}>#{String(myRankInfo.rank)}</Text>
                    <Text style={[styles.myStatLabel, { color: theme.sub }]}>{t('globalPulse.rank')}</Text>
                  </View>
                  <View style={styles.myStatItem}>
                    <Text style={[styles.myStatValue, { color: theme.primary }]}>{String(myRankInfo.percentile)}%</Text>
                    <Text style={[styles.myStatLabel, { color: theme.sub }]}>{t('globalPulse.exceedPercent')}</Text>
                  </View>
                  <View style={styles.myStatItem}>
                    <Text style={[styles.myStatValue, { color: theme.sub }]}>{String(myRankInfo.total)}</Text>
                    <Text style={[styles.myStatLabel, { color: theme.sub }]}>{t('globalPulse.totalUsers')}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* 今日状态 */}
            <View style={[styles.myCard, { borderColor: theme.border }]}>
              <Text style={[styles.myCardTitle, { color: theme.text }]}>{t('globalPulse.todayStatus')}</Text>
              <View style={styles.todayRow}>
                {['exercise', 'meditation', 'fasting'].map(tp => {
                  const done = myTodayTypes.includes(tp as CheckinType);
                  const icons: Record<string, string> = { exercise: '🏃', meditation: '🧘', fasting: '🍽️' };
                  const labels: Record<string, string> = {
                    exercise: t('exercise'),
                    meditation: t('meditation'),
                    fasting: t('fasting'),
                  };
                  return (
                    <View key={tp} style={[styles.todayItem, done && { backgroundColor: `${theme.primary}15` }]}>
                      <Text style={styles.todayIcon}>{icons[tp]}</Text>
                      <Text style={[styles.todayLabel, { color: done ? theme.primary : theme.sub }]}>
                        {labels[tp]}
                      </Text>
                      <Text style={{ color: done ? theme.primary : theme.sub, fontSize: FONT_SMALL() }}>
                        {done ? '✓' : '—'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  tabText: {
    fontSize: FONT_SUB(),
    fontWeight: '600',
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: FONT_SMALL(),
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  myCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  myCardTitle: {
    fontSize: FONT_SUB(),
    fontWeight: '600',
    marginBottom: 10,
  },
  myStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  myStatItem: {
    alignItems: 'center',
    gap: 2,
  },
  myStatValue: {
    fontSize: FONT_STAT_CARD(),
    fontWeight: '800',
  },
  myStatLabel: {
    fontSize: FONT_SMALL(),
  },
  todayRow: {
    flexDirection: 'row',
    gap: 8,
  },
  todayItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 4,
  },
  todayIcon: {
    fontSize: FONT_BACK(),
  },
  todayLabel: {
    fontSize: FONT_SMALL(),
    fontWeight: '500',
  },
});

export default BottomPanel;
