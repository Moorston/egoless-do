import { FONT_TITLE, FONT_SUB, FONT_BADGE, type Theme } from '@egoless-do/core';
import { ChevronDown } from 'lucide-react-native';
import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';

interface CollapsibleSectionProps {
  title: string;
  icon?: string;
  color?: string;            // accent color for the header
  TH: Theme;
  defaultExpanded?: boolean;
  badge?: string;            // optional badge text (e.g. "3/5")
  children: React.ReactNode;
}

export default function CollapsibleSection({
  title, icon, color = '#f59e0b', TH,
  defaultExpanded = true, badge, children,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const animValue = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;
  const [contentHeight, setContentHeight] = useState(0);
  const heightRef = useRef(0);

  // Always update content height when layout changes
  const onContentLayout = useCallback((e: { nativeEvent: { layout: { height: number } } }) => {
    const h = e.nativeEvent.layout.height;
    if (Math.abs(h - heightRef.current) > 1) {
      heightRef.current = h;
      setContentHeight(h);
    }
  }, []);

  const toggle = useCallback(() => {
    const toValue = expanded ? 0 : 1;
    Animated.spring(animValue, {
      toValue,
      useNativeDriver: false,
      friction: 9,
      tension: 50,
    }).start();
    setExpanded(!expanded);
  }, [expanded, animValue]);

  // Chevron rotation: 0° when collapsed, 180° when expanded
  const chevronRotation = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Content max-height: animated between 0 and contentHeight
  const maxHeight = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, contentHeight || 400],
  });

  // Opacity for child fade-in
  const opacity = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <View style={[styles.container, { backgroundColor: TH.card, borderColor: TH.border }]}>
      {/* Header */}
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.7}
        style={[styles.header, { borderBottomColor: expanded ? `${color}20` : 'transparent' }]}
      >
        <View style={styles.headerLeft}>
          {icon ? <Text style={{ fontSize: 18, marginRight: 8 }}>{icon}</Text> : null}
          <Text style={[styles.title, { color: TH.text }]}>{title}</Text>
          {badge ? (
            <View style={[styles.badge, { backgroundColor: `${color}20` }]}>
              <Text style={[styles.badgeText, { color }]}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
          <ChevronDown size={20} color={TH.sub} />
        </Animated.View>
      </TouchableOpacity>

      {/* Collapsible content */}
      <Animated.View style={[styles.content, { maxHeight, opacity, overflow: 'hidden' }]}>
        <View onLayout={onContentLayout}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: FONT_TITLE(),
    fontWeight: '700',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: FONT_BADGE(),
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
});