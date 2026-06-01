import React, { useEffect, useRef, useMemo } from 'react';
import { View, Animated, Dimensions, StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── 星星层次配置 ───────────────────────────────────────────────
const LAYERS = [
  { count: 100, minSize: 0.5, maxSize: 1.2, minOpacity: 0.2, maxOpacity: 0.5, twinkleSpeed: [3000, 6000] },
  { count: 60,  minSize: 1.0, maxSize: 2.0, minOpacity: 0.4, maxOpacity: 0.8, twinkleSpeed: [2000, 4000] },
  { count: 20,  minSize: 2.0, maxSize: 3.5, minOpacity: 0.7, maxOpacity: 1.0, twinkleSpeed: [1500, 3000] },
  { count: 8,   minSize: 4.0, maxSize: 6.0, minOpacity: 0.85, maxOpacity: 1.0, twinkleSpeed: [1000, 2000] },
];

// ─── 星座连线配置 ───────────────────────────────────────────────
const CONSTELLATION_LINE_COLOR = 'rgba(150, 130, 255, 0.15)';

// ─── 接口定义 ──────────────────────────────────────────────────
interface StarProps {
  x: number;
  y: number;
  size: number;
  minOpacity: number;
  maxOpacity: number;
  twinkleSpeed: number[];
  color: string;
  glowColor: string;
}

interface ConstellationLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// ─── 星星颜色生成（带光晕色） ────────────────────────────────────
function getStarColor(): { color: string; glowColor: string } {
  const rand = Math.random();
  if (rand < 0.55) return { color: '#ffffff', glowColor: 'rgba(200, 200, 255, 0.6)' };
  if (rand < 0.70) return { color: '#e8e0ff', glowColor: 'rgba(180, 160, 255, 0.5)' };
  if (rand < 0.82) return { color: '#ffe8d0', glowColor: 'rgba(255, 200, 150, 0.5)' };
  if (rand < 0.92) return { color: '#d0e8ff', glowColor: 'rgba(150, 200, 255, 0.5)' };
  if (rand < 0.97) return { color: '#ffd0d0', glowColor: 'rgba(255, 180, 180, 0.4)' };
  return { color: '#d0ffe0', glowColor: 'rgba(180, 255, 200, 0.4)' };
}

// ─── 亮星星组件（带十字光芒） ────────────────────────────────────
function BrightStar({ x, y, size, minOpacity, maxOpacity, twinkleSpeed, color, glowColor }: StarProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.3)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.delay(Math.random() * 3000),
        Animated.parallel([
          Animated.timing(opacity, { toValue: maxOpacity, duration: 2000, useNativeDriver: true }),
          Animated.spring(scale, { toValue: 1, friction: 2, tension: 20, useNativeDriver: true }),
        ]),
      ]).start(() => {
        const twinkle = () => {
          const d1 = twinkleSpeed[0] + Math.random() * (twinkleSpeed[1] - twinkleSpeed[0]);
          const d2 = twinkleSpeed[0] + Math.random() * (twinkleSpeed[1] - twinkleSpeed[0]);
          Animated.sequence([
            Animated.timing(opacity, { toValue: minOpacity + Math.random() * 0.2, duration: d1, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: maxOpacity, duration: d2, useNativeDriver: true }),
          ]).start(twinkle);
        };
        twinkle();
        Animated.loop(
          Animated.timing(rotateAnim, { toValue: 1, duration: 20000, useNativeDriver: true })
        ).start();
      });
    };
    animate();
  }, []);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const spikeLength = size * 2.5;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x - spikeLength / 2,
        top: y - spikeLength / 2,
        width: spikeLength,
        height: spikeLength,
        opacity,
        transform: [{ scale }, { rotate: rotation }],
      }}
    >
      <View style={{
        position: 'absolute',
        top: '50%',
        left: '10%',
        right: '10%',
        height: 1,
        backgroundColor: color,
        opacity: 0.4,
        shadowColor: glowColor,
        shadowRadius: 4,
        shadowOpacity: 0.8,
      }} />
      <View style={{
        position: 'absolute',
        left: '50%',
        top: '10%',
        bottom: '10%',
        width: 1,
        backgroundColor: color,
        opacity: 0.4,
        shadowColor: glowColor,
        shadowRadius: 4,
        shadowOpacity: 0.8,
      }} />
      <View style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: size,
        height: size,
        borderRadius: size / 2,
        marginTop: -size / 2,
        marginLeft: -size / 2,
        backgroundColor: color,
        shadowColor: glowColor,
        shadowRadius: size * 2,
        shadowOpacity: 1,
      }} />
    </Animated.View>
  );
}

// ─── 普通星星组件 ────────────────────────────────────────────────
function Star({ x, y, size, minOpacity, maxOpacity, twinkleSpeed, color, glowColor }: StarProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.delay(Math.random() * 2000),
        Animated.parallel([
          Animated.timing(opacity, { toValue: maxOpacity, duration: 1500, useNativeDriver: true }),
          Animated.spring(scale, { toValue: 1, friction: 3, tension: 30, useNativeDriver: true }),
        ]),
      ]).start(() => {
        const twinkle = () => {
          const d1 = twinkleSpeed[0] + Math.random() * (twinkleSpeed[1] - twinkleSpeed[0]);
          const d2 = twinkleSpeed[0] + Math.random() * (twinkleSpeed[1] - twinkleSpeed[0]);
          Animated.sequence([
            Animated.timing(opacity, { toValue: minOpacity + Math.random() * (maxOpacity - minOpacity) * 0.5, duration: d1, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: maxOpacity - Math.random() * (maxOpacity - minOpacity) * 0.3, duration: d2, useNativeDriver: true }),
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
          backgroundColor: color,
          shadowColor: glowColor,
          shadowRadius: size * 1.5,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

// ─── 流星组件 ────────────────────────────────────────────────────
function ShootingStar({ delay: initialDelay }: { delay: number }) {
  const translateX = useRef(new Animated.Value(-100)).current;
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const tailWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      const startX = Math.random() * SCREEN_WIDTH * 0.5;
      const startY = Math.random() * SCREEN_HEIGHT * 0.3;
      const distance = 0.4 + Math.random() * 0.4;
      const endX = startX + SCREEN_WIDTH * distance;
      const endY = startY + SCREEN_HEIGHT * distance * 0.6;
      const duration = 600 + Math.random() * 400;

      translateX.setValue(startX);
      translateY.setValue(startY);

      Animated.sequence([
        Animated.delay(initialDelay + Math.random() * 10000),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 50, useNativeDriver: true }),
          Animated.timing(tailWidth, { toValue: 80 + Math.random() * 40, duration: 100, useNativeDriver: false }),
        ]),
        Animated.parallel([
          Animated.timing(translateX, { toValue: endX, duration, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: endY, duration, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(tailWidth, { toValue: 0, duration: 200, useNativeDriver: false }),
        ]),
      ]).start(() => {
        setTimeout(animate, 3000 + Math.random() * 8000);
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
          transform: [{ translateX }, { translateY }, { rotate: '35deg' }],
        },
      ]}
    >
      <View style={styles.shootingStarHead} />
      <Animated.View style={[styles.shootingStarTail, { width: tailWidth }]} />
    </Animated.View>
  );
}

// ─── 星座连线生成 ────────────────────────────────────────────────
function generateConstellations(stars: StarProps[]): ConstellationLine[] {
  if (stars.length < 2) return [];

  const lines: ConstellationLine[] = [];
  const maxDist = 180;
  const used = new Set<number>();
  const groups: StarProps[][] = [];

  for (let i = 0; i < stars.length; i++) {
    if (used.has(i)) continue;
    const group: StarProps[] = [stars[i]];
    used.add(i);

    for (let j = 0; j < stars.length; j++) {
      if (used.has(j)) continue;
      const last = group[group.length - 1];
      const dist = Math.sqrt((last.x - stars[j].x) ** 2 + (last.y - stars[j].y) ** 2);
      if (dist < maxDist && group.length < 4) {
        group.push(stars[j]);
        used.add(j);
      }
    }
    if (group.length >= 2) groups.push(group);
  }

  for (const group of groups) {
    for (let i = 0; i < group.length - 1; i++) {
      lines.push({
        x1: group[i].x,
        y1: group[i].y,
        x2: group[i + 1].x,
        y2: group[i + 1].y,
      });
    }
    if (group.length >= 3 && Math.random() > 0.4) {
      lines.push({
        x1: group[0].x,
        y1: group[0].y,
        x2: group[group.length - 1].x,
        y2: group[group.length - 1].y,
      });
    }
  }

  return lines;
}

// ─── 主组件 ──────────────────────────────────────────────────────
export default function StarfieldBackground() {
  const allStars = useRef<StarProps[]>(
    LAYERS.flatMap(layer =>
      Array.from({ length: layer.count }, () => {
        const { color, glowColor } = getStarColor();
        return {
          x: Math.random() * SCREEN_WIDTH,
          y: Math.random() * SCREEN_HEIGHT,
          size: layer.minSize + Math.random() * (layer.maxSize - layer.minSize),
          minOpacity: layer.minOpacity,
          maxOpacity: layer.maxOpacity,
          twinkleSpeed: layer.twinkleSpeed,
          color,
          glowColor,
        };
      })
    )
  ).current;

  const brightStars = allStars.filter(s => s.size >= 4);
  const normalStars = allStars.filter(s => s.size < 4);
  const constellationLines = useMemo(() => generateConstellations(brightStars), []);

  return (
    <View style={styles.container} pointerEvents="none">
      {/* 星座连线层 */}
      <Svg
        style={StyleSheet.absoluteFill}
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
      >
        {constellationLines.map((line, index) => (
          <Line
            key={`line-${index}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={CONSTELLATION_LINE_COLOR}
            strokeWidth={0.5}
          />
        ))}
      </Svg>

      {/* 普通星星层 */}
      {normalStars.map((star, index) => (
        <Star key={`star-${index}`} {...star} />
      ))}

      {/* 大亮星层（带十字光芒） */}
      {brightStars.map((star, index) => (
        <BrightStar key={`bright-${index}`} {...star} />
      ))}

      {/* 流星层（最顶层） */}
      <ShootingStar delay={2000} />
      <ShootingStar delay={6000} />
      <ShootingStar delay={10000} />
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
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    elevation: 2,
  },
  shootingStar: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  shootingStarHead: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fff',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 6,
  },
  shootingStarTail: {
    height: 1.5,
    backgroundColor: 'rgba(200, 180, 255, 0.6)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    marginLeft: -1,
  },
});
