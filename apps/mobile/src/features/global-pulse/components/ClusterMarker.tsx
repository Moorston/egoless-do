/**
 * 聚合标记组件
 * 显示聚合的打卡标记数量
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getClusterStyle } from '../services/markerAggregation';

interface ClusterMarkerProps {
  count: number;
}

export const ClusterMarker: React.FC<ClusterMarkerProps> = ({ count }) => {
  const style = getClusterStyle(count);

  return (
    <View style={[
      styles.container,
      {
        width: style.size,
        height: style.size,
        borderRadius: style.size / 2,
        backgroundColor: style.color
      }
    ]}>
      <Text style={[
        styles.count,
        { fontSize: style.fontSize }
      ]}>
        {count > 999 ? '999+' : count}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  count: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default ClusterMarker;
