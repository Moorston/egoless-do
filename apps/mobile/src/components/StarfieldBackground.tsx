import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions, StyleSheet } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STAR_COUNT = 150;

interface StarProps {
  x: number;
  y: number;
  size: number;
  delay: number;
}

function Star({ x, y, size, delay }: StarProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.8 + Math.random() * 0.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1,
            friction: 2,
            tension: 40,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        const twinkle = () => {
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.3 + Math.random() * 0.5,
              duration: 500 + Math.random() * 2000,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.8 + Math.random() * 0.2,
              duration: 500 + Math.random() * 2000,
              useNativeDriver: true,
            }),
          ]).start(twinkle);
        };
        twinkle();
      });
    };
    animate();
  }, []);

  return (
    <Animated.View
      style={[
        styles.star,
        {
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

function ShootingStar() {
  const translateX = useRef(new Animated.Value(-100)).current;
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      const startX = Math.random() * SCREEN_WIDTH * 0.3;
      const startY = Math.random() * SCREEN_HEIGHT * 0.2;
      const endX = startX + SCREEN_WIDTH * 0.7;
      const endY = startY + SCREEN_HEIGHT * 0.4;

      translateX.setValue(startX);
      translateY.setValue(startY);

      Animated.sequence([
        Animated.delay(3000 + Math.random() * 8000),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: endX,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: endY,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(animate, 2000 + Math.random() * 6000);
      });
    };
    animate();
  }, []);

  return (
    <Animated.View
      style={[
        styles.shootingStar,
        {
          opacity,
          transform: [
            { translateX },
            { translateY },
            { rotate: '30deg' },
          ],
        },
      ]}
    />
  );
}

export default function StarfieldBackground() {
  const stars = useRef<StarProps[]>(
    Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * SCREEN_WIDTH,
      y: Math.random() * SCREEN_HEIGHT,
      size: 1 + Math.random() * 2.5,
      delay: Math.random() * 2000,
    }))
  ).current;

  return (
    <View style={styles.container} pointerEvents="none">
      {stars.map((star, index) => (
        <Star key={index} {...star} />
      ))}
      <ShootingStar />
      <ShootingStar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#fff',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 3,
  },
  shootingStar: {
    position: 'absolute',
    width: 60,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
});
