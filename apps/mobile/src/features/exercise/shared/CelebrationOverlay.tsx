import React from 'react';
import { View, Text, Animated } from 'react-native';
import { COLORS, FONT_BODY } from '@egoless-do/core';

interface Props {
  showCelebration: boolean;
  celebrateAnim: Animated.Value;
  milestoneText: string | null;
  milestoneAnim: Animated.Value;
}

export default function CelebrationOverlay({ showCelebration, celebrateAnim, milestoneText, milestoneAnim }: Props) {
  return (
    <>
      {showCelebration && (
        <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 15, pointerEvents: 'none' }}>
          <Animated.Text style={{
            fontSize: 64, fontWeight: '900', color: COLORS.GREEN,
            transform: [{ scale: celebrateAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.2] }) }],
            opacity: celebrateAnim,
          }}>
            🎯
          </Animated.Text>
        </Animated.View>
      )}
      {milestoneText && (
        <Animated.View style={{
          position: 'absolute', top: 100, left: 20, right: 20,
          alignItems: 'center', zIndex: 16, pointerEvents: 'none',
          opacity: milestoneAnim,
          transform: [{ translateY: milestoneAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        }}>
          <View style={{ backgroundColor: 'rgba(0,0,0,.7)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 }}>
            <Text style={{ fontSize: FONT_BODY, color: '#fff', fontWeight: '700' }}>{milestoneText}</Text>
          </View>
        </Animated.View>
      )}
    </>
  );
}
