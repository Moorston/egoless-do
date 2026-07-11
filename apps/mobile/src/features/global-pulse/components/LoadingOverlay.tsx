/**
 * 加载状态组件
 * 显示加载动画和骨架屏
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated
} from 'react-native';

import { useTheme, useT } from '../../../components/UI';
import { FONT_LABEL } from '@egoless-do/core';

interface LoadingOverlayProps {
  isLoading: boolean;
  text?: string;
  showSkeleton?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  text,
  showSkeleton = false
}) => {
  const theme = useTheme();
  const t = useT();

  if (!isLoading) return null;

  return (
    <View style={styles.container}>
      {showSkeleton ? (
        <View style={styles.skeletonContainer}>
          {/* 骨架屏标记 */}
          {[1, 2, 3, 4, 5].map((index) => (
            <View
              key={index}
              style={[
                styles.skeletonMarker,
                {
                  left: `${15 + (index * 15)}%`,
                  top: `${20 + (index * 10)}%`
                }
              ]}
            >
              <View style={styles.skeletonPulse} />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            {text || t('loading')}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1000,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: FONT_LABEL(),
    fontWeight: '500',
  },
  skeletonContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  skeletonMarker: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  skeletonPulse: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
});

export default LoadingOverlay;
