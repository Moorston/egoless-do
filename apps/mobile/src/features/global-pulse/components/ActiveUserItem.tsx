/**
 * 在线用户卡片组件
 * 显示：昵称、活动图标、时长、城市、目标、感悟
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, useT } from '../../../components/UI';
import { useCityName } from '../hooks/useCityName';
import { formatDisplayName, getCheckinTypeIcon, getCheckinTypeColor } from '../services/globalPulseApi';
import { ActiveSession } from '@egoless-do/core';

interface ActiveUserItemProps {
  session: ActiveSession;
  isCurrentUser: boolean;
  onPress?: (session: ActiveSession) => void;
}

function formatDuration(startedAt: string): string {
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const diff = Math.floor((now - start) / 1000);
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export const ActiveUserItem: React.FC<ActiveUserItemProps> = ({
  session,
  isCurrentUser,
  onPress,
}) => {
  const theme = useTheme();
  const t = useT();
  const { city } = useCityName(session.lat, session.lng, session.city);
  const [duration, setDuration] = useState(() => formatDuration(session.started_at));

  // 每秒更新时长
  useEffect(() => {
    const interval = setInterval(() => {
      setDuration(formatDuration(session.started_at));
    }, 1000);
    return () => clearInterval(interval);
  }, [session.started_at]);

  const displayName = useMemo(
    () => formatDisplayName(session.nickname, session.user_hash),
    [session.nickname, session.user_hash]
  );

  const typeIcon = getCheckinTypeIcon(session.type);
  const typeColor = getCheckinTypeColor(session.type);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: theme.card },
        isCurrentUser && { backgroundColor: `${theme.primary}15` },
      ]}
      onPress={() => onPress?.(session)}
      activeOpacity={0.7}
    >
      {/* 左侧：活动图标 + 在线指示 */}
      <View style={styles.iconSection}>
        <View style={[styles.iconBg, { backgroundColor: `${typeColor}20` }]}>
          <Text style={styles.typeIcon}>{typeIcon}</Text>
        </View>
        <View style={styles.onlineDot} />
      </View>

      {/* 中间：信息区 */}
      <View style={styles.info}>
        {/* 第一行：昵称 + 时长 */}
        <View style={styles.topRow}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {displayName}
          </Text>
          {isCurrentUser && (
            <View style={[styles.meBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.meBadgeText}>{t('globalPulse.me')}</Text>
            </View>
          )}
          <Text style={[styles.duration, { color: theme.primary }]}>
            {duration}
          </Text>
        </View>

        {/* 第二行：城市 */}
        {city ? (
          <Text style={[styles.city, { color: theme.sub }]} numberOfLines={1}>
            📍 {city}
          </Text>
        ) : null}

        {/* 第三行：目标 */}
        {session.goal ? (
          <View style={styles.lineRow}>
            <Text style={[styles.lineLabel, { color: theme.sub }]}>
              {t('globalPulse.goalLabel')}
            </Text>
            <Text style={[styles.lineValue, { color: theme.text }]} numberOfLines={1}>
              {session.goal}
            </Text>
          </View>
        ) : null}

        {/* 第四行：感悟 */}
        {session.insight ? (
          <View style={styles.lineRow}>
            <Text style={[styles.lineLabel, { color: theme.sub }]}>
              {t('globalPulse.insightLabel')}
            </Text>
            <Text style={[styles.lineValue, { color: theme.text }]} numberOfLines={2}>
              {session.insight}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  iconSection: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeIcon: {
    fontSize: 20,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#fff',
  },
  info: {
    flex: 1,
    marginLeft: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  meBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  meBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  duration: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  city: {
    fontSize: 12,
    marginBottom: 4,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 2,
    gap: 4,
  },
  lineLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  lineValue: {
    fontSize: 11,
    flex: 1,
  },
});

export default ActiveUserItem;
