/**
 * 脉冲标记组件
 * 彩色圆点标记 + 序号
 */

import React, { useMemo, memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckinType } from '../types/globalPulse';
import { getCheckinTypeColor } from '../services/globalPulseApi';

interface PulseMarkerProps {
  type: CheckinType;
  rank?: number;
  size?: number;
}

export const PulseMarker: React.FC<PulseMarkerProps> = memo(({
  type,
  rank,
  size = 32
}) => {
  const color = useMemo(() => getCheckinTypeColor(type), [type]);

  return (
    <View style={[styles.dot, {
      backgroundColor: color,
      width: size,
      height: size,
      borderRadius: size / 2,
    }]}>
      {rank !== undefined && (
        <Text style={[styles.rankText, { fontSize: size * 0.45 }]}>
          {rank}
        </Text>
      )}
    </View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    color: '#fff',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default PulseMarker;
