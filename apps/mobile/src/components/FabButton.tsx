import { Sparkles } from 'lucide-react-native';
import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';

const FAB_SIZE = 52;

interface Props {
  primaryColor: string;
  onPress: () => void;
}

export default function FabButton({ primaryColor, onPress }: Props) {
  const { width: vw, height: vh } = useWindowDimensions();
  const [pos] = useState({ x: vw - FAB_SIZE - 20, y: vh - 85 - FAB_SIZE - 20 });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.fab, {
        left: pos.x,
        top: pos.y,
        backgroundColor: primaryColor,
        shadowColor: primaryColor,
      }]}
    >
      <Sparkles size={24} color="#ffffff" strokeWidth={2.5} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 60,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
});