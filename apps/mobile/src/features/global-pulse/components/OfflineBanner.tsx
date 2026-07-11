/**
 * 离线提示横幅组件
 * 显示离线模式提示
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useT } from '../../../components/UI';
import { FONT_LABEL, FONT_SUB } from '@egoless-do/core';

export const OfflineBanner: React.FC = () => {
  const t = useT();

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📡</Text>
      <Text style={styles.text}>
        {t('globalPulse.offlineMode')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  icon: {
    fontSize: FONT_LABEL(),
    marginRight: 8,
  },
  text: {
    color: '#fff',
    fontSize: FONT_SUB(),
    fontWeight: '500',
  },
});

export default OfflineBanner;
