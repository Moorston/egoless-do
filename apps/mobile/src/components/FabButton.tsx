import { Sparkles } from 'lucide-react-native';
import React, { useRef, useMemo } from 'react';
import { Animated, StyleSheet, useWindowDimensions, PanResponder } from 'react-native';

import { DRAG_THRESHOLD, isTap } from './fabButtonLogic';

const FAB_SIZE = 52;
const FAB_HIDE_OFFSET = 30;

interface Props {
  primaryColor: string;
  onPress: () => void;
}

export default function FabButton({ primaryColor, onPress }: Props) {
  const { width: vw, height: vh } = useWindowDimensions();
  const posRef = useRef({ x: vw - FAB_SIZE - 20, y: vh - 85 - FAB_SIZE - 20 });
  const posX = useRef(new Animated.Value(posRef.current.x)).current;
  const posY = useRef(new Animated.Value(posRef.current.y)).current;
  const isHidden = useRef(false);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gs) => {
      posX.setValue(posRef.current.x + gs.dx);
      posY.setValue(posRef.current.y + gs.dy);
    },
    onPanResponderRelease: (_, gs) => {
      // Decide tap vs drag from the FINAL displacement, not from mid-move jitter.
      const moved = !isTap(gs.dx, gs.dy);
      if (!moved) {
        if (isHidden.current) {
          // A tap on the (partially hidden) FAB brings it back AND fires the action.
          isHidden.current = false;
          const targetX = vw - FAB_SIZE - 20;
          posRef.current = { x: targetX, y: posRef.current.y };
          Animated.spring(posX, { toValue: targetX, useNativeDriver: false, bounciness: 8 }).start();
          Animated.spring(posY, { toValue: posRef.current.y, useNativeDriver: false, bounciness: 8 }).start();
        }
        onPress();
        return;
      }

      const finalX = posRef.current.x + gs.dx;
      const distL = finalX;
      const distR = vw - finalX - FAB_SIZE;
      const targetX = distL < distR ? -FAB_HIDE_OFFSET : vw - FAB_SIZE + FAB_HIDE_OFFSET;
      isHidden.current = true;
      const minY = 100;
      const maxY = vh - 85 - FAB_SIZE - 10;
      const targetY = Math.max(minY, Math.min(maxY, posRef.current.y + gs.dy));
      posRef.current = { x: targetX, y: targetY };
      Animated.spring(posX, { toValue: targetX, useNativeDriver: false, bounciness: 8 }).start();
      Animated.spring(posY, { toValue: targetY, useNativeDriver: false, bounciness: 8 }).start();
    },
  }), [onPress, vw, vh, posX, posY]);

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[styles.fab, {
        left: posX,
        top: posY,
        backgroundColor: primaryColor,
        shadowColor: primaryColor,
      }]}
    >
      <Sparkles size={24} color="#ffffff" strokeWidth={2.5} />
    </Animated.View>
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