/**
 * 脉冲标记组件
 * 简单的彩色圆点标记
 * 序号通过 Marker 的 title/description 显示
 */

import React, { useMemo, memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { CheckinType } from '../types/globalPulse';
import { getCheckinTypeColor } from '../services/globalPulseApi';

interface PulseMarkerProps {
  type: CheckinType;
  size?: number;
}

export const PulseMarker: React.FC<PulseMarkerProps> = memo(({
  type,
  size = 28
}) => {
  const color = useMemo(() => getCheckinTypeColor(type), [type]);

  return (
    <View style={[styles.dot, {
      backgroundColor: color,
      width: size,
      height: size,
      borderRadius: size / 2,
    }]} />
  );
});

PulseMarker.displayName = 'PulseMarker';

const styles = StyleSheet.create({
  dot: {
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
});

export default PulseMarker;
