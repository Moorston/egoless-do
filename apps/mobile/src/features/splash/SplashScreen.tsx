import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions, StyleSheet, StatusBar } from 'react-native';
import { FONT_HERO, FONT_CLOSE, FONT_TITLE } from '@egoless-do/core';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STAR_COUNT = 80;
const METEOR_COUNT = 3;

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
            toValue: 1,
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
              toValue: 0.3 + Math.random() * 0.7,
              duration: 500 + Math.random() * 1000,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 500 + Math.random() * 1000,
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

function Meteor({ delay }: { delay: number }) {
  const translateX = useRef(new Animated.Value(-100)).current;
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      const startX = Math.random() * SCREEN_WIDTH * 0.5;
      const startY = -50;
      const endX = startX + SCREEN_WIDTH * 0.6;
      const endY = startY + SCREEN_HEIGHT * 0.6;

      translateX.setValue(startX);
      translateY.setValue(startY);

      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
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
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(animate, 2000 + Math.random() * 4000);
      });
    };
    animate();
  }, []);

  return (
    <Animated.View
      style={[
        styles.meteor,
        {
          opacity,
          transform: [
            { translateX },
            { translateY },
            { rotate: '45deg' },
          ],
        },
      ]}
    />
  );
}

function Nebula() {
  const scale1 = useRef(new Animated.Value(1)).current;
  const scale2 = useRef(new Animated.Value(1)).current;
  const opacity1 = useRef(new Animated.Value(0.3)).current;
  const opacity2 = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const animate1 = () => {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale1, {
            toValue: 1.2,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(opacity1, {
            toValue: 0.5,
            duration: 4000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale1, {
            toValue: 1,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(opacity1, {
            toValue: 0.3,
            duration: 4000,
            useNativeDriver: true,
          }),
        ]),
      ]).start(animate1);
    };

    const animate2 = () => {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale2, {
            toValue: 1.3,
            duration: 5000,
            useNativeDriver: true,
          }),
          Animated.timing(opacity2, {
            toValue: 0.4,
            duration: 5000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale2, {
            toValue: 1,
            duration: 5000,
            useNativeDriver: true,
          }),
          Animated.timing(opacity2, {
            toValue: 0.2,
            duration: 5000,
            useNativeDriver: true,
          }),
        ]),
      ]).start(animate2);
    };

    animate1();
    setTimeout(animate2, 2000);
  }, []);

  return (
    <>
      <Animated.View
        style={[
          styles.nebula,
          styles.nebula1,
          {
            opacity: opacity1,
            transform: [{ scale: scale1 }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.nebula,
          styles.nebula2,
          {
            opacity: opacity2,
            transform: [{ scale: scale2 }],
          },
        ]}
      />
    </>
  );
}

interface SplashScreenProps {
  onFinish: () => void;
}

function GlowText({ text, style, delay: baseDelay = 0 }: { text: string; style: any; delay?: number }) {
  const chars = text.split('');
  const opacities = useRef(chars.map(() => new Animated.Value(0))).current;
  const glows = useRef(chars.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    chars.forEach((_, i) => {
      const delay = baseDelay + i * 120;
      setTimeout(() => {
        Animated.timing(opacities[i], { toValue: 1, duration: 400, useNativeDriver: false }).start();
        Animated.sequence([
          Animated.timing(glows[i], { toValue: 1, duration: 300, useNativeDriver: false }),
          Animated.timing(glows[i], { toValue: 0.4, duration: 600, useNativeDriver: false }),
        ]).start();
      }, delay);
    });
  }, []);

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' }}>
      {chars.map((char, i) => {
        const shadowRadius = glows[i].interpolate({
          inputRange: [0, 1],
          outputRange: [4, 25],
        });
        return (
          <Animated.Text
            key={i}
            style={[
              style,
              {
                opacity: opacities[i],
                textShadowRadius: shadowRadius,
              },
            ]}
          >
            {char}
          </Animated.Text>
        );
      })}
    </View>
  );
}

function BreathingText({ text, style, delay: baseDelay = 0 }: { text: string; style: any; delay?: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;
  const breathe = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(baseDelay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 8, tension: 30, useNativeDriver: true }),
      ]),
    ]).start(() => {
      const pulse = () => {
        Animated.sequence([
          Animated.timing(breathe, { toValue: 1.03, duration: 2000, useNativeDriver: true }),
          Animated.timing(breathe, { toValue: 1, duration: 2000, useNativeDriver: true }),
        ]).start(pulse);
      };
      pulse();
    });
  }, []);

  return (
    <Animated.Text
      style={[
        style,
        {
          opacity,
          transform: [{ scale: Animated.multiply(scale, breathe) }],
        },
      ]}
    >
      {text}
    </Animated.Text>
  );
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;
  const titleGlow = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(800),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.spring(titleTranslateY, {
          toValue: 0,
          friction: 6,
          tension: 40,
          useNativeDriver: false,
        }),
      ]),
      Animated.delay(2500),
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish();
    });
    setTimeout(() => {
      Animated.timing(titleGlow, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }).start();
    }, 800);
  }, []);

  const titleShadowRadius = titleGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 35],
  });

  const stars = useRef<StarProps[]>(
    Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * SCREEN_WIDTH,
      y: Math.random() * SCREEN_HEIGHT,
      size: 1 + Math.random() * 3,
      delay: Math.random() * 2000,
    }))
  ).current;

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Background */}
      <View style={styles.background} />

      {/* Nebula effects */}
      <Nebula />

      {/* Stars */}
      {stars.map((star, index) => (
        <Star key={index} {...star} />
      ))}

      {/* Meteors */}
      {Array.from({ length: METEOR_COUNT }, (_, i) => (
        <Meteor key={i} delay={1000 + i * 2000} />
      ))}

      {/* Title */}
      <View style={styles.titleContainer}>
        <Animated.Text
          style={[
            styles.title,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
              textShadowRadius: titleShadowRadius,
            },
          ]}
        >
          心流纪
        </Animated.Text>
        <GlowText
          text="Egoless Do"
          style={styles.subtitle}
          delay={1400}
        />
        <BreathingText
          text="记录每一份觉知"
          style={styles.tagline}
          delay={2200}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0015',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0015',
  },
  star: {
    position: 'absolute',
    backgroundColor: '#fff',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  meteor: {
    position: 'absolute',
    width: 80,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 8,
  },
  nebula: {
    position: 'absolute',
    borderRadius: 200,
  },
  nebula1: {
    width: 300,
    height: 300,
    top: '20%',
    left: '-10%',
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 50,
  },
  nebula2: {
    width: 250,
    height: 250,
    bottom: '15%',
    right: '-5%',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: FONT_HERO,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 8,
    textShadowColor: 'rgba(124, 58, 237, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: FONT_CLOSE,
    color: 'rgba(124, 58, 237, 0.9)',
    letterSpacing: 10,
    marginTop: 18,
    fontWeight: '200',
    fontStyle: 'italic',
    textShadowColor: 'rgba(124, 58, 237, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  tagline: {
    fontSize: FONT_TITLE,
    color: 'rgba(124, 58, 237, 0.65)',
    letterSpacing: 6,
    marginTop: 24,
    fontWeight: '300',
    textShadowColor: 'rgba(124, 58, 237, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
