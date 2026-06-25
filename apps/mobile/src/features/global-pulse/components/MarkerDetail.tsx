/**
 * 标记详情卡片组件
 * 显示打卡记录的详细信息
 */

import React from 'react';
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
import { GlobalCheckin } from '../types/globalPulse';
import { formatDisplayName, getCheckinTypeIcon, getCheckinTypeColor } from '../services/globalPulseApi';

interface MarkerDetailProps {
  checkin: GlobalCheckin;
  onClose: () => void;
}

export const MarkerDetail: React.FC<MarkerDetailProps> = ({
  checkin,
  onClose
}) => {
  const theme = useTheme();
  const t = useT();
  const { city, loading: cityLoading } = useCityName(checkin.lat, checkin.lng, checkin.city);

  const displayName = formatDisplayName(checkin.nickname, checkin.user_hash);
  const typeIcon = getCheckinTypeIcon(checkin.type);
  const typeColor = getCheckinTypeColor(checkin.type);

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  };

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
                    {t(`globalPulse.type.${checkin.type}`)}
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

          {/* 统计信息 */}
          <View style={styles.statsContainer}>
            {/* 当前连续打卡 */}
            <View style={[styles.statItem, { backgroundColor: theme.bg }]}>
              <Text style={styles.statIcon}>🔥</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {checkin.streak}
              </Text>
              <Text style={[styles.statLabel, { color: theme.sub }]}>
                {t('globalPulse.currentStreak')}
              </Text>
            </View>

            {/* 总打卡天数 */}
            <View style={[styles.statItem, { backgroundColor: theme.bg }]}>
              <Text style={styles.statIcon}>📅</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {checkin.total_days}
              </Text>
              <Text style={[styles.statLabel, { color: theme.sub }]}>
                {t('globalPulse.totalDays')}
              </Text>
            </View>

            {/* 开始日期 */}
            <View style={[styles.statItem, { backgroundColor: theme.bg }]}>
              <Text style={styles.statIcon}>🗓️</Text>
              <Text style={[styles.statValue, { color: theme.text, fontSize: 12 }]}>
                {formatDate(checkin.created_at)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.sub }]}>
                {t('globalPulse.startDate')}
              </Text>
            </View>
          </View>

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
    fontSize: 32,
  },
  anonymousId: {
    fontSize: 18,
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
    fontSize: 12,
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
    fontSize: 18,
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
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  locationIcon: {
    fontSize: 16,
  },
  locationText: {
    fontSize: 14,
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
    fontSize: 16,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});

export default MarkerDetail;
