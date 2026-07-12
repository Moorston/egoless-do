/**
 * 标记详情卡片组件
 * 支持打卡记录和实时活跃会话
 */

import {GlobalCheckin, ActiveSession , FONT_SUB, FONT_TITLE, FONT_STAT_CARD, FONT_SMALL, FONT_LABEL, scaleFontSize} from '@egoless-do/core';
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator
} from 'react-native';

import { useTheme, useT } from '../../../components/UI';
import { useCityName } from '../hooks/useCityName';
import { useGlobalTick } from '../hooks/useGlobalTick';
import { formatDisplayName, getCheckinTypeIcon, getCheckinTypeColor } from '../services/globalPulseApi';

interface MarkerDetailProps {
  checkin?: GlobalCheckin;
  activeSession?: ActiveSession;
  onClose: () => void;
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

export const MarkerDetail: React.FC<MarkerDetailProps> = ({
  checkin,
  activeSession,
  onClose
}) => {
  const theme = useTheme();
  const t = useT();

  // 确定数据源
  const session = activeSession;
  const type = session?.type || checkin?.type || 'exercise';
  const nickname = session?.nickname || checkin?.nickname;
  const userHash = session?.user_hash || checkin?.user_hash || '';
  const lat = session?.lat || checkin?.lat || 0;
  const lng = session?.lng || checkin?.lng || 0;
  const cityData = session?.city || checkin?.city;

  const { city, loading: cityLoading } = useCityName(lat, lng, cityData);

  const displayName = formatDisplayName(nickname, userHash);
  const typeIcon = getCheckinTypeIcon(type);
  const typeColor = getCheckinTypeColor(type);

  // 实时会话的持续时间
  const tick = useGlobalTick(1000);
  const duration = useMemo(
    () => session ? formatDuration(session.started_at) : '',
    [session, tick]
  );

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  };

  const isActive = !!session;

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.card }]}>
          {/* 头部 */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.typeIcon}>{typeIcon}</Text>
              <View>
                <Text style={[styles.anonymousId, { color: theme.text }]}>
                  {displayName}
                </Text>
                <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
                  <Text style={styles.typeBadgeText}>
                    {isActive
                      ? t('globalPulse.activeType.' + type)
                      : t(`globalPulse.type.${type}`)}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: theme.text }]}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          {/* 实时状态行 */}
          {isActive && (
            <View style={[styles.activeStatusRow, { backgroundColor: '#10B98115' }]}>
              <View style={styles.liveDot} />
              <Text style={[styles.activeStatusText, { color: '#10B981' }]}>
                {t('globalPulse.liveNow')}
              </Text>
              <Text style={[styles.durationText, { color: theme.primary }]}>
                {duration}
              </Text>
            </View>
          )}

          {/* 位置信息 */}
          {cityLoading ? (
            <View style={styles.locationContainer}>
              <ActivityIndicator size="small" color={theme.sub} />
              <Text style={[styles.locationText, { color: theme.sub }]}>
                {t('loading')}
              </Text>
            </View>
          ) : city ? (
            <View style={styles.locationContainer}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={[styles.locationText, { color: theme.primary }]}>
                {city}
              </Text>
            </View>
          ) : null}

          {/* 目标行（实时会话） */}
          {session?.goal ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🎯</Text>
              <Text style={[styles.infoLabel, { color: theme.sub }]}>
                {t('globalPulse.goalLabel')}
              </Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {session.goal}
              </Text>
            </View>
          ) : null}

          {/* 感悟行（实时会话） */}
          {session?.insight ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>💭</Text>
              <Text style={[styles.infoLabel, { color: theme.sub }]}>
                {t('globalPulse.insightLabel')}
              </Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {session.insight}
              </Text>
            </View>
          ) : null}

          {/* 统计信息（历史打卡数据） */}
          {checkin && (
            <View style={styles.statsContainer}>
              <View style={[styles.statItem, { backgroundColor: theme.bg }]}>
                <Text style={styles.statIcon}>🔥</Text>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {checkin.streak}
                </Text>
                <Text style={[styles.statLabel, { color: theme.sub }]}>
                  {t('globalPulse.currentStreak')}
                </Text>
              </View>

              <View style={[styles.statItem, { backgroundColor: theme.bg }]}>
                <Text style={styles.statIcon}>📅</Text>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {checkin.total_days}
                </Text>
                <Text style={[styles.statLabel, { color: theme.sub }]}>
                  {t('globalPulse.totalDays')}
                </Text>
              </View>

              <View style={[styles.statItem, { backgroundColor: theme.bg }]}>
                <Text style={styles.statIcon}>🗓️</Text>
                <Text style={[styles.statValue, { color: theme.text, fontSize: FONT_SMALL() }]}>
                  {formatDate(checkin.created_at)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.sub }]}>
                  {t('globalPulse.startDate')}
                </Text>
              </View>
            </View>
          )}

          {/* 隐私提示 */}
          <View style={styles.privacyNote}>
            <Text style={styles.privacyIcon}>🔒</Text>
            <Text style={[styles.privacyText, { color: theme.sub }]}>
              {t('globalPulse.privacyNote')}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeIcon: {
    fontSize: scaleFontSize(32),
  },
  anonymousId: {
    fontSize: FONT_TITLE(),
    fontWeight: '600',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: FONT_SMALL(),
    fontWeight: '500',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: FONT_TITLE(),
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  statIcon: {
    fontSize: FONT_STAT_CARD(),
    marginBottom: 8,
  },
  statValue: {
    fontSize: FONT_STAT_CARD(),
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: FONT_SMALL(),
    textAlign: 'center',
  },
  activeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  activeStatusText: {
    fontSize: FONT_SUB(),
    fontWeight: '600',
    flex: 1,
  },
  durationText: {
    fontSize: FONT_LABEL(),
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  infoIcon: {
    fontSize: FONT_LABEL(),
    marginTop: 1,
  },
  infoLabel: {
    fontSize: FONT_SUB(),
    fontWeight: '500',
    minWidth: 36,
  },
  infoValue: {
    fontSize: FONT_SUB(),
    flex: 1,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  locationIcon: {
    fontSize: FONT_LABEL(),
  },
  locationText: {
    fontSize: FONT_SUB(),
    fontWeight: '500',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 8,
  },
  privacyIcon: {
    fontSize: FONT_LABEL(),
  },
  privacyText: {
    flex: 1,
    fontSize: FONT_SMALL(),
    lineHeight: 18,
  },
});

export default MarkerDetail;
