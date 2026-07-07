import React, { useRef, useCallback } from 'react';
import { Animated, StyleSheet, useWindowDimensions } from 'react-native';
import { Sparkles } from 'lucide-react-native';

const FAB_SIZE = 52;
const FAB_HIDE_OFFSET = 30;

interface Props {
  primaryColor: string;
  onPress: () => void;
}

export default function FabButton({ primaryColor, onPress }: Props) {
  const { width: vw, height: vh } = useWindowDimensions();
  const posRef = useRef({ x: vw - FAB_SIZE - 20, y: vh - 85 - FAB_SIZE - 20 });
  const transX = useRef(new Animated.Value(posRef.current.x)).current;
  const transY = useRef(new Animated.Value(posRef.current.y)).current;
  const touchStart = useRef({ x: 0, y: 0 });
  const offset = useRef({ x: posRef.current.x, y: posRef.current.y });
  const isDragging = useRef(false);
  const isHidden = useRef(false);

  const onTouchStart = useCallback((e: { nativeEvent: { pageX: number; pageY: number } }) => {
    isDragging.current = false;
    touchStart.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
    offset.current = { x: posRef.current.x, y: posRef.current.y };
  }, []);

  const onTouchMove = useCallback((e: { nativeEvent: { pageX: number; pageY: number } }) => {
    const dx = e.nativeEvent.pageX - touchStart.current.x;
    const dy = e.nativeEvent.pageY - touchStart.current.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isDragging.current = true;
    transX.setValue(offset.current.x + dx);
    transY.setValue(offset.current.y + dy);
  }, [transX, transY]);

  const onTouchEnd = useCallback((e: { nativeEvent: { pageX: number; pageY: number } }) => {
    const dx = e.nativeEvent.pageX - touchStart.current.x;
    const dy = e.nativeEvent.pageY - touchStart.current.y;
    const finalX = offset.current.x + dx;
    const finalY = offset.current.y + dy;

    if (!isDragging.current) {
      if (isHidden.current) {
        isHidden.current = false;
        const targetX = vw - FAB_SIZE - 20;
        posRef.current = { x: targetX, y: posRef.current.y };
        Animated.spring(transX, { toValue: targetX, useNativeDriver: false, bounciness: 8 }).start();
        Animated.spring(transY, { toValue: posRef.current.y, useNativeDriver: false, bounciness: 8 }).start();
      } else {
        onPress();
      }
      return;
    }

    const distL = finalX;
    const distR = vw - finalX - FAB_SIZE;
    let targetX: number;
    if (distL < distR) {
      targetX = -FAB_HIDE_OFFSET;
      isHidden.current = true;
    } else {
      targetX = vw - FAB_SIZE + FAB_HIDE_OFFSET;
      isHidden.current = true;
    }
    const minY = 100;
    const maxY = vh - 85 - FAB_SIZE - 10;
    const targetY = Math.max(minY, Math.min(maxY, finalY));
    posRef.current = { x: targetX, y: targetY };
    Animated.spring(transX, { toValue: targetX, useNativeDriver: false, bounciness: 8 }).start();
    Animated.spring(transY, { toValue: targetY, useNativeDriver: false, bounciness: 8 }).start();
  }, [onPress, vw, vh, transX, transY]);

  return (
    <Animated.View
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={[styles.fab, {
        backgroundColor: primaryColor,
        shadowColor: primaryColor,
        transform: [{ translateX: transX }, { translateY: transY }],
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
