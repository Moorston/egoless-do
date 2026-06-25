/**
 * 底部面板组件
 * TabBar（实时脉动 / 排行榜）+ 内容切换
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, useT } from '../../../components/UI';
import { ActiveSession, GlobalCheckin, LeaderboardEntry, CheckinType } from '../types/globalPulse';
import { ActiveUsersList } from './ActiveUsersList';
import { Leaderboard } from './Leaderboard';

type TabKey = 'realtime' | 'leaderboard';

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
}

export const BottomPanel: React.FC<BottomPanelProps> = ({
  sessions,
  onlineCount,
  checkins,
  type,
  onUserPress,
  onLeaderboardUserPress,
  selectedUserId,
  onRefresh,
  isRefreshing,
}) => {
  const theme = useTheme();
  const t = useT();
  const [activeTab, setActiveTab] = useState<TabKey>('realtime');

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'realtime', label: t('globalPulse.realtimePulse') },
    { key: 'leaderboard', label: t('globalPulse.leaderboard') },
  ];

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
                    {onlineCount.total}
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
        ) : (
          <Leaderboard
            checkins={checkins}
            type={type}
            compact={true}
            onUserPress={onLeaderboardUserPress}
            selectedUserId={selectedUserId}
          />
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
    fontSize: 14,
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
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
});

export default BottomPanel;
