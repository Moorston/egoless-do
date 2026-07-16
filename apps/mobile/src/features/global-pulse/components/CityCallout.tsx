/**
 * 带城市信息的 Callout 内容组件
 */

import {GlobalCheckin , FONT_BODY, FONT_SUB} from '@egoless-do/core';
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

import { useTheme, useT } from '../../../components/UI';
import { useCityName } from '../hooks/useCityName';
import { formatDisplayName, getCheckinTypeIcon } from '../services/globalPulseApi';

interface CityCalloutProps {
  checkin: GlobalCheckin;
}

export const CityCallout: React.FC<CityCalloutProps> = ({ checkin }) => {
  const theme = useTheme();
  const t = useT();
  const { city, loading } = useCityName(checkin.lat, checkin.lng, checkin.city);

  const typeIcon = getCheckinTypeIcon(checkin.type);
  const displayName = formatDisplayName(checkin.nickname, checkin.user_hash);

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      <Text style={[styles.name, { color: theme.text }]}>
        {typeIcon} {displayName}
      </Text>
      {loading ? (
        <View style={styles.cityContainer}>
          <ActivityIndicator size="small" color={theme.sub} />
          <Text style={[styles.city, { color: theme.sub }]}>
            {t('loading')}
          </Text>
        </View>
      ) : city ? (
        <Text style={[styles.city, { color: theme.primary }]}>
          📍 {city}
        </Text>
      ) : null}
      <Text style={[styles.info, { color: theme.sub }]}>
        连续 {String(checkin.streak)} 天 · 累计 {String(checkin.total_days)} 天
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 14,
    borderRadius: 12,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  name: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
    marginBottom: 6,
  },
  cityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  city: {
    fontSize: FONT_SUB(),
    marginBottom: 6,
  },
  info: {
    fontSize: FONT_SUB(),
    lineHeight: 18,
  },
});

export default CityCallout;
