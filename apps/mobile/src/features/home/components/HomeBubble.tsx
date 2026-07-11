import { FONT_SMALL } from '@egoless-do/core';
import { Calendar } from 'lucide-react-native';
import React, { useRef, useCallback, memo } from 'react';
import { View, Text, Animated as RNAnimated } from 'react-native';

import { useTheme, useT } from '../../../components/UI';


interface HomeBubbleProps {
  visible: boolean;
  onTap: () => void;
}

const HomeBubble = memo(function HomeBubble({ visible, onTap }: HomeBubbleProps) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;

  const bubblePos = useRef({ x: 0, y: 0 }).current;
  const bubbleOffset = useRef({ x: 0, y: 0 });
  const bubbleTransX = useRef(new RNAnimated.Value(0)).current;
  const bubbleTransY = useRef(new RNAnimated.Value(0)).current;
  const isDragging = useRef(false);
  const bubbleTouchStartX = useRef(0);
  const bubbleTouchStartY = useRef(0);

  const onBubbleTouchStart = useCallback((e: { nativeEvent: { pageX: number; pageY: number } }) => {
    isDragging.current = false;
    bubbleTouchStartX.current = e.nativeEvent.pageX;
    bubbleTouchStartY.current = e.nativeEvent.pageY;
    bubbleOffset.current = { x: bubblePos.x, y: bubblePos.y };
  }, [bubblePos]);

  const onBubbleTouchMove = useCallback((e: { nativeEvent: { pageX: number; pageY: number } }) => {
    const dx = e.nativeEvent.pageX - bubbleTouchStartX.current;
    const dy = e.nativeEvent.pageY - bubbleTouchStartY.current;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isDragging.current = true;
    const newX = bubbleOffset.current.x + dx;
    const newY = bubbleOffset.current.y + dy;
    bubbleTransX.setValue(newX);
    bubbleTransY.setValue(newY);
  }, [bubbleTransX, bubbleTransY, bubbleOffset]);

  const onBubbleTouchEnd = useCallback((e: { nativeEvent: { pageX: number; pageY: number } }) => {
    const dx = e.nativeEvent.pageX - bubbleTouchStartX.current;
    const dy = e.nativeEvent.pageY - bubbleTouchStartY.current;
    const finalX = bubbleOffset.current.x + dx;
    const finalY = bubbleOffset.current.y + dy;
    bubblePos.x = finalX;
    bubblePos.y = finalY;
    if (!isDragging.current) {
      onTap();
    }
  }, [bubblePos, bubbleOffset, onTap]);

  if (!visible) return null;

  return (
    <RNAnimated.View
      style={{
        position: 'absolute', bottom: 24, left: 16,
        transform: [{ translateX: bubbleTransX }, { translateY: bubbleTransY }],
      }}
    >
      <View
        onTouchStart={onBubbleTouchStart}
        onTouchMove={onBubbleTouchMove}
        onTouchEnd={onBubbleTouchEnd}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 6,
          backgroundColor: P, paddingHorizontal: 14, paddingVertical: 10,
          borderRadius: 20, elevation: 4,
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25, shadowRadius: 4,
        }}
      >
        <Calendar size={16} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '600', fontSize: FONT_SMALL() }}>{T('dateBarToday')}</Text>
      </View>
    </RNAnimated.View>
  );
});

export default HomeBubble;
